import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('bridge', Path(__file__).parent/'little-office-bridge/__init__.py')
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class BridgeTests(unittest.TestCase):
    def observer(self):
        return bridge.SessionObserver('/profile/default', lambda payload: payload.get('cwd'))

    def test_one_avatar_per_session_with_project_name_and_stable_resume(self):
        observer = self.observer()
        for event in ('pre_llm_call', 'pre_api_request', 'pre_tool_call'):
            observer.observe(event, {'session_id':'one', 'platform':'cli', 'cwd':'/work/video-project', 'tool_name':'terminal'})
        first = observer.snapshot()[0]['agent']
        self.assertEqual(first['name'], 'video-project')
        self.assertEqual(len(observer.snapshot()), 1)
        observer.observe('on_session_end', {'session_id':'one', 'completed':True})
        self.assertFalse(observer.snapshot()[0]['active'])
        observer.observe('pre_llm_call', {'session_id':'one', 'platform':'desktop', 'cwd':'/work/new-project'})
        self.assertEqual(observer.snapshot()[0]['agent']['id'], first['id'])
        self.assertEqual(observer.snapshot()[0]['agent']['name'], 'new-project')
        observer.observe('pre_llm_call', {'session_id':'two', 'cwd':'/work/new-project'})
        self.assertEqual(len(observer.snapshot()), 2)
        self.assertNotEqual(observer.snapshot()[0]['agent']['id'], observer.snapshot()[1]['agent']['id'])

    def test_child_activity_has_its_own_avatar_and_child_finish_does_not_exit_parent(self):
        observer = self.observer()
        observer.observe('pre_llm_call', {'session_id':'parent', 'platform':'telegram', 'cwd':'/work/channel'})
        observer.observe('subagent_start', {'parent_session_id':'parent', 'child_session_id':'child', 'cwd':'/work/other'})
        observer.observe('pre_llm_call', {'session_id':'child', 'parent_session_id':'parent', 'platform':'cli', 'cwd':'/work/other'})
        observer.observe('on_session_end', {'session_id':'child', 'completed':True})
        snapshot = observer.snapshot()
        self.assertEqual(len(snapshot), 2)
        parent = next(row for row in snapshot if row['agent']['parentId'] is None)
        child = next(row for row in snapshot if row['agent']['parentId'] is not None)
        self.assertTrue(parent['active'])
        self.assertEqual(parent['agent']['name'], 'channel')
        self.assertEqual(parent['agent']['role'], 'Hermes · Telegram')
        self.assertEqual(child['agent']['parentId'], parent['agent']['id'])
        self.assertFalse(child['active'])
        self.assertEqual(child['agent']['role'], 'Hermes · Subagent')

    def test_sensitive_payload_fields_never_enter_telemetry(self):
        observer = self.observer()
        observer.observe('pre_llm_call', {'session_id':'s', 'cwd':'/work/project', 'user_message':'PRIVATE_PROMPT', 'conversation_history':['PRIVATE_HISTORY']})
        observer.observe('pre_tool_call', {'session_id':'s', 'tool_name':'terminal', 'args':{'command':'PRIVATE_COMMAND', 'token':'PRIVATE_TOKEN'}})
        with tempfile.TemporaryDirectory() as directory:
            writer = bridge.MetadataWriter(observer, directory)
            writer.write()
            raw = writer.path.read_text()
            self.assertNotIn('PRIVATE_', raw)
            self.assertNotIn('/work/', raw)
            writer.close()
            self.assertEqual(json.loads(writer.path.read_text())['sessions'][0]['agent']['status'], 'done')

    def test_interruption_and_profile_identity(self):
        observer = self.observer()
        observer.observe('pre_llm_call', {'session_id':'s'})
        observer.observe('on_session_end', {'session_id':'s', 'interrupted':True})
        self.assertEqual(observer.snapshot()[0]['agent']['status'], 'done')
        other = bridge.SessionObserver('/profile/other', lambda payload: None)
        other.observe('pre_llm_call', {'session_id':'s'})
        self.assertNotEqual(observer.snapshot()[0]['agent']['id'], other.snapshot()[0]['agent']['id'])

    def test_terminal_desktop_and_telegram_share_the_session_contract(self):
        observer = self.observer()
        for platform in ('cli', 'desktop', 'telegram'):
            observer.observe('pre_llm_call', {'session_id':platform, 'platform':platform, 'cwd':'/work/'+platform})
        self.assertEqual(len(observer.snapshot()), 3)
        self.assertEqual([row['agent']['role'] for row in observer.snapshot()],
                         ['Hermes · Terminal', 'Hermes · Desktop', 'Hermes · Telegram'])


if __name__ == '__main__':
    unittest.main()
