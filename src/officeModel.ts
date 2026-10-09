import {agentSeed} from './officeLayout';
export type Room = 'coord'|'research'|'creative'|'production'|'qa';
export type AgentStatus = 'idle'|'working'|'thinking'|'waiting'|'error'|'done';
export interface OfficeAgent {id:string;name:string;role:string;team:Room;room:Room;parentId?:string;status:AgentStatus;task:string;progress?:number;position?:{x:number;y:number};revision:number;}
export interface OfficeSnapshot {epoch:string;revision:number;title:string;agents:OfficeAgent[];}
export const roomInfo:Record<Room,{name:string;color:string}>={coord:{name:'Koordinator',color:'#56748c'},research:{name:'Tim riset',color:'#659b72'},creative:{name:'Tim kreatif',color:'#c886a0'},production:{name:'Tim produksi',color:'#9789b7'},qa:{name:'Tim QA',color:'#d9a078'}};
export const statusInfo:Record<AgentStatus,{label:string;color:number}>={idle:{label:'Siaga',color:0xb3ae98},working:{label:'Bekerja',color:0x559571},thinking:{label:'Berpikir',color:0x799ac3},waiting:{label:'Menunggu',color:0xc8aa66},error:{label:'Perlu perhatian',color:0xc87445},done:{label:'Selesai',color:0x6c9d64}};
export interface AgentPatch {id:string;name?:string;role?:string;team?:Room;room?:Room;parentId?:string|null;status?:AgentStatus;task?:string;progress?:number|null;}
export type OfficeEvent = ({type:'agent.upsert';agent:AgentPatch}|{type:'agent.move';agentId:string;room?:Room;position?:{x:number;y:number}}|{type:'agent.remove';agentId:string}|{type:'office.update';title:string}|{type:'office.reset'})&{eventId?:string};
const demoPeople=[['mika','Mika','coord','Coordinator'],['nara','Nara','research','Research lead'],['rio','Rio','research','Researcher'],['sora','Sora','research','Scriptwriter'],['luna','Luna','creative','Creative lead'],['aya','Aya','creative','Voice artist'],['niko','Niko','creative','Visual artist'],['kai','Kai','production','Production lead'],['edo','Edo','production','Editor'],['bima','Bima','production','Render worker'],['tala','Tala','qa','QA lead'],['yuki','Yuki','qa','Reviewer'],['remi','Remi','qa','Publisher']];
const demoTasks:Record<Room,string[]>={coord:['Mengkoordinasikan tim','Meneruskan pekerjaan ke tim'],research:['Membaca referensi','Menulis naskah','Meninjau hasil riset'],creative:['Membuat gambar adegan','Menyiapkan narasi','Mendesain thumbnail'],production:['Menyusun video','Memproses render','Meninjau timeline'],qa:['Memeriksa hasil','Meninjau caption','Menyiapkan publikasi']};
export function demoSnapshot(tick:number,runSeed=0):OfficeSnapshot {
 const agents:OfficeAgent[]=[];
 for(const [id,name,team,role] of demoPeople){
  const seed=agentSeed(`${id}/${runSeed}`),delay=id==='mika'?0:seed%10,period=54+seed%13,elapsed=tick-delay;
  if(elapsed<0)continue;
  const cycle=Math.floor(elapsed/period),phase=elapsed%period,workTicks=22+agentSeed(`${id}/${cycle}/${runSeed}`)%12;
  // Stagger arrivals and jobs. Completed agents have time to walk out before resting.
  if(phase>=workTicks+15)continue;
  const i=demoPeople.findIndex(person=>person[0]===id),teamRoom=team as Room;
  agents.push({id,name,team:teamRoom,room:teamRoom,role,status:phase<workTicks?'working':'done',task:phase<workTicks?demoTasks[teamRoom][(cycle+i)%demoTasks[teamRoom].length]:'Pekerjaan selesai',parentId:i===0?undefined:i%3===1?'mika':demoPeople[i-(i-1)%3][0],revision:tick});
 }
 return {epoch:`demo/${runSeed}`,revision:tick,title:'Kantor kreator',agents};
}
