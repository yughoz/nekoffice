import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

export type DeviceProvider='both'|'hermes'|'codex';
export interface DeviceTokenInfo {id:string;label:string;provider:DeviceProvider;officeId:string;createdAt:number;revokedAt?:number;}
type StoredToken=DeviceTokenInfo & {hash:string};

function hash(value:string){return createHash('sha256').update(value).digest('hex');}
function provider(value:unknown):DeviceProvider {return value==='hermes'||value==='codex'||value==='both'?value:'both';}

/** Persistent per-device bearer tokens. The plaintext token is returned only at creation. */
export class DeviceTokenStore {
 private tokens=new Map<string,StoredToken>();
 constructor(private path?:string){this.load();}
 private load(){
  if(!this.path||!existsSync(this.path))return;
  try{const rows=JSON.parse(readFileSync(this.path,'utf8')) as unknown;if(!Array.isArray(rows))return;for(const row of rows){if(row&&typeof row==='object'&&typeof (row as any).id==='string'&&typeof (row as any).hash==='string')this.tokens.set((row as any).id,{id:(row as any).id,hash:(row as any).hash,label:typeof (row as any).label==='string'?(row as any).label:'Device',provider:provider((row as any).provider),officeId:typeof (row as any).officeId==='string'?(row as any).officeId:'default',createdAt:Number((row as any).createdAt)||Date.now(),revokedAt:typeof (row as any).revokedAt==='number'?(row as any).revokedAt:undefined});}}
  catch{/* A malformed optional registry must not prevent the office from starting. */}
 }
 private save(){if(!this.path)return;mkdirSync(dirname(this.path),{recursive:true});writeFileSync(this.path,JSON.stringify([...this.tokens.values()]),{mode:0o600});}
 create(label:string,kind:DeviceProvider= 'both',officeId='default'){
  const token=randomBytes(32).toString('hex'),info:DeviceTokenInfo={id:randomUUID(),label:label.trim().slice(0,48)||'Device',provider:kind,officeId,createdAt:Date.now()};
  this.tokens.set(info.id,{...info,hash:hash(token)});this.save();return {info,token};
 }
 find(token:string){const digest=hash(token);for(const row of this.tokens.values())if(!row.revokedAt&&row.hash===digest)return {...row};return undefined;}
 matches(token:string){return this.find(token)?.id;}
 list(officeId?:string):DeviceTokenInfo[]{return [...this.tokens.values()].filter(row=>!officeId||row.officeId===officeId).map(({hash:_hash,...info})=>info).sort((a,b)=>b.createdAt-a.createdAt);}
 belongsTo(id:string,officeId:string){return this.tokens.get(id)?.officeId===officeId;}
 revoke(id:string){const row=this.tokens.get(id);if(!row||row.revokedAt)return false;row.revokedAt=Date.now();this.save();return true;}
}
