import {useEffect,useRef,useState} from 'react';
import type {OfficeViewer,ViewerDirection} from './officeModel';
import {isWalkable} from './navigation';
import {roomHeight} from './officeLayout';

type SavedSession={token:string;viewer:OfficeViewer};
const SESSION_KEY='nekoffice-viewer-session';
const SPEED=5.5,MAX_NOTE_LENGTH=50,MAX_NAME_LENGTH=5;

function randomName(){return `P${Math.floor(1000+Math.random()*9000)}`.slice(0,5);}

export function useViewer(enabled=true,officeCount=15){
 const [viewer,setViewerState]=useState<OfficeViewer|null>(null);
 const viewerRef=useRef<OfficeViewer|null>(null),officeCountRef=useRef(officeCount),tokenRef=useRef(''),dirtyRef=useRef(false),lastSentRef=useRef(0),connectingRef=useRef(false),sendingRef=useRef(false);
 officeCountRef.current=officeCount;
 const setViewer=(next:OfficeViewer|null)=>{viewerRef.current=next;setViewerState(next);};
 const setNote=(value:string)=>{const current=viewerRef.current;if(!current)return;setViewer({...current,note:value.slice(0,MAX_NOTE_LENGTH)});dirtyRef.current=true;};
 const setName=(value:string)=>{const current=viewerRef.current;if(!current)return;setViewer({...current,name:value.slice(0,MAX_NAME_LENGTH)});dirtyRef.current=true;};
 useEffect(()=>{
  if(!enabled)return;
  let disposed=false;
  const save=(session:SavedSession)=>{try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch{/* private browsing */}};
  type MoveResult='ok'|'invalid'|'rejected';
  const move=async(session:SavedSession,next:OfficeViewer):Promise<MoveResult>=>{try{const response=await fetch('/api/viewers/move',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},body:JSON.stringify({position:next.position,direction:next.direction,moving:next.moving,name:next.name.trim()||'Guest',note:next.note??''})});if(!response.ok)return response.status===401?'invalid':'rejected';const payload=await response.json() as {viewer?:OfficeViewer};if(payload.viewer){const local=viewerRef.current,movementUnchanged=!local||local.position.x===next.position.x&&local.position.y===next.position.y&&local.direction===next.direction&&local.moving===next.moving,nameUnchanged=!local||local.name===next.name,noteUnchanged=!local||local.note===next.note,merged=local?{...local,position:movementUnchanged?payload.viewer.position:local.position,direction:movementUnchanged?payload.viewer.direction:local.direction,moving:movementUnchanged?payload.viewer.moving:local.moving,name:nameUnchanged?payload.viewer.name:local.name,note:noteUnchanged?payload.viewer.note:local.note,lastSeenAt:payload.viewer.lastSeenAt}:payload.viewer;save({token:session.token,viewer:merged});if(!disposed){setViewer(merged);lastSentRef.current=Date.now();}}return 'ok';}catch{return 'rejected';}};
  const create=async()=>{if(connectingRef.current||disposed)return;connectingRef.current=true;try{let saved:SavedSession|undefined;try{saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'') as SavedSession;}catch{/* stale or malformed session */}if(saved?.token&&saved.viewer&&(await move(saved,saved.viewer))==='ok'){tokenRef.current=saved.token;return;}const response=await fetch('/api/viewers/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:saved?.viewer?.name||randomName(),avatarStyle:saved?.viewer?.avatarStyle??Math.floor(Math.random()*8)})});if(!response.ok)return;const payload=await response.json() as {token:string;viewer:OfficeViewer};if(!payload.token||!payload.viewer)return;const fresh={token:payload.token,viewer:payload.viewer};if(saved?.viewer){const restored={...payload.viewer,position:saved.viewer.position,direction:saved.viewer.direction,moving:false,name:saved.viewer.name.slice(0,MAX_NAME_LENGTH)||payload.viewer.name,note:saved.viewer.note?.slice(0,MAX_NOTE_LENGTH)};if(await move(fresh,restored)==='ok'){tokenRef.current=payload.token;lastSentRef.current=Date.now();return;}}tokenRef.current=payload.token;setViewer(payload.viewer);save(fresh);lastSentRef.current=Date.now();}catch{/* viewer mode is optional when the API is unavailable */}finally{connectingRef.current=false;}};
  void create();
  const pressed=new Set<string>();
  const onKeyDown=(event:KeyboardEvent)=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes((event.target as HTMLElement)?.tagName))return;const key=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){event.preventDefault();pressed.add(key);}};
  const onKeyUp=(event:KeyboardEvent)=>pressed.delete(event.key.toLowerCase());
  const onBlur=()=>pressed.clear();
  window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);
  const timer=window.setInterval(()=>{const current=viewerRef.current;if(!current||!tokenRef.current)return;let dx=0,dy=0;if(pressed.has('w')||pressed.has('arrowup'))dy-=1;if(pressed.has('s')||pressed.has('arrowdown'))dy+=1;if(pressed.has('a')||pressed.has('arrowleft'))dx-=1;if(pressed.has('d')||pressed.has('arrowright'))dx+=1;const length=Math.hypot(dx,dy);let next=current;if(length){const count=officeCountRef.current,direction:ViewerDirection=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down'),height=roomHeight(count),x=Math.max(24,Math.min(744,current.position.x+dx/length*SPEED)),y=Math.max(92,Math.min(height-8,current.position.y+dy/length*SPEED)),candidates=[{x,y},{x,y:current.position.y},{x:current.position.x,y}];const position=candidates.find(candidate=>isWalkable(candidate.x,candidate.y,count))||current.position;next={...current,position,direction,moving:position.x!==current.position.x||position.y!==current.position.y};setViewer(next);dirtyRef.current=true;}else if(current.moving){next={...current,moving:false};setViewer(next);dirtyRef.current=true;}if((dirtyRef.current||Date.now()-lastSentRef.current>5000)&&!sendingRef.current){dirtyRef.current=false;sendingRef.current=true;const session={token:tokenRef.current,viewer:next};void move(session,next).then(result=>{if(result==='invalid'){tokenRef.current='';void create();}else if(result==='rejected'){dirtyRef.current=true;}}).finally(()=>{sendingRef.current=false;});}},100);
  return()=>{disposed=true;window.clearInterval(timer);window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',onBlur);};
 },[enabled]);
 return {viewer,setName,setNote};
}
