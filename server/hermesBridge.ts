import {readdir,readFile,stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {OfficeStore,parseEvent} from './store.js';
import type {AgentPatch} from '../src/officeModel.js';

const STALE_MS=35_000, DEPARTURE_MS=90_000;
type Session={agent:AgentPatch;active:boolean;updatedAt:number;heartbeatAt:number;alive:boolean};
type Options={directory?:string;now?:()=>number;isAlive?:(pid:number)=>boolean};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const timestamp=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0;
function processAlive(pid:number){try{process.kill(pid,0);return true;}catch(error){return (error as NodeJS.ErrnoException).code==='EPERM';}}

/** Consumes metadata emitted by Hermes hooks; never reads chats, credentials or task results. */
export class HermesBridge {
 private directory:string;private now:()=>number;private isAlive:(pid:number)=>boolean;
 private tracked=new Map<string,{fingerprint:string;inactiveSince?:number}>();
 private timer?:ReturnType<typeof setInterval>;private polling=false;private stopped=false;
 private health={enabled:true,producers:0,activeSessions:0,lastPollAt:0};
 constructor(private store:OfficeStore,private publish:()=>void,options:Options={}){
  this.directory=options.directory??process.env.LITTLE_OFFICE_HERMES_SPOOL??join(homedir(),'.hermes/plugins/little-office-bridge/spool');
  this.now=options.now??Date.now;this.isAlive=options.isAlive??processAlive;
 }
 getHealth(){return {...this.health};}
 start(){if(this.timer)return;this.stopped=false;void this.poll();this.timer=setInterval(()=>{void this.poll();},750);this.timer.unref();}
 stop(){this.stopped=true;if(this.timer)clearInterval(this.timer);this.timer=undefined;}
 async poll(){
  if(this.polling||this.stopped)return;this.polling=true;
  try{
   const now=this.now(),latest=new Map<string,Session>();let producers=0;
   let files:string[];try{files=await readdir(this.directory);}catch{files=[];}
   for(const file of files.filter(f=>/^\d+-[a-f0-9]+\.json$/.test(f)).slice(0,1024)){
    try{
     const path=join(this.directory,file),info=await stat(path);if(info.size>512*1024||!info.isFile())continue;
     const raw:unknown=JSON.parse(await readFile(path,'utf8'));
     if(!object(raw)||raw.version!==1||!Number.isInteger(raw.pid)||(raw.pid as number)<=0||!timestamp(raw.heartbeatAt)||raw.heartbeatAt>now+5000||!Array.isArray(raw.sessions)||raw.sessions.length>128)continue;
     const heartbeatAt=raw.heartbeatAt,alive=now-heartbeatAt<STALE_MS&&this.isAlive(raw.pid as number);if(alive)producers++;
     for(const row of raw.sessions){
      try{
       if(!object(row)||typeof row.active!=='boolean'||!timestamp(row.updatedAt)||row.updatedAt>now+5000)continue;
       const event=parseEvent({type:'agent.upsert',agent:row.agent});if(event.type!=='agent.upsert'||!/^hermes-[a-f0-9]{24}$/.test(event.agent.id))continue;
       if(!event.agent.name||!event.agent.role||!event.agent.status)continue;
       const candidate={agent:event.agent,active:row.active,updatedAt:row.updatedAt,heartbeatAt,alive},old=latest.get(event.agent.id);
       if(!old||candidate.updatedAt>old.updatedAt||(candidate.updatedAt===old.updatedAt&&candidate.heartbeatAt>old.heartbeatAt))latest.set(event.agent.id,candidate);
      }catch{/* A malformed session cannot hide the other sessions. */}
     }
    }catch{/* Atomic writes normally prevent partial JSON; tolerate removal/corruption. */}
   }
   if(this.stopped)return;
   let changed=false,activeSessions=0;const present=new Set<string>();
   const ordered=[...latest.values()].sort((a,b)=>Number(b.active&&b.alive)-Number(a.active&&a.alive)||b.updatedAt-a.updatedAt);
   for(const session of ordered){
    const {agent}=session,previous=this.tracked.get(agent.id),active=session.active&&session.alive;
    // Do not replay old finished history on startup. Give current departures time to walk out.
    if(!previous&&!active&&now-(session.active?session.heartbeatAt:session.updatedAt)>DEPARTURE_MS)continue;
    const inactiveSince=active?undefined:previous?.inactiveSince??(session.active?now:Math.min(now,session.updatedAt));
    if(inactiveSince!==undefined&&now-inactiveSince>=DEPARTURE_MS)continue;
    const patch:AgentPatch={...agent,parentId:null,progress:null};
    if(!active){patch.status='done';if(session.active)patch.task='Session tidak aktif';}
    const fingerprint=JSON.stringify(patch);
    try{
     if(previous?.fingerprint!==fingerprint){this.store.apply({type:'agent.upsert',agent:patch});changed=true;}
     this.tracked.set(agent.id,{fingerprint,inactiveSince});present.add(agent.id);if(active)activeSessions++;
    }catch{/* Capacity is shared with manual API agents; retry on the next poll. */}
   }
   for(const [id,previous] of this.tracked){
    if(present.has(id))continue;
    if(!this.store.get().agents.some(agent=>agent.id===id)){this.tracked.delete(id);continue;}
    // Missing producer files also mean inactive; leave before removing the record.
    if(previous.inactiveSince===undefined){
     this.store.apply({type:'agent.upsert',agent:{id,status:'done',task:'Session tidak aktif'}});
     this.tracked.set(id,{fingerprint:'missing',inactiveSince:now});changed=true;
    }else if(now-previous.inactiveSince>=DEPARTURE_MS){
     this.store.apply({type:'agent.remove',agentId:id});this.tracked.delete(id);changed=true;
    }
   }
   this.health={enabled:true,producers,activeSessions,lastPollAt:now};if(changed)this.publish();
  }finally{this.polling=false;}
 }
}
