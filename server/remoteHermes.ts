import {createHash} from 'node:crypto';
import {OfficeStore,EventError,parseEvent} from './store.js';
import type {AgentPatch} from '../src/officeModel.js';

const LEASE_MS=35_000,DEPARTURE_MS=90_000;
type Session={agent:AgentPatch;active:boolean;updatedAt:number;changedAt:number};
type Producer={clientId:string;sequence:number;receivedAt:number;sessions:Session[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function identifier(value:unknown,label:string){if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(value))throw new EventError(`Invalid ${label}.`);return value;}

/** Remote leases use server time: clocks and PIDs on other machines never establish liveness. */
export class RemoteHermes {
 private producers=new Map<string,Producer>();
 private tracked=new Map<string,{fingerprint:string;inactiveSince?:number}>();
 private timer?:ReturnType<typeof setInterval>;
 constructor(private store:OfficeStore,private publish:()=>void,private now=Date.now){}
 start(){if(!this.timer){this.timer=setInterval(()=>this.reconcile(),1000);this.timer.unref();}}
 stop(){if(this.timer)clearInterval(this.timer);this.timer=undefined;}
 getHealth(){const now=this.now(),live=[...this.producers.values()].filter(p=>now-p.receivedAt<LEASE_MS);
  return {transport:'http',clients:new Set(live.map(p=>p.clientId)).size,producers:live.length,activeSessions:this.store.get().agents.filter(a=>this.tracked.has(a.id)&&a.status!=='done').length,lastHeartbeatAt:Math.max(0,...[...this.producers.values()].map(p=>p.receivedAt))};}
 ingest(raw:unknown){
  if(!object(raw)||raw.version!==1||!Number.isSafeInteger(raw.sequence)||(raw.sequence as number)<1||!Array.isArray(raw.sessions)||raw.sessions.length>128)throw new EventError('Expected version 1, positive sequence and at most 128 sessions.');
  const clientId=identifier(raw.clientId,'clientId'),producerId=identifier(raw.producerId,'producerId'),key=clientId+':'+producerId,previous=this.producers.get(key),now=this.now();
  const sessions:Session[]=raw.sessions.map(row=>{
   if(!object(row)||typeof row.active!=='boolean'||typeof row.updatedAt!=='number'||!Number.isSafeInteger(row.updatedAt)||row.updatedAt<0)throw new EventError('Invalid session metadata.');
   const event=parseEvent({type:'agent.upsert',agent:row.agent});
   if(event.type!=='agent.upsert'||!/^hermes-[a-f0-9]{24}$/.test(event.agent.id)||!event.agent.name||!event.agent.role||!event.agent.status)throw new EventError('Expected a named Hermes session.');
   const agent:AgentPatch={...event.agent,id:'hermes-'+createHash('sha256').update(clientId+'\0'+event.agent.id).digest('hex').slice(0,24),parentId:null,progress:null};
   const old=previous?.sessions.find(s=>s.agent.id===agent.id);
   const unchanged=old?.updatedAt===row.updatedAt&&old.active===row.active&&JSON.stringify(old.agent)===JSON.stringify(agent);
   return {agent,active:row.active,updatedAt:row.updatedAt,changedAt:unchanged?old!.changedAt:now};
  });
  if(new Set(sessions.map(s=>s.agent.id)).size!==sessions.length)throw new EventError('Duplicate session IDs in packet.');
  if(previous&&(raw.sequence as number)<=previous.sequence)return {duplicate:true};
  if(!previous&&this.producers.size>=512)throw new EventError('Producer capacity reached.',429);
  this.producers.set(key,{clientId,sequence:raw.sequence as number,receivedAt:now,sessions});this.reconcile();return {duplicate:false};
 }
 reconcile(){
  const now=this.now(),latest=new Map<string,Session&{receivedAt:number;alive:boolean}>();
  for(const [key,producer] of this.producers){
   if(now-producer.receivedAt>3_600_000){this.producers.delete(key);continue;}
   for(const session of producer.sessions){
    const candidate={...session,receivedAt:producer.receivedAt,alive:now-producer.receivedAt<LEASE_MS},old=latest.get(session.agent.id);
    // Processes on one client share a clock; different clients have different session IDs.
    if(!old||candidate.updatedAt>old.updatedAt||(candidate.updatedAt===old.updatedAt&&candidate.changedAt>old.changedAt))latest.set(session.agent.id,candidate);
   }
  }
  let changed=false;const present=new Set<string>();
  for(const session of [...latest.values()].sort((a,b)=>Number(b.active&&b.alive)-Number(a.active&&a.alive)||b.changedAt-a.changedAt)){
   const id=session.agent.id,previous=this.tracked.get(id),active=session.active&&session.alive;
   const inactiveSince=active?undefined:previous?.inactiveSince??(session.active?session.receivedAt+LEASE_MS:session.changedAt);
   if(inactiveSince!==undefined&&now-inactiveSince>=DEPARTURE_MS)continue;
   const patch={...session.agent,...(!active?{status:'done' as const,...(session.active?{task:'Client terputus; session tidak aktif'}:{})}:{})};
   const fingerprint=JSON.stringify(patch);
   try{
    if(previous?.fingerprint!==fingerprint||!this.store.get().agents.some(a=>a.id===id)){this.store.apply({type:'agent.upsert',agent:patch});changed=true;}
    this.tracked.set(id,{fingerprint,inactiveSince});present.add(id);
   }catch{/* Retry after a seat becomes free; the renderer shares 64 seats with manual API agents. */}
  }
  for(const [id,previous] of this.tracked){
   if(present.has(id))continue;
   if(!this.store.get().agents.some(a=>a.id===id)){this.tracked.delete(id);continue;}
   if(previous.inactiveSince===undefined){this.store.apply({type:'agent.upsert',agent:{id,status:'done',task:'Session tidak aktif'}});this.tracked.set(id,{fingerprint:'missing',inactiveSince:now});changed=true;}
   else if(now-previous.inactiveSince>=DEPARTURE_MS){this.store.apply({type:'agent.remove',agentId:id});this.tracked.delete(id);changed=true;}
  }
  if(changed)this.publish();
 }
}
