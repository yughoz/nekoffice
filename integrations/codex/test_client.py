import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from client import Transport


class TransportTests(unittest.TestCase):
    def setUp(self):
        self.received = []
        received = self.received

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                received.append((self.path, self.headers.get('Authorization'), data))
                if self.path.startswith('/redirect'):
                    self.send_response(307)
                    self.send_header('Location', '/api/codex/heartbeat')
                else:
                    self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"ok":true}')

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = 'http://127.0.0.1:' + str(self.server.server_port)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def transport(self, url=None):
        return Transport({'serverUrl': url or self.url, 'apiToken': 'a' * 64, 'clientId': 'machine'})

    def test_authenticated_snapshot_has_stable_producer_and_increasing_sequence(self):
        transport = self.transport()
        self.assertTrue(transport.send([]))
        self.assertTrue(transport.send([]))
        path, auth, first = self.received[0]
        self.assertEqual(path, '/api/codex/heartbeat')
        self.assertEqual(auth, 'Bearer ' + 'a' * 64)
        self.assertEqual(first['version'], 1)
        self.assertEqual(first['producerId'], self.received[1][2]['producerId'])
        self.assertEqual(self.received[1][2]['sequence'], 2)

    def test_redirect_does_not_forward_api_token(self):
        self.assertFalse(self.transport(self.url + '/redirect').send([]))
        self.assertEqual(len(self.received), 1)

    def test_rejects_credentials_in_url_and_invalid_token(self):
        with self.assertRaises(ValueError):
            self.transport('http://user:password@127.0.0.1/')
        with self.assertRaises(ValueError):
            Transport({'serverUrl': self.url, 'apiToken': 'a' * 64 + '\n', 'clientId': 'machine'})


if __name__ == '__main__':
    unittest.main()
