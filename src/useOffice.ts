import {useEffect,useState} from 'react';
import {demoSnapshot,type OfficeSnapshot} from './officeModel';
export function useOffice(){
 const [demoSeed]=useState(()=>Math.floor(Math.random()*0xffffffff));
 const [mode,setMode]=useState<'demo'|'api'>('demo'),[tick,setTick]=useState(0),[live,setLive]=useState<OfficeSnapshot>({epoch:'initial',revision:0,title:'Kantor kreator',agents:[]}),[connected,setConnected]=useState(false),[paused,setPaused]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>{if(!paused)setTick(t=>t+1);},2400);return()=>clearInterval(timer);},[paused]);
 useEffect(()=>{const stream=new EventSource('/api/stream');stream.addEventListener('office',event=>{try{const snapshot=JSON.parse((event as MessageEvent).data) as OfficeSnapshot;if(!snapshot.epoch||!Array.isArray(snapshot.agents))return;setLive(snapshot);setConnected(true);if(snapshot.revision>0&&snapshot.agents.length>0)setMode('api');}catch{setConnected(false);}});stream.onerror=()=>setConnected(false);return()=>stream.close();},[]);
 function changeMode(next:'demo'|'api'){if(next==='demo'&&mode!=='demo'){setTick(0);setPaused(false);}setMode(next);}
 return {snapshot:mode==='demo'?demoSnapshot(tick,demoSeed):live,mode,changeMode,connected,paused:mode==='demo'&&paused,setPaused};
}
