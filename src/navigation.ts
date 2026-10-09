import {roomHeight,seatCount,station} from './officeLayout';
export interface Point {x:number;y:number;}
const size=8,cols=96;
// One open floor. Desktops are solid; chairs are walkable destinations.
export function isWalkable(x:number,y:number,count=15) {
 const height=roomHeight(count);
 if(x>=358&&x<=410&&y>=height-44&&y<=height-8)return true;
 if(x<38||x>730||y<96||y>height-24)return false;
 for(let i=0;i<seatCount(count);i++){const p=station(i);if(x>p.x-49&&x<p.x+49&&y>p.y-24&&y<p.y+31)return false;}
 return true;
}
function nearest(p:Point,count:number):number {
 let best=-1,d=Infinity;const rows=Math.ceil(roomHeight(count)/size);
 for(let i=0;i<cols*rows;i++){const x=i%cols*size+4,y=Math.floor(i/cols)*size+4;if(isWalkable(x,y,count)){const d2=(p.x-x)**2+(p.y-y)**2;if(d2<d){d=d2;best=i;}}}
 return best;
}
export function findPath(from:Point,to:Point,count=15):Point[] {
 const start=nearest(from,count),end=nearest(to,count),rows=Math.ceil(roomHeight(count)/size);if(start<0||end<0)return [];
 const queue=[start],parent=new Map<number,number>([[start,-1]]);
 for(let cursor=0;cursor<queue.length;cursor++){const current=queue[cursor];if(current===end)break;const x=current%cols,y=Math.floor(current/cols);
  for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const next=ny*cols+nx;if(nx<0||nx>=cols||ny<0||ny>=rows||parent.has(next)||!isWalkable(nx*size+4,ny*size+4,count))continue;parent.set(next,current);queue.push(next);}
 }
 if(!parent.has(end))return [];
 const path:Point[]=[];for(let current=end;current!==start;current=parent.get(current)!){path.push({x:current%cols*size+4,y:Math.floor(current/cols)*size+4});}
 return path.reverse();
}
