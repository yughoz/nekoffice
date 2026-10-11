import {expect,it} from 'vitest';
import {ApiMirror} from './mirror';

it('forwards API writes to the configured target with its own token',async()=>{
 const calls:Array<{url:string;headers:Headers;body:string}>=[];
 const mirror=new ApiMirror({url:'https://holding.neko.my.id/',token:'b'.repeat(64),fetchImpl:async(input,init)=>{
  calls.push({url:String(input),headers:new Headers(init?.headers),body:String(init?.body)});
  return new Response('{}',{status:200});
 }});
 await mirror.forward('/api/hermes/heartbeat',{version:1,sequence:1});
 expect(calls[0].url).toBe('https://holding.neko.my.id/api/hermes/heartbeat');
 expect(calls[0].headers.get('authorization')).toBe('Bearer '+'b'.repeat(64));
 expect(calls[0].headers.get('x-nekoffice-mirror')).toBe('1');
 expect(JSON.parse(calls[0].body)).toEqual({version:1,sequence:1});
 expect(mirror.getStatus()).toMatchObject({enabled:true,target:'https://holding.neko.my.id',forwarded:1,failed:0});
});

it('serializes writes and records target failures without rejecting the API caller',async()=>{
 const order:string[]=[];
 const mirror=new ApiMirror({url:'https://holding.neko.my.id',token:'c'.repeat(64),fetchImpl:async(input)=>{order.push(String(input).split('/').pop()!);if(order.length===1)throw new Error('offline');return new Response('{}',{status:200});}});
 await mirror.forward('/api/agents',{id:'one'});
 await mirror.forward('/api/events',{type:'office.reset'});
 expect(order).toEqual(['agents','events']);
 expect(mirror.getStatus()).toMatchObject({forwarded:1,failed:1,lastError:null});
});
