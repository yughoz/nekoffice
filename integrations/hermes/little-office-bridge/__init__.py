"""Metadata-only Hermes observer. No prompts, responses, tool arguments or credentials leave Hermes."""
from __future__ import annotations
import atexit
import hashlib
import json
import os
import re
import threading
import time
import uuid
from pathlib import Path, PureWindowsPath

HOOKS = (
    'pre_llm_call', 'pre_api_request', 'on_stream_start', 'pre_tool_call',
    'post_tool_call', 'post_llm_call', 'on_session_end', 'on_session_finalize',
    'on_session_reset', 'subagent_start', 'subagent_stop',
)
SURFACES = {'cli': 'Terminal', 'terminal': 'Terminal', 'tui': 'Desktop/TUI',
            'desktop': 'Desktop', 'web': 'Desktop', 'telegram': 'Telegram', 'acp': 'ACP'}


def project_name(cwd):
    if not isinstance(cwd, str) or not cwd.strip():
        return 'Hermes'
    path = PureWindowsPath(cwd) if '\\' in cwd else Path(cwd)
    return (path.name or 'Hermes')[:48]


def runtime_cwd(payload):
    """Read Hermes' session-scoped cwd; never create a terminal or run a command."""
    for key in ('cwd', 'working_directory', 'workdir'):
        if isinstance(payload.get(key), str) and payload[key].strip():
            return payload[key]
    try:
        from tools.terminal_tool import get_session_cwd
        for key in ('task_id', 'session_id'):
            if payload.get(key):
                cwd = get_session_cwd(str(payload[key]))
                if cwd:
                    return cwd
    except Exception:
        pass
    # An explicit per-command folder is useful before the first cwd record exists.
    args = payload.get('args') or payload.get('tool_input')
    if isinstance(args, dict):
        for key in ('workdir', 'cwd'):
            if isinstance(args.get(key), str) and args[key].strip():
                return args[key]
    # CLI inherits its terminal's cwd. Desktop/gateway roots are not session projects.
    if payload.get('platform') in ('cli', 'terminal'):
        try:
            return os.getcwd()
        except OSError:
            pass
    return None


class SessionObserver:
    def __init__(self, profile, cwd_resolver=runtime_cwd):
        self.profile = str(profile)
        self.cwd_resolver = cwd_resolver
        self.sessions = {}
        self.parents = {}
        self.task_sessions = {}
        self.lock = threading.Lock()

    def _root(self, session):
        seen = set()
        while session in self.parents and session not in seen:
            seen.add(session)
            session = self.parents[session]
        return session

    def _id(self, session):
        return 'hermes-' + hashlib.sha256((self.profile+'\0'+session).encode()).hexdigest()[:24]

    def observe(self, event, payload):
        # Resolve while still on the hook's profile/task context, before the writer thread.
        cwd = self.cwd_resolver(payload)
        now = int(time.time()*1000)
        with self.lock:
            parent = str(payload.get('parent_session_id') or '')
            child = str(payload.get('child_session_id') or '')
            if event == 'subagent_start' and parent and child:
                self.parents[child] = self._root(parent)
                if payload.get('child_subagent_id'):
                    self.parents[str(payload['child_subagent_id'])] = self._root(parent)
            # Hermes also supplies parent_session_id directly on child turn hooks.
            if not event.startswith('subagent_') and parent and payload.get('session_id'):
                self.parents[str(payload['session_id'])] = self._root(parent)
            raw = parent if event.startswith('subagent_') else str(payload.get('session_id') or '')
            if not raw and payload.get('task_id'):
                raw = self.task_sessions.get(str(payload['task_id']), '')
            if not raw:
                return
            root = self._root(raw)
            is_child = raw != root
            if payload.get('task_id'):
                self.task_sessions[str(payload['task_id'])] = root
            if event in ('on_session_finalize', 'on_session_reset'):
                root = self._root(str(payload.get('old_session_id') or root))
            previous = self.sessions.get(root)
            terminal = event in ('post_llm_call', 'on_session_end', 'on_session_finalize', 'on_session_reset')
            # Finishing a child never sends its parent home.
            if terminal and is_child:
                return
            if terminal and not previous:
                return
            platform = str(payload.get('platform') or payload.get('surface') or '')
            if previous and (is_child or event.startswith('subagent_')):
                platform = previous.get('surface', platform)
            if platform == 'gateway' and previous:
                platform = previous.get('surface', platform)
            if not platform and previous:
                platform = previous.get('surface', '')
            surface = SURFACES.get(platform, platform[:24] or 'Hermes')
            status, task = 'working', 'Hermes sedang bekerja'
            if event == 'pre_api_request':
                status, task = 'thinking', 'Menunggu model'
            elif event == 'on_stream_start':
                task = 'Menyusun jawaban'
            elif event == 'pre_tool_call':
                name = re.sub(r'[^a-zA-Z0-9_.:-]', '', str(payload.get('tool_name') or 'tool'))[:80]
                task = 'Menggunakan tool: '+name
            elif event == 'post_tool_call':
                task = 'Melanjutkan pekerjaan'
            elif event == 'subagent_start':
                task = 'Subagent sedang bekerja'
            elif event == 'subagent_stop':
                task = 'Subagent selesai; melanjutkan pekerjaan'
            elif terminal:
                status, task = 'done', 'Pekerjaan selesai'
                if payload.get('failed'):
                    task = 'Session berhenti: pekerjaan gagal'
                elif payload.get('interrupted'):
                    task = 'Session dihentikan'
                elif event in ('on_session_finalize', 'on_session_reset'):
                    task = 'Session tidak aktif'
            # A child can work in a different folder; keep the parent's project identity.
            name = previous['agent']['name'] if previous else 'Hermes'
            if cwd and not is_child and not event.startswith('subagent_'):
                name = project_name(cwd)
            agent = {'id': self._id(root), 'name': name,
                     'role': 'Hermes · '+surface, 'team': 'research',
                     'status': status, 'task': task, 'progress': None}
            self.sessions[root] = {'agent': agent, 'surface': platform,
                                   'active': not terminal, 'updatedAt': now}
            # Bound telemetry memory; prefer recent sessions.
            if len(self.sessions)>128:
                oldest = min(self.sessions, key=lambda k:self.sessions[k]['updatedAt'])
                del self.sessions[oldest]
            if len(self.parents)>2048:
                self.parents.clear()
            if len(self.task_sessions)>2048:
                self.task_sessions.clear()

    def snapshot(self):
        with self.lock:
            return json.loads(json.dumps(list(self.sessions.values())))

    def finish(self):
        with self.lock:
            for value in self.sessions.values():
                if value['active']:
                    value['active'] = False
                    value['updatedAt'] = int(time.time()*1000)
                    value['agent'].update(status='done', task='Session tidak aktif')


