"""Send display-only examples; no agent work is started by this script."""
import argparse
import json
import os
from urllib.request import Request, urlopen

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:5174')
args=parser.parse_args()
headers={'Content-Type':'application/json'}
token=os.getenv('LITTLE_OFFICE_API_TOKEN') or os.getenv('OFFICE_API_TOKEN')
if token:
 headers['Authorization']='Bearer '+token
examples=[
 {'id':'example-lead','name':'Nara','role':'Research lead','team':'research','status':'thinking','task':'Contoh update: meninjau hasil riset'},
 {'id':'example-writer','name':'Sora','role':'Scriptwriter','team':'research','parentId':'example-lead','status':'working','task':'Contoh update: menulis naskah','progress':0.4},
 {'id':'example-artist','name':'Luna','role':'Visual artist','team':'creative','status':'working','task':'Contoh update: membuat gambar adegan'},
]
for agent in examples:
 request=Request(args.url.rstrip('/')+'/api/agents',data=json.dumps(agent).encode(),headers=headers)
 with urlopen(request,timeout=5) as response:
  print(agent['id'],json.load(response))
