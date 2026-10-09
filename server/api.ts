import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {OfficeStore,EventError} from './store.js';
import {RemoteClients} from './remoteClients.js';
import {OfficeHistory} from './history.js';
import {DeviceTokenStore,type DeviceProvider} from './deviceTokens.js';

type Options={token?:string;localHealth?:()=>unknown;historyPath?:string;deviceTokensPath?:string};
export function createOfficeApi(options:Options={}){
 const store=new OfficeStore(randomUUID()),clients=new Set<ServerResponse>();
 const history=new OfficeHistory(options.historyPath);
 const deviceTokens=new DeviceTokenStore(options.deviceTokensPath);
 const snapshot=()=>`event: office\ndata: ${JSON.stringify(store.get())}\n\n`;
 const publish=()=>{for(const client of clients)if(!client.destroyed)client.write(snapshot());};
 const remote=new RemoteClients(store,publish),codex=new RemoteClients(store,publish,Date.now,'codex');
 function json(res:ServerResponse,status:number,body:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
 function authorized(req:IncomingMessage):'master'|'device'|null {const header=req.headers.authorization??'';if(!header.startsWith('Bearer '))return null;const presented=header.slice(7);if(options.token&&timingSafeEqual(createHash('sha256').update(presented).digest(),createHash('sha256').update(options.token).digest()))return 'master';return deviceTokens.matches(presented)?'device':null;}
 function allowedOrigin(req:IncomingMessage){if(!req.headers.origin)return true;try{const origin=new URL(req.headers.origin);return ['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.host;}catch{return false;}}
 async function readJson(req:IncomingMessage){const chunks:Buffer[]=[];let bytes=0;for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>65536)throw new EventError('Request body exceeds 64 KiB.',413);chunks.push(Buffer.from(chunk));}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{throw new EventError('Invalid JSON.');}}
 async function middleware(req:IncomingMessage,res:ServerResponse,next:()=>void){
  const path=req.url?.split('?')[0];if(!path?.startsWith('/api/')){next();return;}
  if(req.method==='GET'&&path==='/api/health'){json(res,200,{ok:true,revision:store.get().revision});return;}
  if(req.method==='GET'&&path==='/api/state'){json(res,200,store.get());return;}
  if(req.method==='GET'&&path==='/api/integrations/hermes'){json(res,200,{...remote.getHealth(),clientsList:remote.getRegistry(),...(options.localHealth?{local:options.localHealth()}:{})});return;}
  if(req.method==='GET'&&path==='/api/integrations/codex'){json(res,200,{...codex.getHealth(),clientsList:codex.getRegistry()});return;}
  if(req.method==='GET'&&path==='/api/integrations'){json(res,200,{serverNow:Date.now(),clients:[...remote.getRegistry(),...codex.getRegistry()]});return;}
  if(req.method==='GET'&&path==='/api/history'){const url=new URL(req.url||'/api/history','http://office.local');json(res,200,history.list(Number(url.searchParams.get('limit')||50),Number(url.searchParams.get('cursor')||0)));return;}
  if(path==='/api/device-tokens'){
   if(req.method==='GET'){if(authorized(req)!=='master'){json(res,401,{ok:false,error:'Admin token required.'});return;}json(res,200,{items:deviceTokens.list()});return;}
   if(req.method!=='POST'){json(res,405,{ok:false,error:'Method not allowed.'});return;}
   if(!allowedOrigin(req)){json(res,403,{ok:false,error:'Cross-origin writes are not allowed.'});return;}
   if(authorized(req)!=='master'){json(res,401,{ok:false,error:'Admin token required.'});return;}
   if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{ok:false,error:'Use Content-Type: application/json.'});return;}
   try{const body=await readJson(req) as Record<string,unknown>,label=typeof body.label==='string'?body.label:'',kind=(body.provider==='hermes'||body.provider==='codex'||body.provider==='both'?body.provider:'both') as DeviceProvider;if(!label.trim()||label.length>48)throw new EventError('label must be 1–48 characters.');const created=deviceTokens.create(label,kind);json(res,201,{ok:true,id:created.info.id,label:created.info.label,provider:created.info.provider,createdAt:created.info.createdAt,token:created.token});}catch(error){json(res,error instanceof EventError?error.status:500,{ok:false,error:error instanceof EventError?error.message:'Could not create device token.'});}return;
  }
  if(path==='/api/device-tokens/revoke'){
   if(req.method!=='POST'){json(res,405,{ok:false,error:'Method not allowed.'});return;}if(!allowedOrigin(req)){json(res,403,{ok:false,error:'Cross-origin writes are not allowed.'});return;}if(authorized(req)!=='master'){json(res,401,{ok:false,error:'Admin token required.'});return;}if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{ok:false,error:'Use Content-Type: application/json.'});return;}
   try{const body=await readJson(req) as Record<string,unknown>;if(typeof body.id!=='string'||!deviceTokens.revoke(body.id))throw new EventError('Device token not found or already revoked.',404);json(res,200,{ok:true,id:body.id});}catch(error){json(res,error instanceof EventError?error.status:500,{ok:false,error:error instanceof EventError?error.message:'Could not revoke device token.'});}return;
  }
  if(req.method==='GET'&&path==='/api/stream'){
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 2000\n\n'+snapshot());clients.add(res);
   const timer=setInterval(()=>{if(!res.destroyed)res.write(': heartbeat\n\n');},15000);timer.unref();res.once('close',()=>{clearInterval(timer);clients.delete(res);});return;
  }
  if(req.method!=='POST'||!['/api/events','/api/agents','/api/hermes/heartbeat','/api/codex/heartbeat'].includes(path)){json(res,404,{ok:false,error:'Unknown endpoint.'});return;}
  if(!allowedOrigin(req)){json(res,403,{ok:false,error:'Cross-origin writes are not allowed.'});return;}
  if(!options.token&&path.endsWith('/heartbeat')){json(res,503,{ok:false,error:'Configure OFFICE_API_TOKEN to receive remote clients.'});return;}
  if(options.token&&!authorized(req)){json(res,401,{ok:false,error:'Invalid API token.'});return;}
  if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{ok:false,error:'Use Content-Type: application/json.'});return;}
  try{
   const body=await readJson(req);
   if(path.endsWith('/heartbeat')){const result=(path==='/api/codex/heartbeat'?codex:remote).ingest(body);const source=path==='/api/codex/heartbeat'?'codex':'hermes';for(const agent of store.get().agents.filter(item=>item.provider===source))history.update(agent,agent.status!=='done',agent.status==='done'?(agent.task.includes('terputus')?'disconnected':'completed'):'observed');json(res,200,{ok:true,...result,revision:store.get().revision});return;}
   const result=store.apply(path==='/api/agents'?{type:'agent.upsert',agent:body}:body);if(!result.duplicate){const snap=store.get();const changed=snap.agents.find(a=>a.id===((body as any)?.agent?.id||(body as any)?.id));if(changed)history.update(changed,changed.status!=='done',changed.status==='done'?'completed':'observed');publish();}json(res,200,{ok:true,...result});
  }catch(error){json(res,error instanceof EventError?error.status:500,{ok:false,error:error instanceof EventError?error.message:'Server could not process this event.'});}
 }
 return {store,remote,codex,history,deviceTokens,publish,middleware,start:()=>{remote.start();codex.start();},close:()=>{remote.stop();codex.stop();for(const client of clients)client.end();clients.clear();}};
}
