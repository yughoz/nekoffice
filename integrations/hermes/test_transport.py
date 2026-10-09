import importlib.util
import json
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('transport',Path(__file__).parent/'little-office-bridge/transport.py')
transport=importlib.util.module_from_spec(spec)
spec.loader.exec_module(transport)
observer_spec=importlib.util.spec_from_file_location('bridge',Path(__file__).parent/'little-office-bridge/__init__.py')
bridge=importlib.util.module_from_spec(observer_spec)
observer_spec.loader.exec_module(bridge)


class TransportTests(unittest.TestCase):
    def test_http_contract_and_retry_without_sending_credentials_in_payload(self):
        received=[]
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                received.append((self.path,self.headers.get('Authorization'),json.loads(self.rfile.read(int(self.headers['Content-Length'])))))
                data=b'{"ok":true}'
                self.send_response(200)
                self.send_header('Content-Length',str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            def log_message(self,*args):
                pass
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        client=transport.HttpTransport('http://127.0.0.1:'+str(server.server_port),'a'*64,'machine')
        try:
            record={'instance':'producer','sessions':[{'agent':{'name':'project'},'active':True}], 'pid':123}
            self.assertTrue(client.send(record))
            self.assertTrue(client.send(record))
            self.assertEqual(received[0][0],'/api/hermes/heartbeat')
            self.assertEqual(received[0][1],'Bearer '+'a'*64)
            self.assertNotIn('apiToken',received[0][2])
            self.assertEqual(received[1][2]['sequence'],2)
        finally:
            server.shutdown()
            server.server_close()
        self.assertFalse(client.send(record))

    def test_identity_is_persistent_and_config_env_overrides(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            first=transport.persistent_client_id(root)
            self.assertEqual(first,transport.persistent_client_id(root))
            config=root/'client.json'
            config.write_text(json.dumps({'serverUrl':'https://office.example','apiToken':'a'*64,'clientId':first}))
            with patch.dict('os.environ',{'LITTLE_OFFICE_CLIENT_CONFIG':str(config),'LITTLE_OFFICE_URL':'https://other.example','LITTLE_OFFICE_API_TOKEN':'b'*64},clear=True):
                client=transport.load_transport()
                self.assertEqual(client.url,'https://other.example/api/hermes/heartbeat')
                self.assertEqual(client.token,'b'*64)

    def test_dotenv_supplies_server_and_token(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            env_file=root/'.env'
            env_file.write_text('LITTLE_OFFICE_URL=https://dotenv.example\nLITTLE_OFFICE_API_TOKEN=' + 'c'*64 + '\n')
            config=root/'client.json'
            config.write_text(json.dumps({'clientId':'dotenv-client'}))
            with patch.dict('os.environ', {'LITTLE_OFFICE_CLIENT_CONFIG':str(config), 'LITTLE_OFFICE_ENV_FILE':str(env_file)}, clear=True):
                client=transport.load_transport()
                self.assertEqual(client.url,'https://dotenv.example/api/hermes/heartbeat')
                self.assertEqual(client.token,'c'*64)

    def test_worker_close_is_bounded_during_network_outage_and_does_not_write_local_duplicates(self):
        class Slow:
            def send(self,record):
                time.sleep(.5)
                return False
        with tempfile.TemporaryDirectory() as directory:
            observer=bridge.SessionObserver('/profile',lambda payload:None)
            observer.observe('pre_llm_call',{'session_id':'s'})
            writer=bridge.MetadataWriter(observer,directory,transport=Slow())
            writer.notify()
            started=time.monotonic()
            writer.close()
            self.assertLess(time.monotonic()-started,.35)
            writer.thread.join(timeout=2)
            self.assertFalse(writer.path.exists())

    def test_invalid_urls_and_redirects_do_not_forward_credentials(self):
        for url in ('ftp://example.com','https://user:pass@example.com','https://example.com?token=x'):
            with self.assertRaises(ValueError):
                transport.HttpTransport(url,'a'*64,'machine')
        self.assertIsNone(transport.NoRedirect().redirect_request(None,None,302,'',{},'https://other.example'))


if __name__=='__main__':
    unittest.main()