class MetadataWriter:
    def __init__(self, observer, directory, transport=None):
        self.observer = observer
        self.directory = Path(directory)
        self.pid = os.getpid()
        self.instance = str(self.pid)+'-'+uuid.uuid4().hex
        self.path = self.directory/(self.instance+'.json')
        self.transport = transport
        self.retry_delay = 1
        self.next_attempt = 0
        self.changed = threading.Event()
        self.stopped = threading.Event()
        self.write_lock = threading.Lock()
        self.thread = threading.Thread(target=self._run, name='little-office-observer', daemon=True)
        self.thread.start()

    def notify(self):
        self.changed.set()

    def write(self):
        sessions = self.observer.snapshot()
        if not sessions:
            return
        record = {'version':1, 'pid':self.pid, 'instance':self.instance,
                  'heartbeatAt':int(time.time()*1000), 'sessions':sessions}
        try:
            with self.write_lock:
                if self.transport:
                    success = self.transport.send(record)
                    self.next_attempt = 0 if success else time.monotonic()+self.retry_delay
                    self.retry_delay = 1 if success else min(30, self.retry_delay*2)
                    return
                self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
                temporary = self.path.with_suffix('.tmp')
                fd = os.open(temporary, os.O_WRONLY|os.O_CREAT|os.O_TRUNC, 0o600)
                with os.fdopen(fd, 'w') as output:
                    json.dump(record, output, ensure_ascii=False)
                os.replace(temporary, self.path)
        except OSError:
            pass  # A viewer outage or unwritable telemetry never blocks Hermes.

    def _run(self):
        while True:
            self.changed.wait(10)
            delay = self.next_attempt-time.monotonic()
            if delay>0 and not self.stopped.is_set():
                self.stopped.wait(delay)
            self.changed.clear()
            self.write()
            if self.stopped.is_set():
                return

    def close(self):
        if self.stopped.is_set():
            return
        self.observer.finish()
        self.stopped.set()
        self.changed.set()
        # The final snapshot is sent by the worker; a network outage never parks the Hermes caller.
        self.thread.join(timeout=.2 if self.transport else .5)


def register(ctx):
    try:
        from hermes_constants import get_hermes_home
        profile = get_hermes_home()
    except ImportError:
        profile = os.getenv('HERMES_HOME', str(Path.home()/'.hermes'))
    observer = SessionObserver(profile)
    # All profiles write sanitized telemetry to one local directory.
    directory = Path(os.getenv('LITTLE_OFFICE_HERMES_SPOOL',
                              str(Path.home()/'.hermes/plugins/little-office-bridge/spool')))
    from .transport import load_transport
    writer = MetadataWriter(observer, directory, transport=load_transport())
    for event in HOOKS:
        def callback(_event=event, **payload):
            try:
                observer.observe(_event, payload)
                writer.notify()
            except Exception:
                pass
            return None  # No permission decisions or changes to agent behavior.
        ctx.register_hook(event, callback)
    if hasattr(ctx, 'on_unload'):
        ctx.on_unload(writer.close)
    atexit.register(writer.close)
