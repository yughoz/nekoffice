import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {OfficeStore,EventError} from './store.js';
import {RemoteClients} from './remoteClients.js';

type Options={token?:string;localHealth?:()=>unknown};
export function createOfficeApi(options:Options={}){
 const store=new OfficeStore(randomUUID()),clients=new Set<ServerResponse>();
 const snapshot=()=>`event: office\ndata: ${JSON.stringify(store.get())}\n\n`;
 const publish=()=>{for(const client of clients)if(!client.destroyed)client.write(snapshot());};
 const remote=new RemoteClients(store,publish),codex=new RemoteClients(store,publish,Date.now,'codex');
 function json(res:ServerResponse,status:number,body:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
 function authorized(req:IncomingMessage){if(!options.token)return false;return timingSafeEqual(createHash('sha256').update(req.headers.authorization??'').digest(),createHash('sha256').update('Bearer '+options.token).digest());}
 async function middleware(req:IncomingMessage,res:ServerResponse,next:()=>void){
  const path=req.url?.split('?')[0];if(!path?.startsWith('/api/')){next();return;}
  if(req.method==='GET'&&path==='/api/health'){json(res,200,{ok:true,revision:store.get().revision});return;}
  if(req.method==='GET'&&path==='/api/state'){json(res,200,store.get());return;}
  if(req.method==='GET'&&path==='/api/integrations/hermes'){json(res,200,{...remote.getHealth(),...(options.localHealth?{local:options.localHealth()}:{})});return;}
  if(req.method==='GET'&&path==='/api/integrations/codex'){json(res,200,codex.getHealth());return;}
  if(req.method==='GET'&&path==='/api/stream'){
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 2000\n\n'+snapshot());clients.add(res);
   const timer=setInterval(()=>{if(!res.destroyed)res.write(': heartbeat\n\n');},15000);timer.unref();res.once('close',()=>{clearInterval(timer);clients.delete(res);});return;
  }
  if(req.method!=='POST'||!['/api/events','/api/agents','/api/hermes/heartbeat','/api/codex/heartbeat'].includes(path)){json(res,404,{ok:false,error:'Unknown endpoint.'});return;}
  if(req.headers.origin){try{const origin=new URL(req.headers.origin);if(!['http:','https:'].includes(origin.protocol)||origin.host!==req.headers.host)throw new Error();}catch{json(res,403,{ok:false,error:'Cross-origin writes are not allowed.'});return;}}
  if(!options.token&&path.endsWith('/heartbeat')){json(res,503,{ok:false,error:'Configure OFFICE_API_TOKEN to receive remote clients.'});return;}
  if(options.token&&!authorized(req)){json(res,401,{ok:false,error:'Invalid API token.'});return;}
  if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{ok:false,error:'Use Content-Type: application/json.'});return;}
  try{
   const chunks:Buffer[]=[];let bytes=0;for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>65536)throw new EventError('Request body exceeds 64 KiB.',413);chunks.push(Buffer.from(chunk));}
   let body:unknown;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new EventError('Invalid JSON.');}
   if(path.endsWith('/heartbeat')){const result=(path==='/api/codex/heartbeat'?codex:remote).ingest(body);json(res,200,{ok:true,...result,revision:store.get().revision});return;}
   const result=store.apply(path==='/api/agents'?{type:'agent.upsert',agent:body}:body);if(!result.duplicate)publish();json(res,200,{ok:true,...result});
  }catch(error){json(res,error instanceof EventError?error.status:500,{ok:false,error:error instanceof EventError?error.message:'Server could not process this event.'});}
 }
 return {store,remote,codex,publish,middleware,start:()=>{remote.start();codex.start();},close:()=>{remote.stop();codex.stop();for(const client of clients)client.end();clients.clear();}};
}
