import {useEffect,useRef,useState} from 'react';
import type {OfficeViewer,ViewerDirection} from './officeModel';

type SavedSession={token:string;viewer:OfficeViewer};
const SESSION_KEY='nekoffice-viewer-session';
const SPEED=5.5;

function randomName(){return `Penonton-${Math.floor(100+Math.random()*900)}`;}

export function useViewer(enabled=true){
 const [viewer,setViewerState]=useState<OfficeViewer|null>(null);
 const viewerRef=useRef<OfficeViewer|null>(null),tokenRef=useRef(''),dirtyRef=useRef(false),lastSentRef=useRef(0),connectingRef=useRef(false),sendingRef=useRef(false);
 const setViewer=(next:OfficeViewer|null)=>{viewerRef.current=next;setViewerState(next);};
 useEffect(()=>{
  if(!enabled)return;
  let disposed=false;
  const save=(session:SavedSession)=>{try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch{/* private browsing */}};
  const move=async(session:SavedSession,next:OfficeViewer)=>{const response=await fetch('/api/viewers/move',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},body:JSON.stringify({position:next.position,direction:next.direction,moving:next.moving})});if(!response.ok)return false;const payload=await response.json() as {viewer?:OfficeViewer};if(!disposed&&payload.viewer){setViewer(payload.viewer);lastSentRef.current=Date.now();}return true;};
  const create=async()=>{if(connectingRef.current||disposed)return;connectingRef.current=true;try{let saved:SavedSession|undefined;try{saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'') as SavedSession;}catch{/* stale or malformed session */}if(saved?.token&&saved.viewer&&await move(saved,saved.viewer)){tokenRef.current=saved.token;return;}const response=await fetch('/api/viewers/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:saved?.viewer?.name||randomName(),avatarStyle:saved?.viewer?.avatarStyle??Math.floor(Math.random()*8)})});if(!response.ok)return;const payload=await response.json() as {token:string;viewer:OfficeViewer};if(!payload.token||!payload.viewer)return;tokenRef.current=payload.token;setViewer(payload.viewer);save({token:payload.token,viewer:payload.viewer});lastSentRef.current=Date.now();}catch{/* viewer mode is optional when the API is unavailable */}finally{connectingRef.current=false;}};
  void create();
  const pressed=new Set<string>();
  const onKeyDown=(event:KeyboardEvent)=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes((event.target as HTMLElement)?.tagName))return;const key=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){event.preventDefault();pressed.add(key);}};
  const onKeyUp=(event:KeyboardEvent)=>pressed.delete(event.key.toLowerCase());
  const onBlur=()=>pressed.clear();
  window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);
  const timer=window.setInterval(()=>{const current=viewerRef.current;if(!current||!tokenRef.current)return;let dx=0,dy=0;if(pressed.has('w')||pressed.has('arrowup'))dy-=1;if(pressed.has('s')||pressed.has('arrowdown'))dy+=1;if(pressed.has('a')||pressed.has('arrowleft'))dx-=1;if(pressed.has('d')||pressed.has('arrowright'))dx+=1;const length=Math.hypot(dx,dy);let next=current;if(length){const direction:ViewerDirection=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');next={...current,position:{x:Math.max(24,Math.min(744,current.position.x+dx/length*SPEED)),y:Math.max(92,Math.min(470,current.position.y+dy/length*SPEED))},direction,moving:true};setViewer(next);dirtyRef.current=true;}else if(current.moving){next={...current,moving:false};setViewer(next);dirtyRef.current=true;}if((dirtyRef.current||Date.now()-lastSentRef.current>5000)&&!sendingRef.current){dirtyRef.current=false;sendingRef.current=true;const session={token:tokenRef.current,viewer:next};void move(session,next).then(ok=>{if(!ok){tokenRef.current='';void create();}}).finally(()=>{sendingRef.current=false;});}},100);
  return()=>{disposed=true;window.clearInterval(timer);window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',onBlur);const current=viewerRef.current;if(tokenRef.current&&current)void fetch('/api/viewers/leave',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tokenRef.current}`},body:'{}',keepalive:true});};
 },[enabled]);
 return viewer;
}
