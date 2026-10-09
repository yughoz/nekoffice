#!/usr/bin/env python3
"""Keep a local Hermes parent plus subagent fixture visible in Nekoffice dev mode."""
import argparse
import json
import os
import time
from urllib.request import Request, urlopen


def packet(sequence, count):
    parent = 'hermes-' + 'a' * 24
    sessions = [{'agent': {'id': parent, 'name': 'hermes-project', 'role': 'Hermes · Desktop',
                           'team': 'research', 'status': 'working', 'task': 'Main Hermes session',
                           'activityCode': 'thinking'}, 'active': True, 'updatedAt': sequence}]
    for index in range(count):
        child = 'hermes-' + format(index + 1, '024x')
        sessions.append({'agent': {'id': child, 'name': f'hermes-project · subagent {index + 1}',
                                   'role': 'Hermes · Subagent', 'team': 'research', 'status': 'working',
                                   'task': 'Membaca referensi' if index % 2 else 'Menjalankan tes',
                                   'activityCode': 'research' if index % 2 else 'test', 'parentId': parent},
                         'active': True, 'updatedAt': sequence})
    return {'version': 1, 'clientId': 'local-hermes-machine', 'producerId': 'local-v04-hermes',
            'sequence': sequence, 'sessions': sessions}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server', default=os.getenv('OFFICE_LOCAL_URL', 'http://127.0.0.1:5174'))
    parser.add_argument('--token', default=os.getenv('OFFICE_LOCAL_API_TOKEN', ''))
    parser.add_argument('--subagents', type=int, default=5)
    parser.add_argument('--interval', type=float, default=10)
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    if not args.token or len(args.token) < 32:
        parser.error('Set OFFICE_LOCAL_API_TOKEN or --token to the local test token.')
    if not 1 <= args.subagents <= 7:
        parser.error('--subagents must be between 1 and 7.')
    sequence = int(time.time())
    while True:
        request = Request(args.server.rstrip('/') + '/api/hermes/heartbeat',
                          data=json.dumps(packet(sequence, args.subagents)).encode(), method='POST',
                          headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + args.token})
        with urlopen(request, timeout=3) as response:
            if response.status != 200:
                raise RuntimeError('Local office rejected the Hermes fixture heartbeat.')
        if args.once:
            return
        sequence += 1
        time.sleep(args.interval)


if __name__ == '__main__':
    main()
