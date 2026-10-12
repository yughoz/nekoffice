import {describe,expect,it} from 'vitest';
import {VIEWER_TTL_MS,ViewerRegistry} from './viewers';

describe('ViewerRegistry expiry',()=>{
 it('keeps a viewer alive when it heartbeats and prunes it after the TTL',()=>{
  let now=10_000;
  const registry=new ViewerRegistry(()=>now,3),created=registry.create({name:'Satu',avatarStyle:0,position:{x:384,y:440}});
  now+=VIEWER_TTL_MS-1;
  expect(registry.prune()).toEqual([]);
  expect(registry.update(created.token,{x:390,y:440},'right',true)?.lastSeenAt).toBe(now);
  now+=VIEWER_TTL_MS-1;
  expect(registry.prune()).toEqual([]);
  now+=2;
  expect(registry.prune()).toEqual([created.viewer.id]);
  expect(registry.authenticate(created.token)).toBeNull();
 });
});
