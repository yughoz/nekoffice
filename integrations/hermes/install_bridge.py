"""Install only this observer plugin and enable it with Hermes' official CLI."""
import argparse
import json
import os
import shutil
import subprocess
import importlib.util
import getpass
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--home', type=Path, default=Path(os.getenv('HERMES_HOME', str(Path.home()/'.hermes'))), help='Hermes profile home')
parser.add_argument('--server', help='Central server base URL; omit to retain existing configuration')
parser.add_argument('--local-only', action='store_true', help='Clear shared HTTP config and use the local spool')
args = parser.parse_args()
source = Path(__file__).parent/'little-office-bridge'
if args.server and args.local_only:
    parser.error('Choose --server or --local-only.')
spec = importlib.util.spec_from_file_location('office_transport', source/'transport.py')
transport = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transport)
config_path = transport.config_path()
if args.server:
    token = os.getenv('LITTLE_OFFICE_API_TOKEN') or getpass.getpass('Little Office API token (hidden): ')
    client_id = transport.persistent_client_id(config_path.parent)
    transport.HttpTransport(args.server, token, client_id)  # Validate before any configuration changes.
    config_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = config_path.with_suffix('.installing')
    fd = os.open(temporary, os.O_WRONLY|os.O_CREAT|os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump({'serverUrl':args.server.rstrip('/'), 'apiToken':token, 'clientId':client_id}, output)
    os.replace(temporary, config_path)
elif args.local_only and config_path.exists():
    config_path.write_text('{}')
target = args.home.expanduser().resolve()/'plugins/little-office-bridge'
target.mkdir(parents=True, exist_ok=True, mode=0o700)
manifest = target/'plugin.yaml'
if manifest.exists() and 'name: little-office-bridge' not in manifest.read_text():
    raise SystemExit('Refusing to replace a different plugin at '+str(target))
for name in ('__init__.py', 'plugin.yaml', 'transport.py'):
    destination = target/name
    if destination.exists() and destination.read_bytes() != (source/name).read_bytes():
        shutil.copy2(destination, target/(name+'.previous'))
    temporary = target/(name+'.installing')
    shutil.copyfile(source/name, temporary)
    os.replace(temporary, destination)
print(json.dumps({'installed':str(target), 'transport':'http' if args.server else 'existing/local', 'files':['__init__.py','plugin.yaml','transport.py']}), flush=True)
environment = dict(os.environ, HERMES_HOME=str(args.home.expanduser().resolve()))
subprocess.run(['hermes','plugins','enable','little-office-bridge','--no-allow-tool-override'], env=environment, check=True)
