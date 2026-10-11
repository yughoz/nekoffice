type FetchLike=(input:string|URL,init?:RequestInit)=>Promise<Response>;

export type MirrorStatus={enabled:boolean;target:string|null;forwarded:number;failed:number;lastSuccessAt:number|null;lastFailureAt:number|null;lastStatus:number|null;lastError:string|null};

/** Serializes accepted API writes to a second NekOffice server. */
export class ApiMirror {
 private readonly origin:string;
 private readonly basePath:string;
 private readonly token:string;
 private readonly fetchImpl:FetchLike;
 private readonly timeoutMs:number;
 private queue:Promise<void>=Promise.resolve();
 private pending=new Set<AbortController>();
 private status={forwarded:0,failed:0,lastSuccessAt:null as number|null,lastFailureAt:null as number|null,lastStatus:null as number|null,lastError:null as string|null};

 constructor(options:{url:string;token:string;fetchImpl?:FetchLike;timeoutMs?:number}){
  const parsed=new URL(options.url);
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('OFFICE_MIRROR_URL must be a plain HTTP(S) origin or path.');
  if(!options.token||options.token.length<32||/[\r\n]/.test(options.token))throw new Error('OFFICE_MIRROR_TOKEN must be at least 32 characters.');
  this.origin=parsed.origin;
  this.basePath=parsed.pathname.replace(/\/+$/,'');
  this.token=options.token;
  this.fetchImpl=options.fetchImpl??globalThis.fetch.bind(globalThis);
  this.timeoutMs=options.timeoutMs??3000;
 }

 getStatus():MirrorStatus{return {enabled:true,target:this.origin+this.basePath, ...this.status};}

 forward(path:string,body:unknown){
  this.queue=this.queue.catch(()=>{}).then(()=>this.send(path,body));
  return this.queue;
 }

 close(){for(const controller of this.pending)controller.abort();this.pending.clear();}

 private async send(path:string,body:unknown){
  const controller=new AbortController(),target=new URL(this.basePath+path,this.origin).toString();
  this.pending.add(controller);
  const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  timer.unref?.();
  try{
   const response=await this.fetchImpl(target,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+this.token,'X-Nekoffice-Mirror':'1'},body:JSON.stringify(body),signal:controller.signal});
   this.status.lastStatus=response.status;
   if(!response.ok)throw new Error('mirror returned HTTP '+response.status);
   this.status.forwarded+=1;this.status.lastSuccessAt=Date.now();this.status.lastError=null;
  }catch(error){
   this.status.failed+=1;this.status.lastFailureAt=Date.now();this.status.lastError=error instanceof Error?error.message:'mirror request failed';
  }finally{clearTimeout(timer);this.pending.delete(controller);}
 }
}
