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

it('keeps a remote subagent beside its namespaced parent',()=>{
 const store=new OfficeStore(),codex=new RemoteClients(store,()=>{},()=>100,'codex');
 const packet={version:1,clientId:'machine',producerId:'producer',sequence:1,sessions:[
  {agent:{id:'codex-'+'a'.repeat(24),name:'project',role:'Codex · Desktop / IDE',team:'production',status:'working',task:'Main'},active:true,updatedAt:1},
  {agent:{id:'codex-'+'b'.repeat(24),name:'project · subagent',role:'Codex · Subagent',team:'production',status:'working',task:'Child',parentId:'codex-'+'a'.repeat(24)},active:true,updatedAt:1}
 ]};
 codex.ingest(packet);
 const agents=store.get().agents;
 expect(agents).toHaveLength(2);
 const parent=agents.find(agent=>!agent.parentId),child=agents.find(agent=>agent.parentId);
 expect(child?.parentId).toBe(parent?.id);
});
