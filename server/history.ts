import type {OfficeAgent} from '../src/officeModel.js';
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';

export type HistoryReason='completed'|'aborted'|'disconnected'|'observed';
export interface HistoryEntry {id:string;agentId:string;name:string;projectName?:string;provider?:string;machineLabel?:string;startedAt:number;endedAt:number;durationMs:number;reason:HistoryReason;}

export class OfficeHistory {
 private entries:HistoryEntry[]=[];
 private open=new Map<string,HistoryEntry>();
 constructor(private filePath?:string,private now=Date.now,private max=2000){if(filePath){try{const saved=JSON.parse(readFileSync(filePath,'utf8'));if(Array.isArray(saved))this.entries=saved.slice(0,max)}catch{/* A missing or damaged history file must not stop the office. */}}}
 private persist(){if(!this.filePath)return;try{mkdirSync(dirname(this.filePath),{recursive:true});const temp=`${this.filePath}.tmp`;writeFileSync(temp,JSON.stringify(this.entries));renameSync(temp,this.filePath)}catch{/* Live in-memory history remains available when storage is unavailable. */}}
 update(agent:OfficeAgent, active:boolean, reason:HistoryReason='observed'){
  const key=agent.id, current=this.open.get(key);
  if(active){if(!current)this.open.set(key,{id:`${key}:${this.now()}`,agentId:key,name:agent.name,projectName:agent.projectName||agent.name,provider:agent.provider,machineLabel:agent.machineLabel,startedAt:this.now(),endedAt:0,durationMs:0,reason:'observed'});return;}
  if(!current)return;
  const endedAt=this.now();const entry={...current,endedAt,durationMs:Math.max(0,endedAt-current.startedAt),reason};this.open.delete(key);this.entries.unshift(entry);if(this.entries.length>this.max)this.entries.length=this.max;this.persist();
 }
 list(limit=50,cursor=0){const start=Math.max(0,Number.isFinite(cursor)?cursor:0);const size=Math.min(100,Math.max(1,limit));return {items:this.entries.slice(start,start+size),nextCursor:start+size<this.entries.length?start+size:null};}
}
