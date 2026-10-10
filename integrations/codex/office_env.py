"""Small, dependency-free dotenv reader for the local office client."""
import os
from pathlib import Path


def load_dotenv(path):
    path = Path(path).expanduser()
    if not path.exists():
        return {}
    if path.stat().st_size > 16384:
        raise ValueError('Office .env file is too large.')
    values = {}
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('export '):
            line = line[7:].lstrip()
        key, separator, value = line.partition('=')
        if not separator or not key or not key.replace('_', '').isalnum():
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        values[key] = value
    return values


def office_env(path):
    values = load_dotenv(path)
    for key in ('LITTLE_OFFICE_URL', 'LITTLE_OFFICE_API_TOKEN', 'LITTLE_OFFICE_CLIENT_ID',
                'LITTLE_OFFICE_MACHINE_LABEL', 'LITTLE_OFFICE_MACHINE_LABEL_MODE',
                'LITTLE_OFFICE_NAME_MODE', 'LITTLE_OFFICE_NAME_SALT'):
        if key in os.environ:
            values[key] = os.environ[key]
    return values
