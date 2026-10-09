import json
import os
import tempfile
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path

from observer import Observer, Tail


class ObserverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        self.directory = self.home / 'sessions/2026/10/09'
        self.directory.mkdir(parents=True)
        self.now = int(time.time() * 1000)
        self.observer = Observer(self.home, now=lambda: self.now)

    def tearDown(self):
        self.temp.cleanup()

    def append(self, path, kind, payload, stamp=None):
        record = {'timestamp': datetime.fromtimestamp((stamp or self.now) / 1000, timezone.utc).isoformat(),
                  'type': kind, 'payload': payload}
        with path.open('ab') as f:
            f.write((json.dumps(record) + '\n').encode())
        os.utime(path, (self.now / 1000, self.now / 1000))

    def session(self, identity='root', parent=None, guardian=False):
        path = self.directory / ('rollout-' + identity + '.jsonl')
        payload = {'id': identity, 'cwd': '/private/projects/my-project', 'source': 'vscode',
                   'base_instructions': {'text': 'SECRET-INSTRUCTIONS'}}
        if parent:
            payload.update(parent_thread_id=parent, source={'subagent': {'other': 'guardian'} if guardian else {'thread_spawn': {'parent_thread_id': parent}}})
        self.append(path, 'session_meta', payload)
        return path

    def event(self, path, kind, turn='turn-a', **values):
        self.append(path, 'event_msg', {'type': kind, 'turn_id': turn, **values})

    def test_real_lifecycle_privacy_and_resume_keep_one_identity(self):
        path = self.session()
        self.event(path, 'task_started')
        self.event(path, 'item_completed', item={'type': 'CommandExecution', 'command': 'SECRET-COMMAND', 'stdout': 'SECRET-RESULT'})
        row = self.observer.poll()[0]
        self.assertTrue(row['active'])
        self.assertEqual(row['agent']['name'], 'my-project')
        self.assertEqual(row['agent']['task'], 'Menjalankan perintah')
        self.assertNotIn('SECRET', json.dumps(row))
        self.assertNotIn('/private', json.dumps(row))
        identity = row['agent']['id']
        self.now += 1000
        self.event(path, 'task_complete', last_agent_message='SECRET-FINAL')
        finished = self.observer.poll()[0]
        self.assertFalse(finished['active'])
        self.assertEqual(finished['agent']['status'], 'done')
        self.assertEqual(self.observer.poll(), [finished])
        self.now += 1000
        self.event(path, 'task_started', turn='turn-b')
        self.event(path, 'task_complete', turn='turn-a')
        resumed = self.observer.poll()[0]
        self.assertTrue(resumed['active'])
        self.assertEqual(identity, resumed['agent']['id'])

    def test_bootstrap_never_replays_completed_or_stale_history(self):
        finished = self.session('finished')
        self.event(finished, 'task_started')
        self.event(finished, 'task_complete')
        old = self.session('old')
        self.append(old, 'event_msg', {'type': 'task_started', 'turn_id': 'old'}, self.now - 180_000)
        self.assertEqual(self.observer.poll(), [])
        self.event(old, 'item_completed', turn='old', item={'type': 'Reasoning'})
        rows = self.observer.poll()
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0]['active'])

    def test_partial_utf8_and_file_truncation(self):
        path = self.session()
        self.observer.poll()
        data = (json.dumps({'type': 'event_msg', 'payload': {'type': 'task_started', 'turn_id': 'a', 'unused': '你好'},
                            'timestamp': datetime.fromtimestamp(self.now / 1000, timezone.utc).isoformat()}, ensure_ascii=False) + '\n').encode()
        cut = data.index('好'.encode()) + 1
        with path.open('ab') as f:
            f.write(data[:cut])
        self.assertEqual(self.observer.poll(), [])
        with path.open('ab') as f:
            f.write(data[cut:])
        self.assertTrue(self.observer.poll()[0]['active'])
        path.write_text('')
        self.session()
        self.event(path, 'task_complete', turn='a')
        self.assertFalse(self.observer.poll()[0]['active'])

    def test_children_stand_beside_parent_and_guardians_never_spawn_people(self):
        root = self.session()
        self.event(root, 'task_started')
        child = self.session('child', parent='root')
        self.event(child, 'task_started')
        guardian = self.session('guardian', parent='root', guardian=True)
        self.event(guardian, 'task_started')
        rows = self.observer.poll()
        self.assertEqual(len(rows), 2)
        parent_row = next(row for row in rows if row['agent']['parentId'] is None)
        child_row = next(row for row in rows if row['agent']['parentId'] is not None)
        self.assertEqual(child_row['agent']['parentId'], parent_row['agent']['id'])
        self.assertEqual(child_row['agent']['role'], 'Codex · Subagent')
        self.now += 1000
        self.event(root, 'task_complete')
        rows = self.observer.poll()
        parent_row = next(row for row in rows if row['agent']['parentId'] is None)
        child_row = next(row for row in rows if row['agent']['parentId'] is not None)
        self.assertEqual(len(rows), 2)
        self.assertTrue(parent_row['active'])
        self.assertEqual(parent_row['agent']['task'], 'Mendampingi subagent')
        self.assertTrue(child_row['active'])
        self.event(child, 'task_complete')
        rows = self.observer.poll()
        self.assertEqual(len(rows), 2)
        self.assertFalse(next(row for row in rows if row['agent']['parentId'] is not None)['active'])
        self.assertFalse(next(row for row in rows if row['agent']['parentId'] is None)['active'])

    def test_crash_timeout_and_pruning_do_not_refresh_completion(self):
        path = self.session()
        self.event(path, 'task_started')
        self.observer.poll()
        self.now += 601_000
        row = self.observer.poll()[0]
        self.assertFalse(row['active'])
        self.assertEqual(self.observer.poll(), [row])
        self.now += 91_000
        self.assertEqual(self.observer.poll(), [])

    def test_bounded_tail_infers_current_turn_without_scanning_whole_transcript(self):
        path = self.session()
        self.event(path, 'task_started')
        with path.open('ab') as f:
            f.write(b' ' * (5 * 1024 * 1024) + b'\n')
        self.event(path, 'item_completed', item={'type': 'FileChange'})
        self.assertEqual(self.observer.poll()[0]['agent']['task'], 'Mengubah file project')
        tail = self.observer.tails[path]
        self.assertLessEqual(len(tail.buffer), 4 * 1024 * 1024)
        self.assertEqual(tail.offset, path.stat().st_size)


if __name__ == '__main__':
    unittest.main()
