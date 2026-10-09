"""Read Codex rollout lifecycle locally; export only an allowlist of office metadata.

Rollout JSONL is an internal format, tested with Codex 0.160.1. No model calls,
session resumes, transcript writes, or Codex configuration changes are made.
"""
import hashlib
import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

MAX_LINE = 4 * 1024 * 1024
BOOT_TAIL = 4 * 1024 * 1024
LABELS = {
    'Reasoning': ('thinking', 'Menyusun langkah kerja'),
    'CommandExecution': ('working', 'Menjalankan perintah'),
    'FileChange': ('working', 'Mengubah file project'),
    'McpToolCall': ('working', 'Menggunakan tool'),
    'SubAgentActivity': ('working', 'Bekerja bersama subagent'),
    'ContextCompaction': ('thinking', 'Merapikan konteks'),
    'ImageView': ('working', 'Memeriksa gambar'),
    'WebSearch': ('working', 'Membaca referensi'),
    'Extension': ('working', 'Menggunakan tool'),
    'AgentMessage': ('working', 'Menyusun jawaban'),
}
ACTIVITY = {'Reasoning': 'thinking', 'CommandExecution': 'command', 'FileChange': 'edit', 'McpToolCall': 'command', 'SubAgentActivity': 'command', 'ContextCompaction': 'thinking', 'ImageView': 'research', 'WebSearch': 'research', 'Extension': 'command', 'AgentMessage': 'thinking'}


def millis(record, fallback):
    try:
        return int(datetime.fromisoformat(record['timestamp'].replace('Z', '+00:00')).timestamp() * 1000)
    except (KeyError, TypeError, ValueError, OverflowError):
        return fallback


def project_name(cwd):
    # Only the last folder name is sent, never the full path.
    name = str(cwd or '').replace('\\', '/').rstrip('/').rsplit('/', 1)[-1]
    return ''.join(c for c in name if c.isprintable()).strip()[:48] or 'Codex'


