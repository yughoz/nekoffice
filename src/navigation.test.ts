import {it,expect} from 'vitest';
import {findPath,isWalkable} from './navigation';
import {seat,station,seatCount,roomHeight,doorway} from './officeLayout';
it('assigns unique computer seats and connects rows through the open floor',()=>{
 const points=Array.from({length:15},(_,i)=>seat(i));
 expect(new Set(points.map(p=>`${p.x}/${p.y}`)).size).toBe(15);
 for(let i=0;i<15;i++){const home=points[i],desk=station(i);expect(isWalkable(home.x,home.y)).toBe(true);expect(isWalkable(desk.x,desk.y)).toBe(false);const path=findPath(doorway(15),home);expect(path.length).toBeGreaterThan(0);expect(path.every(p=>isWalkable(p.x,p.y))).toBe(true);}
});
it('adds computer rows for large teams without reassigning existing seats',()=>{
 expect(seatCount(64)).toBe(65);expect(seat(63).y).toBeLessThan(roomHeight(64));expect(isWalkable(seat(63).x,seat(63).y,64)).toBe(true);expect(findPath(seat(0),seat(63),64).length).toBeGreaterThan(0);
});

it('routes a completed worker back through the entrance',()=>{for(let i=0;i<15;i++){const path=findPath(seat(i),doorway(15));expect(path.length).toBeGreaterThan(0);expect(path.every(p=>isWalkable(p.x,p.y))).toBe(true);const last=path.at(-1)!;expect(Math.hypot(last.x-doorway(15).x,last.y-doorway(15).y)).toBeLessThan(8);}});
