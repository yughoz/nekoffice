import type {Point} from './navigation';
export const columns = 5;
export const minimumSeats = 15;
export function seatCount(agentCount:number) {return Math.ceil(Math.max(minimumSeats,agentCount)/columns)*columns;}
export function roomHeight(agentCount:number) {return 116+seatCount(agentCount)/columns*108+46;}
export function station(index:number):Point {return {x:120+(index%columns)*132,y:136+Math.floor(index/columns)*108};}
export function seat(index:number):Point {const desk=station(index);return {x:desk.x,y:desk.y+50};}
export function doorway(count:number):Point {return {x:384,y:roomHeight(count)-12};}
export function agentSeed(id:string) {let value=2166136261;for(const c of id)value=Math.imul(value^c.charCodeAt(0),16777619);return value>>>0;}
