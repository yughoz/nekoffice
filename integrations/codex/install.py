"""Install the observer without changing Codex itself. Optional macOS login service."""
import argparse
import getpass
import json
import os
import plistlib
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

from client import Transport, default_home, load_config, save_private

LABEL = 'xyz.nekoding.office.codex'


def main():
    parser = argparse.ArgumentParser(description='Install the local Codex client for Nekoffice.')
    parser.add_argument('--home', type=Path, default=default_home())
    parser.add_argument('--server')
    parser.add_argument('--from-hermes-config', action='store_true', help='Reuse the local Hermes office URL and API token.')
    parser.add_argument('--autostart', action='store_true', help='Start now and at login on macOS using launchd.')
    parser.add_argument('--stale-seconds', type=int, default=600)
    args = parser.parse_args()
    if args.autostart and sys.platform != 'darwin':
        parser.error('--autostart currently supports macOS. Run client.py manually on Linux.')
    if args.stale_seconds < 35:
        parser.error('--stale-seconds must be at least 35.')
    directory = args.home.resolve() / 'nekoffice'
    config_path = directory / 'client.json'
    config = load_config(config_path) if config_path.exists() else {}
    if args.from_hermes_config:
        hermes = load_config(Path.home() / '.hermes/plugins/little-office-bridge/client.json')
        config.update({k: hermes.get(k, '') for k in ('serverUrl', 'apiToken')})
    config['serverUrl'] = args.server or config.get('serverUrl', '')
    config['apiToken'] = os.getenv('LITTLE_OFFICE_API_TOKEN') or config.get('apiToken') or getpass.getpass('Office API token: ')
    config['clientId'] = config.get('clientId') or uuid.uuid4().hex
    Transport(config)  # Validate before mutating the installation.
    if args.autostart:
        subprocess.run(['launchctl', 'bootout', 'gui/' + str(os.getuid()) + '/' + LABEL], capture_output=True)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    for name in ('client.py', 'observer.py'):
        source, target = Path(__file__).parent / name, directory / name
        if source.resolve() != target.resolve():
            shutil.copyfile(source, target)
        target.chmod(0o600)
    save_private(config_path, config)
    if args.autostart:
        service = Path.home() / 'Library/LaunchAgents' / (LABEL + '.plist')
        service.parent.mkdir(parents=True, exist_ok=True)
        plist = {'Label': LABEL, 'ProgramArguments': [sys.executable, str(directory / 'client.py'), 'run',
                 '--home', str(args.home.resolve()), '--config', str(config_path), '--stale-seconds', str(args.stale_seconds)],
                 'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 10,
                 'StandardOutPath': str(directory / 'service.log'), 'StandardErrorPath': str(directory / 'service.log')}
        with service.open('wb') as output:
            plistlib.dump(plist, output)
        service.chmod(0o600)
        subprocess.run(['launchctl', 'bootstrap', 'gui/' + str(os.getuid()), str(service)], check=True)
        print('Codex office client installed and started; starts automatically at login.')
    else:
        print('Codex office client installed. Run: python3 ' + str(directory / 'client.py') + ' run')


if __name__ == '__main__':
    main()
