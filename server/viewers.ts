import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import type {OfficeViewer,ViewerDirection} from '../src/officeModel.js';

export const VIEWER_TTL_MS=45_000;
export const VIEWER_LIMIT=3;

type Session={tokenHash:Buffer;viewer:OfficeViewer};

function hash(token:string){return createHash('sha256').update(token).digest();}

export class ViewerRegistry {
 private sessions=new Map<string,Session>();
 constructor(private readonly now=Date.now,private readonly limit=VIEWER_LIMIT){}
 create(input:{name:string;avatarStyle:number;position:{x:number;y:number}}){
  if(this.sessions.size>=this.limit)throw new Error('Viewer capacity is full.');
  const token=randomBytes(32).toString('hex'),id=randomUUID(),viewer:OfficeViewer={id,name:input.name,avatarStyle:input.avatarStyle,position:input.position,direction:'down',moving:false,lastSeenAt:this.now()};
  this.sessions.set(id,{tokenHash:hash(token),viewer});return {viewer,token};
 }
 authenticate(token:string){const presented=hash(token);for(const [id,session] of this.sessions){if(session.tokenHash.length===presented.length&&timingSafeEqual(session.tokenHash,presented))return {id,viewer:structuredClone(session.viewer)};}return null;}
 update(token:string,position:{x:number;y:number},direction:ViewerDirection,moving:boolean,note?:string){const match=this.authenticate(token);if(!match)return null;const session=this.sessions.get(match.id)!;session.viewer={...session.viewer,position,direction,moving,...(note!==undefined?{note}:{}),lastSeenAt:this.now()};return structuredClone(session.viewer);}
 remove(token:string){const match=this.authenticate(token);if(!match)return null;this.sessions.delete(match.id);return match.viewer;}
 prune(){const removed:string[]=[];const cutoff=this.now()-VIEWER_TTL_MS;for(const [id,session] of this.sessions){if(session.viewer.lastSeenAt<cutoff){this.sessions.delete(id);removed.push(id);}}return removed;}
 clear(){this.sessions.clear();}
}
