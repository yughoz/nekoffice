import type {OfficeAgent} from '../src/officeModel.js';

export type HistoryReason='completed'|'aborted'|'disconnected'|'observed';
export interface HistoryEntry {id:string;agentId:string;name:string;projectName?:string;provider?:string;machineLabel?:string;startedAt:number;endedAt:number;durationMs:number;reason:HistoryReason;}

export class OfficeHistory {
 private entries:HistoryEntry[]=[];
 private open=new Map<string,HistoryEntry>();
 constructor(private now=Date.now,private max=2000){}
 update(agent:OfficeAgent, active:boolean, reason:HistoryReason='observed'){
  const key=agent.id, current=this.open.get(key);
  if(active){if(!current)this.open.set(key,{id:`${key}:${this.now()}`,agentId:key,name:agent.name,projectName:agent.projectName||agent.name,provider:agent.provider,machineLabel:agent.machineLabel,startedAt:this.now(),endedAt:0,durationMs:0,reason:'observed'});return;}
  if(!current)return;
  const endedAt=this.now();const entry={...current,endedAt,durationMs:Math.max(0,endedAt-current.startedAt),reason};this.open.delete(key);this.entries.unshift(entry);if(this.entries.length>this.max)this.entries.length=this.max;
 }
 list(limit=50,cursor=0){const start=Math.max(0,Number.isFinite(cursor)?cursor:0);const size=Math.min(100,Math.max(1,limit));return {items:this.entries.slice(start,start+size),nextCursor:start+size<this.entries.length?start+size:null};}
}
