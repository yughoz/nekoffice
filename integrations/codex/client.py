"""Standalone outbound Codex office client. Python standard library only."""
import argparse
import fcntl
import json
import os
import re
import signal
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPRedirectHandler

from observer import Observer
from office_env import office_env


def default_home():
    return Path(os.getenv('CODEX_HOME', str(Path.home() / '.codex')))


def save_private(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_name(path.name + '.tmp-' + uuid.uuid4().hex)
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, 'w') as output:
            json.dump(value, output, ensure_ascii=False)
            output.write('\n')
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Transport:
    def __init__(self, config):
        url, token, identity = (config.get(k, '') for k in ('serverUrl', 'apiToken', 'clientId'))
        if not isinstance(url, str):
            raise ValueError('Invalid server URL.')
        parsed = urlsplit(url)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('Set a plain HTTP(S) server URL.')
        if not isinstance(token, str) or len(token) < 32 or '\n' in token or '\r' in token:
            raise ValueError('Set an API token of at least 32 characters.')
        if not isinstance(identity, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', identity):
            raise ValueError('Invalid client ID.')
        self.url, self.token, self.identity = url.rstrip('/') + '/api/codex/heartbeat', token, identity
        self.machine_label = str(config.get('machineLabel') or '')
        self.machine_label_mode = str(config.get('LITTLE_OFFICE_MACHINE_LABEL_MODE') or config.get('machineLabelMode') or 'hidden').strip().lower()
        self.bridge_version = str(config.get('bridgeVersion') or 'codex-observer/0.2')
        self.sequence, self.producer = 0, uuid.uuid4().hex
        self.opener = build_opener(NoRedirect())

    def send(self, sessions):
        self.sequence += 1
        body = {'version': 1, 'clientId': self.identity, 'producerId': self.producer,
                'sequence': self.sequence, 'sessions': sessions,
                'machineLabel': self.machine_label if self.machine_label_mode == 'show' else '',
                'machineLabelMode': 'show' if self.machine_label_mode == 'show' else 'hidden',
                'bridgeVersion': self.bridge_version}
        data = json.dumps(body, ensure_ascii=False).encode()
        if len(data) > 65536:
            return False
        request = Request(self.url, data=data, method='POST',
                          headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.token})
        try:
            with self.opener.open(request, timeout=3) as response:
                return response.status == 200 and json.loads(response.read(4096)).get('ok') is True
        except HTTPError as error:
            error.close()
            return False
        except Exception:
            return False


def load_config(path):
    path = Path(path)
    if path.stat().st_size > 16384:
        raise ValueError('Client config is too large.')
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError('Expected a config object.')
    return value


def run(args):
    directory = args.config.parent
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    # One observer per Codex home. Prevent duplicate leases from a service + manual run.
    with (directory / 'client.lock').open('a') as lock:
        os.chmod(lock.name, 0o600)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('The Codex office client is already running.')
        config = load_config(args.config)
        values = office_env(args.env_file or os.getenv('LITTLE_OFFICE_ENV_FILE') or config.get('envFile') or args.config.parent / '.env')
        config['serverUrl'] = values.get('LITTLE_OFFICE_URL', config.get('serverUrl', ''))
        config['apiToken'] = values.get('LITTLE_OFFICE_API_TOKEN', config.get('apiToken', ''))
        config['clientId'] = values.get('LITTLE_OFFICE_CLIENT_ID', config.get('clientId', ''))
        config['machineLabel'] = values.get('LITTLE_OFFICE_MACHINE_LABEL', config.get('machineLabel', ''))
        config['machineLabelMode'] = values.get('LITTLE_OFFICE_MACHINE_LABEL_MODE', config.get('machineLabelMode', 'hidden'))
        config['nameMode'] = values.get('LITTLE_OFFICE_NAME_MODE', config.get('nameMode', 'alias'))
        transport = Transport(config)
        observer_settings = dict(config)
        observer_settings.update(values)
        observer = Observer(args.home, stale_seconds=args.stale_seconds, settings=observer_settings)
        running = True

        def stop(signum, frame):
            nonlocal running
            running = False

        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        delivered, next_send, failures, last_success = None, 0, 0, 0
        state = directory / 'status.json'
        while running:
            rows = observer.poll()
            fingerprint = json.dumps(rows, sort_keys=True)
            now = time.monotonic()
            changed = fingerprint != delivered
            if now >= next_send or (changed and failures == 0):
                accepted = transport.send(rows)
                if accepted:
                    delivered, failures, last_success = fingerprint, 0, int(time.time() * 1000)
                    next_send = now + 10
                else:
                    failures += 1
                    next_send = now + min(30, 2 ** min(failures - 1, 5))
                save_private(state, {'pid': os.getpid(), 'running': True, 'connected': accepted,
                                     'lastSuccessAt': last_success, 'activeSessions': sum(r['active'] for r in rows),
                                     'updatedAt': int(time.time() * 1000)})
            time.sleep(1)
        # Removing this producer's rows sends its people home; no fake completion events.
        transport.send([])
        save_private(state, {'pid': os.getpid(), 'running': False, 'connected': False,
                             'lastSuccessAt': last_success, 'activeSessions': 0, 'updatedAt': int(time.time() * 1000)})


def main():
    parser = argparse.ArgumentParser(description='Show local Codex Desktop / CLI activity in Nekoffice.')
    parser.add_argument('command', choices=('run', 'status'), nargs='?', default='run')
    parser.add_argument('--home', type=Path, default=default_home())
    parser.add_argument('--config', type=Path)
    parser.add_argument('--env-file', type=Path, help='Optional dotenv file with LITTLE_OFFICE_URL and LITTLE_OFFICE_API_TOKEN.')
    parser.add_argument('--stale-seconds', type=int, default=600)
    args = parser.parse_args()
    args.config = args.config or args.home / 'nekoffice' / 'client.json'
    if args.command == 'status':
        try:
            status = load_config(args.config.parent / 'status.json')
            try:
                os.kill(status.get('pid', 0), 0)
            except (OSError, TypeError):
                status['running'] = False
            status['connected'] = bool(status.get('running') and status.get('connected') and time.time() * 1000 - status.get('lastSuccessAt', 0) < 35000)
            print(json.dumps(status))
        except (OSError, ValueError):
            print(json.dumps({'running': False, 'connected': False, 'activeSessions': 0}))
        return
    if args.stale_seconds < 35:
        parser.error('--stale-seconds must be at least 35.')
    try:
        run(args)
    except (OSError, ValueError):
        # Never log credentials, rollout records, or exceptions containing paths/payloads.
        parser.exit(1, 'Codex office client could not start. Check config, permissions, and whether it is already running.\n')


if __name__ == '__main__':
    main()