@dataclass
class Session:
    id: str = ''
    parent: str = ''
    child: bool = False
    ignored: bool = False
    name: str = 'Codex'
    role: str = 'Codex · Desktop / IDE'
    turn: str = ''
    active: bool = False
    status: str = 'done'
    task: str = 'Giliran selesai'
    activity_code: str = 'generic'
    updated: int = 0
    last_activity: int = 0
    completed_turns: set = field(default_factory=set)

    def consume(self, record, now):
        if not isinstance(record, dict) or not isinstance(record.get('payload'), dict):
            return
        payload, kind = record['payload'], record.get('type')
        stamp = millis(record, now)
        if kind == 'session_meta':
            identity = payload.get('id')
            if not isinstance(identity, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', identity):
                return
            self.id = identity
            source = payload.get('source')
            subagent = source.get('subagent') if isinstance(source, dict) else None
            self.child = isinstance(subagent, dict)
            self.ignored = self.child and subagent.get('other') == 'guardian'
            parent = payload.get('parent_thread_id')
            if not parent and isinstance(subagent, dict):
                spawn = subagent.get('thread_spawn', {})
                parent = spawn.get('parent_thread_id') if isinstance(spawn, dict) else None
            self.parent = parent if isinstance(parent, str) else ''
            self.name = project_name(payload.get('cwd'))
            self.role = 'Codex · Terminal' if source in ('cli', 'exec') else 'Codex · Desktop / IDE'
            return
        if kind == 'turn_context':
            if isinstance(payload.get('cwd'), str):
                self.name = project_name(payload['cwd'])
            return
        if kind != 'event_msg' or not self.id or self.ignored:
            return
        event, turn = payload.get('type'), payload.get('turn_id')
        if not isinstance(turn, str):
            turn = ''
        if event == 'task_started':
            self.turn, self.active = turn, True
            self.status, self.task, self.activity_code = 'thinking', 'Mulai bekerja', 'thinking'
        elif event in ('task_complete', 'turn_aborted'):
            # A late completion from an older turn cannot finish the new turn.
            if turn:
                self.completed_turns.add(turn)
                if len(self.completed_turns) > 256:
                    self.completed_turns = {turn}
            if turn and self.turn and turn != self.turn:
                return
            self.turn, self.active = turn or self.turn, False
            self.status, self.task, self.activity_code = 'done', 'Giliran selesai' if event == 'task_complete' else 'Giliran dihentikan', 'generic'
        elif event in ('item_started', 'item_completed'):
            item = payload.get('item')
            if not isinstance(item, dict) or item.get('type') == 'UserMessage':
                return
            label = LABELS.get(item.get('type'))
            if not label or (turn and turn in self.completed_turns):
                return
            if self.turn and turn and self.turn != turn:
                # Infer an open turn from recent items when its start lies outside
                # the bounded bootstrap tail. Never replay a known completed turn.
                self.turn = turn
            elif turn:
                self.turn = turn
            self.active = True
            self.status, self.task = label
            self.activity_code = ACTIVITY.get(item.get('type'), 'generic')
        elif event in ('exec_approval_request', 'apply_patch_approval_request', 'request_user_input'):
            if not self.active:
                return
            self.status, self.task = 'waiting', 'Menunggu persetujuan atau jawaban'
        else:
            return
        self.updated, self.last_activity = max(self.updated, stamp), max(self.last_activity, stamp)


class Tail:
    """Bounded incremental reader: partial lines, truncation and inode replacement."""
    def __init__(self, path):
        self.path = Path(path)
        self.identity = None
        self.offset = 0
        self.buffer = b''
        self.dropping = False
        self.session = Session()

    def _chunk(self, data, now):
        for part in data.splitlines(keepends=True):
            ends = part.endswith(b'\n')
            if not self.dropping:
                self.buffer += part
                if len(self.buffer) > MAX_LINE:
                    self.buffer, self.dropping = b'', True
            if ends:
                if not self.dropping:
                    try:
                        self.session.consume(json.loads(self.buffer), now)
                    except (ValueError, UnicodeDecodeError):
                        pass
                self.buffer, self.dropping = b'', False

    def poll(self, now):
        stat = self.path.stat()
        identity = (stat.st_dev, stat.st_ino)
        bootstrap = self.identity != identity or stat.st_size < self.offset
        with self.path.open('rb') as stream:
            if bootstrap:
                self.identity, self.session = identity, Session()
                self.buffer, self.dropping = b'', False
                first = stream.readline(MAX_LINE + 1)
                self._chunk(first, now)
                start = max(stream.tell(), stat.st_size - BOOT_TAIL)
                if start > stream.tell():
                    stream.seek(start)
                    self.buffer, self.dropping = b'', True  # Discard the cut first line.
                self.offset = stream.tell()
            stream.seek(self.offset)
            # Limit work per poll even if a large transcript is appended at once.
            for _ in range(32):
                chunk = stream.read(256 * 1024)
                if not chunk:
                    break
                self._chunk(chunk, now)
            self.offset = stream.tell()
        return bootstrap


class Observer:
    def __init__(self, home, now=None, stale_seconds=600, bootstrap_seconds=120):
        self.root = Path(home) / 'sessions'
        self.now = now or (lambda: int(time.time() * 1000))
        self.stale_ms = stale_seconds * 1000
        self.bootstrap_ms = bootstrap_seconds * 1000
        self.tails = {}
        self.visible = {}
        self.next_discovery = 0

    def poll(self):
        now = self.now()
        if now >= self.next_discovery:
            self.next_discovery = now + 3000
            # mtime also finds old threads resumed today. Do not parse old history.
            try:
                candidates = [(p.stat().st_mtime, p) for p in self.root.rglob('rollout-*.jsonl')]
            except OSError:
                candidates = []
            for mtime, path in sorted(candidates, reverse=True)[:256]:
                if now - mtime * 1000 < max(self.stale_ms, self.bootstrap_ms):
                    self.tails.setdefault(path, Tail(path))
        sessions = {}
        for path, tail in list(self.tails.items()):
            try:
                bootstrap = tail.poll(now)
            except OSError:
                del self.tails[path]
                continue
            session = tail.session
            if bootstrap and now - session.last_activity > self.bootstrap_ms:
                session.active = False
            if session.active and now - session.last_activity > self.stale_ms:
                session.active, session.status, session.task, session.activity_code = False, 'done', 'Session tidak aktif', 'generic'
                session.updated = now
            if session.id:
                sessions[session.id] = session
            activity = session.last_activity or int(path.stat().st_mtime * 1000)
            if not session.active and now - activity > max(self.stale_ms, 120_000):
                del self.tails[path]
        children = {}
        for session in sessions.values():
            if not session.child or session.ignored or not session.active:
                continue
            parent, visited = session.parent, {session.id}
            while parent in sessions and sessions[parent].child and parent not in visited:
                visited.add(parent)
                parent = sessions[parent].parent
            if parent in sessions and not sessions[parent].child:
                children.setdefault(parent, []).append(session)
        present = set()
        for identity, root in sessions.items():
            if root.child or root.ignored:
                continue  # Orphan subagents and approval guardians never become people.
            workers = children.get(identity, [])
            active = root.active or bool(workers)
            if not active and identity not in self.visible:
                continue  # Completed sessions at startup never enter the office.
            latest = max(([root] if root.active else []) + workers, key=lambda s: s.updated) if active else root
            status, task = (latest.status, latest.task) if active else ('done', root.task)
            if workers and latest is not root:
                task = 'Subagent: ' + task
            row = {'agent': {'id': 'codex-' + hashlib.sha256(identity.encode()).hexdigest()[:24],
                             'name': root.name, 'role': root.role, 'team': 'production',
                             'status': status, 'task': task, 'parentId': None, 'progress': None,
                             'projectName': root.name, 'projectKey': hashlib.sha256((root.name+'\0'+identity).encode()).hexdigest()[:16],
                             'activityCode': latest.activity_code, 'provider': 'codex'},
                   'active': active, 'updatedAt': latest.updated}
            previous = self.visible.get(identity)
            if previous:
                row['updatedAt'] = max(row['updatedAt'], previous['row']['updatedAt'])
            # Deadline changes have their own timestamp; ordinary heartbeats do not.
            if previous and previous['row']['active'] != active:
                row['updatedAt'] = max(row['updatedAt'], now)
            inactive = None if active else (previous['inactive'] if previous and previous['inactive'] is not None else now)
            self.visible[identity] = {'row': row, 'inactive': inactive}
            present.add(identity)
        for identity, entry in list(self.visible.items()):
            if identity not in present and entry['row']['active']:
                entry['row']['active'] = False
                entry['row']['agent'].update(status='done', task='Session tidak aktif', activityCode='generic')
                entry['row']['updatedAt'], entry['inactive'] = now, now
            if entry['inactive'] is not None and now - entry['inactive'] >= 90_000:
                del self.visible[identity]
        rows = [entry['row'] for entry in self.visible.values()]
        return sorted(rows, key=lambda row: (not row['active'], -row['updatedAt']))[:64]
