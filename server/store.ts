import type {AgentPatch,OfficeAgent,OfficeEvent,OfficeSnapshot,Room,AgentStatus,ActivityCode} from '../src/officeModel.js';
const rooms:Room[]=['coord','research','creative','production','qa'];
const statuses:AgentStatus[]=['idle','working','thinking','waiting','error','done'];
const activities:ActivityCode[]=['generic','edit','command','test','research','thinking','waiting','error'];
export class EventError extends Error {constructor(message:string,public status=400){super(message);}}
function text(value:unknown,key:string,max:number,required=false):string|undefined {if(value===undefined&&!required)return undefined;if(typeof value!=='string'||!value.trim()||value.length>max)throw new EventError(`${key} must be a non-empty string, max ${max} characters.`);return value;}
function id(value:unknown,key='id'):string {const s=text(value,key,80,true)!;if(!/^[a-zA-Z0-9_./:-]+$/.test(s))throw new EventError(`${key} contains unsupported characters.`);return s;}
function object(value:unknown):Record<string,unknown> {if(!value||typeof value!=='object'||Array.isArray(value))throw new EventError('Expected a JSON object.');return value as Record<string,unknown>;}
function room(value:unknown):Room|undefined {if(value===undefined)return undefined;if(!rooms.includes(value as Room))throw new EventError('room/team must be coord, research, creative, production, or qa.');return value as Room;}
export function parseEvent(raw:unknown):OfficeEvent {
 const e=object(raw),eventId=e.eventId===undefined?undefined:id(e.eventId,'eventId');
 if(e.type==='agent.upsert'){const a=object(e.agent),patch:AgentPatch={id:id(a.id)};
  if(a.name!==undefined)patch.name=text(a.name,'name',48,true);
  if(a.role!==undefined)patch.role=text(a.role,'role',80,true);
  if(a.task!==undefined){if(typeof a.task!=='string'||a.task.length>500)throw new EventError('task must be a string, max 500 characters.');patch.task=a.task;}
  if(a.team!==undefined)patch.team=room(a.team);if(a.room!==undefined)patch.room=room(a.room);
  if(a.status!==undefined){if(!statuses.includes(a.status as AgentStatus))throw new EventError('Unsupported agent status.');patch.status=a.status as AgentStatus;}
  if(a.parentId!==undefined)patch.parentId=a.parentId===null?null:id(a.parentId,'parentId');
  if(a.progress!==undefined){if(a.progress!==null&&(typeof a.progress!=='number'||!Number.isFinite(a.progress)||a.progress<0||a.progress>1))throw new EventError('progress must be 0..1 or null.');patch.progress=a.progress as number|null;}
  if(a.provider!==undefined){if(!['codex','hermes','manual'].includes(a.provider as string))throw new EventError('Unsupported provider.');patch.provider=a.provider as AgentPatch['provider'];}
  for(const key of ['machineId','machineLabel','bridgeVersion','projectName','projectKey'] as const)if(a[key]!==undefined)patch[key]=text(a[key],key,80,true);
  if(a.activityCode!==undefined){if(!activities.includes(a.activityCode as ActivityCode))throw new EventError('Unsupported activity code.');patch.activityCode=a.activityCode as ActivityCode;}
  if(a.avatarStyle!==undefined){const value=a.avatarStyle;if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>15)throw new EventError('avatarStyle must be an integer from 0 to 15.');patch.avatarStyle=value;}
  if(a.seatIndex!==undefined){const value=a.seatIndex;if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>63)throw new EventError('seatIndex must be an integer from 0 to 63.');patch.seatIndex=value;}
  return {type:'agent.upsert',agent:patch,eventId};
 }
 if(e.type==='agent.move'){const targetRoom=room(e.room);let position: {x:number;y:number}|undefined;
  if(e.position!==undefined){const p=object(e.position);if(typeof p.x!=='number'||typeof p.y!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>768||p.y<0||p.y>512)throw new EventError('position must be inside the 768 × 512 office.');position={x:p.x,y:p.y};}
  if(!position&&!targetRoom)throw new EventError('agent.move needs room or position.');return {type:'agent.move',agentId:id(e.agentId,'agentId'),room:targetRoom,position,eventId};
 }
 if(e.type==='agent.remove')return {type:'agent.remove',agentId:id(e.agentId,'agentId'),eventId};
 if(e.type==='office.update')return {type:'office.update',title:text(e.title,'title',100,true)!,eventId};
 if(e.type==='office.reset')return {type:'office.reset',eventId};
 throw new EventError('Unsupported event type.');
}
export class OfficeStore {
 private snapshot:OfficeSnapshot;private seen=new Set<string>();
 constructor(epoch='local'){this.snapshot={epoch,revision:0,title:'NekOffice',agents:[]};}
 get():OfficeSnapshot {return structuredClone(this.snapshot);}
 apply(raw:unknown):{duplicate:boolean;revision:number}{const e=parseEvent(raw);if(e.eventId&&this.seen.has(e.eventId))return {duplicate:true,revision:this.snapshot.revision};const revision=this.snapshot.revision+1;
  if(e.type==='agent.upsert'){const index=this.snapshot.agents.findIndex(a=>a.id===e.agent.id),previous=this.snapshot.agents[index];if(index<0&&this.snapshot.agents.length>=64)throw new EventError('Office capacity is 64 agents.',409);
   const a=e.agent;const next:OfficeAgent={...(previous||{id:a.id,name:a.id,role:'Agent',team:'research' as Room,room:'research' as Room,status:'idle' as AgentStatus,task:''}),...a,parentId:a.parentId===null?undefined:a.parentId??previous?.parentId,progress:a.progress===null?undefined:a.progress??previous?.progress,revision};
   if(a.team&&!a.room)next.room=a.team;if(a.room||a.team)delete next.position;
   if(a.progress===undefined&&((a.status&&a.status!==previous?.status)||(a.task!==undefined&&a.task!==previous?.task)))next.progress=undefined;
   if(index<0)this.snapshot.agents.push(next);else this.snapshot.agents[index]=next;
  }else if(e.type==='agent.move'){const agent=this.snapshot.agents.find(a=>a.id===e.agentId);if(!agent)throw new EventError('Unknown agentId.',404);if(e.room)agent.room=e.room;agent.position=e.position;agent.revision=revision;
  }else if(e.type==='agent.remove'){this.snapshot.agents=this.snapshot.agents.filter(a=>a.id!==e.agentId);
  }else if(e.type==='office.update')this.snapshot.title=e.title;
  else if(e.type==='office.reset')this.snapshot.agents=[];
  this.snapshot.revision=revision;if(e.eventId){this.seen.add(e.eventId);if(this.seen.size>1000)this.seen.delete(this.seen.values().next().value!);}return {duplicate:false,revision};
 }
}
