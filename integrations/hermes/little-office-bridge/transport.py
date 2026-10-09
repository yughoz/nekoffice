"""Authenticated outbound snapshots. Network work runs only on the observer's worker thread."""
import json
import os
import re
import uuid
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward the API token to a redirected destination.


class HttpTransport:
    def __init__(self, server_url, token, client_id, timeout=3):
        parsed = urlsplit(server_url)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('Set a plain HTTP(S) server URL without credentials, query or fragment.')
        if not isinstance(token, str) or len(token)<32 or '\n' in token or '\r' in token:
            raise ValueError('Set a Little Office API token of at least 32 characters.')
        if not isinstance(client_id, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', client_id):
            raise ValueError('Invalid Little Office client ID.')
        self.url = server_url.rstrip('/')+'/api/hermes/heartbeat'
        self.token, self.client_id, self.timeout = token, client_id, timeout
        self.machine_label = os.getenv('LITTLE_OFFICE_MACHINE_LABEL', '')
        self.bridge_version = 'hermes-bridge/1.1'
        self.sequence = 0
        self.opener = build_opener(NoRedirect())

    def send(self, record):
        self.sequence += 1
        payload = {'version':1, 'clientId':self.client_id, 'producerId':record['instance'],
                   'sequence':self.sequence, 'sessions':record['sessions'],
                   'machineLabel': self.machine_label, 'bridgeVersion': self.bridge_version}
        request = Request(self.url, data=json.dumps(payload, ensure_ascii=False).encode(),
                          headers={'Content-Type':'application/json', 'Authorization':'Bearer '+self.token}, method='POST')
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                return response.status == 200 and json.loads(response.read(4096)).get('ok') is True
        except Exception:
            return False  # Credentials and errors are never printed; retry the latest snapshot.


def config_path():
    return Path(os.getenv('LITTLE_OFFICE_CLIENT_CONFIG', str(Path.home()/'.hermes/plugins/little-office-bridge/client.json')))


def persistent_client_id(directory):
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = directory/'client-id'
    try:
        with path.open('x') as output:
            os.chmod(path, 0o600)
            output.write(uuid.uuid4().hex)
    except FileExistsError:
        pass
    return path.read_text().strip()


def load_transport():
    path = config_path()
    config = {}
    if path.exists():
        if path.stat().st_size>16384:
            raise ValueError('Little Office client config is too large.')
        config = json.loads(path.read_text())
        if not isinstance(config, dict):
            raise ValueError('Little Office client config must be an object.')
    url = os.getenv('LITTLE_OFFICE_URL', config.get('serverUrl', ''))
    if not url:
        return None
    token = os.getenv('LITTLE_OFFICE_API_TOKEN', config.get('apiToken', ''))
    client_id = os.getenv('LITTLE_OFFICE_CLIENT_ID', config.get('clientId', '')) or persistent_client_id(path.parent)
    return HttpTransport(url, token, client_id)
