import {it,expect} from 'vitest';
import {RemoteClients} from './remoteClients';
import {OfficeStore} from './store';

it('keeps Hermes and Codex independent on a shared store and rejects the wrong provider atomically',()=>{
 const store=new OfficeStore(),hermes=new RemoteClients(store,()=>{},()=>100),codex=new RemoteClients(store,()=>{},()=>100,'codex');
 const packet=(kind:string)=>({version:1,clientId:'same-machine',producerId:'same-process',sequence:1,sessions:[{agent:{id:kind+'-'+'a'.repeat(24),name:'same-project',role:kind,team:'research',status:'working'},active:true,updatedAt:1}]});
 hermes.ingest(packet('hermes'));codex.ingest(packet('codex'));
 expect(store.get().agents.map(a=>a.id.split('-')[0]).sort()).toEqual(['codex','hermes']);
 expect(hermes.getHealth().activeSessions).toBe(1);expect(codex.getHealth().activeSessions).toBe(1);
 expect(()=>codex.ingest({...packet('hermes'),sequence:2})).toThrow('codex');
 expect(store.get().agents).toHaveLength(2);
});
