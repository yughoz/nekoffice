import {createServer,type Server} from 'node:http';
import {afterEach,it,expect} from 'vitest';
import {createOfficeApi} from './api';

const resources:Array<{server:Server;api:ReturnType<typeof createOfficeApi>}>=[];
afterEach(async()=>{for(const {server,api} of resources.splice(0)){api.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}});

async function setup(){
 const api=createOfficeApi({token:'a'.repeat(64)}),server=createServer((req,res)=>{void api.middleware(req,res,()=>{res.writeHead(404);res.end();});});resources.push({api,server});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error();return {api,url:`http://127.0.0.1:${address.port}`};
}
function cookieFrom(response:Response){return response.headers.get('set-cookie')!.split(';')[0];}

it('registers and logs in a local owner account, then scopes office settings',async()=>{
 const f=await setup(),origin=new URL(f.url).origin;
 const invalid=await fetch(f.url+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'ab',password:'short'})});expect(invalid.status).toBe(400);
 const registered=await fetch(f.url+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'Yughoz',displayName:'Yughoz',password:'correct horse'})});expect(registered.status).toBe(201);expect(await registered.json()).toMatchObject({ok:true,user:{login:'yughoz',displayName:'Yughoz',provider:'local'}});const session=cookieFrom(registered);
 const duplicate=await fetch(f.url+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'yughoz',password:'correct horse'})});expect(duplicate.status).toBe(409);
 const me=await (await fetch(f.url+'/api/auth/me',{headers:{Cookie:session}})).json() as {authenticated:boolean;user:{login:string};office:{id:string;slug:string;publicEnabled:boolean}};expect(me).toMatchObject({authenticated:true,user:{login:'yughoz'},office:{id:'default',publicEnabled:true}});
 const created=await fetch(f.url+'/api/device-tokens',{method:'POST',headers:{Origin:origin,Cookie:session,'Content-Type':'application/json'},body:JSON.stringify({label:'Mac owner',provider:'both'})});expect(created.status).toBe(201);expect(await created.json()).toMatchObject({officeId:'default'});
 const changed=await fetch(f.url+'/api/offices/default',{method:'PATCH',headers:{Origin:origin,Cookie:session,'Content-Type':'application/json'},body:JSON.stringify({displayName:'Yughoz Studio',slug:'yughoz-studio',publicEnabled:false})});expect(changed.status).toBe(200);expect(await changed.json()).toMatchObject({office:{slug:'yughoz-studio',publicEnabled:false}});
 expect(((await (await fetch(f.url+'/api/public/offices')).json()) as {items:unknown[]}).items).toHaveLength(0);
 expect((await fetch(f.url+'/api/state?office=yughoz-studio')).status).toBe(401);expect((await fetch(f.url+'/api/state?office=yughoz-studio',{headers:{Cookie:session}})).status).toBe(200);
 const loggedOut=await fetch(f.url+'/api/auth/logout',{method:'POST',headers:{Origin:origin,Cookie:session}});expect(loggedOut.status).toBe(200);expect((await (await fetch(f.url+'/api/auth/me',{headers:{Cookie:session}})).json()).authenticated).toBe(false);
});

it('rejects incorrect local credentials without exposing account details',async()=>{
 const f=await setup(),origin=new URL(f.url).origin;
 await fetch(f.url+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'owner',password:'correct horse'})});
 const wrong=await fetch(f.url+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'owner',password:'wrong pass'})});expect(wrong.status).toBe(401);expect(await wrong.json()).toMatchObject({ok:false,error:'Nama pengguna atau password salah.'});
 const missing=await fetch(f.url+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'missing',password:'wrong pass'})});expect(missing.status).toBe(401);expect(await missing.json()).toMatchObject({ok:false,error:'Nama pengguna atau password salah.'});
});
