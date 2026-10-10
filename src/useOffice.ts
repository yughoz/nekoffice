import {useEffect,useMemo,useState} from 'react';
import {demoSnapshot,type OfficeSnapshot, type OfficeAgent} from './officeModel';

export type OfficeClient={provider:'codex'|'hermes'|'manual';clientId:string;machineLabel:string;bridgeVersion:string;lastHeartbeatAt:number;activeSessions:number;connected:boolean};
export type OfficeHistory={id:string;agentId:string;name:string;projectName?:string;provider?:string;machineLabel?:string;startedAt:number;endedAt:number;durationMs:number;reason:string};
export type OfficeFilters={project:string;machine:string;provider:string};
const emptyFilters:OfficeFilters={project:'',machine:'',provider:''};

export function useOffice(){
 const [demoSeed]=useState(()=>Math.floor(Math.random()*0xffffffff));
 const [mode,setMode]=useState<'demo'|'api'>('demo'),[tick,setTick]=useState(0),[live,setLive]=useState<OfficeSnapshot>({epoch:'initial',revision:0,title:'Kantor kreator',agents:[]}),[connected,setConnected]=useState(false),[paused,setPaused]=useState(false),[clients,setClients]=useState<OfficeClient[]>([]),[history,setHistory]=useState<OfficeHistory[]>([]),[filters,setFilters]=useState<OfficeFilters>(()=>{try{return {...emptyFilters,...JSON.parse(localStorage.getItem('nekoffice-filters')||'{}')}}catch{return emptyFilters}});
 useEffect(()=>{const timer=setInterval(()=>{if(!paused)setTick(t=>t+1);},2400);return()=>clearInterval(timer);},[paused]);
 useEffect(()=>{const stream=new EventSource('/api/stream');stream.addEventListener('office',event=>{try{const snapshot=JSON.parse((event as MessageEvent).data) as OfficeSnapshot;if(!snapshot.epoch||!Array.isArray(snapshot.agents))return;setLive(snapshot);setConnected(true);if(snapshot.revision>0&&snapshot.agents.length>0)setMode('api');}catch{setConnected(false);}});stream.onerror=()=>setConnected(false);return()=>stream.close();},[]);
 useEffect(()=>{if(mode!=='api')return;let disposed=false;const load=async()=>{try{const [integrationResponse,historyResponse]=await Promise.all([fetch('/api/integrations'),fetch('/api/history?limit=50')]);if(!disposed&&integrationResponse.ok){const payload=await integrationResponse.json();setClients(payload.clients||[])}if(!disposed&&historyResponse.ok){const payload=await historyResponse.json();setHistory(payload.items||[])}}catch{/* SSE remains the source of truth for the office. */}};void load();const timer=setInterval(load,10000);return()=>{disposed=true;clearInterval(timer)}},[mode]);
 useEffect(()=>{try{localStorage.setItem('nekoffice-filters',JSON.stringify(filters))}catch{/* private browsing */}},[filters]);
 function changeMode(next:'demo'|'api'){if(next==='demo'&&mode!=='demo'){setTick(0);setPaused(false);}setMode(next);}
 const raw=mode==='demo'?demoSnapshot(tick,demoSeed):live;
 const projects=useMemo(()=>[...new Set(raw.agents.map(a=>a.projectName||a.name))].sort(),[raw.agents]);
 const machines=useMemo(()=>[...new Set(raw.agents.map(a=>a.machineLabel||'Mesin lokal'))].sort(),[raw.agents]);
 const filtered=useMemo(()=>raw.agents.filter((agent:OfficeAgent)=>{const project=agent.projectName||agent.name,machine=agent.machineLabel||'Mesin lokal';return (!filters.project||project===filters.project)&&(!filters.machine||machine===filters.machine)&&(!filters.provider||agent.provider===filters.provider)}),[raw,filters]);
 const snapshot={...raw,agents:filtered};
 return {snapshot,allAgents:raw.agents,mode,changeMode,connected,paused:mode==='demo'&&paused,setPaused,clients,history,filters,setFilters,projects,machines};
}
