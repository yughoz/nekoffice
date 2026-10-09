import type {Point} from './navigation';
export const columns = 5;
export const minimumSeats = 15;
export function seatCount(agentCount:number) {return Math.ceil(Math.max(minimumSeats,agentCount)/columns)*columns;}
export function roomHeight(agentCount:number) {return 116+seatCount(agentCount)/columns*108+46;}
export function station(index:number):Point {return {x:120+(index%columns)*132,y:136+Math.floor(index/columns)*108};}
export function seat(index:number):Point {const desk=station(index);return {x:desk.x,y:desk.y+50};}
const subagentOffsets:Point[]=[{x:-30,y:16},{x:30,y:16},{x:-42,y:38},{x:42,y:38},{x:0,y:52},{x:-58,y:58},{x:58,y:58}];
export function subagentPosition(parent:Point,ordinal:number):Point {const offset=subagentOffsets[Math.max(0,ordinal)%subagentOffsets.length];const ring=Math.floor(Math.max(0,ordinal)/subagentOffsets.length);return {x:parent.x+offset.x*(1+ring*.18),y:parent.y+offset.y+ring*14};}
export function doorway(count:number):Point {return {x:384,y:roomHeight(count)-12};}
export function agentSeed(id:string) {let value=2166136261;for(const c of id)value=Math.imul(value^c.charCodeAt(0),16777619);return value>>>0;}
