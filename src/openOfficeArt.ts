import Phaser from 'phaser';
import {roomHeight,seatCount,station} from './officeLayout';
export interface Computer {screen:Phaser.GameObjects.Graphics;cursor:Phaser.GameObjects.Rectangle;}
export function drawOpenOffice(scene:Phaser.Scene,count:number) {
 const group=scene.add.container(0,0),g=scene.add.graphics();group.add(g);
 const box=(x:number,y:number,w:number,h:number,color:number)=>{g.fillStyle(color,1).fillRect(x,y,w,h);};
 const height=roomHeight(count);
 box(18,23,736,height-20,0xd9cbb2);box(24,16,720,height-24,0x78654e);box(30,22,708,height-36,0xf0e5cb);
 box(36,84,696,height-110,0xc9a278);
 for(let y=84;y<height-26;y+=20){box(36,y,696,2,0xb58c64);for(let x=36+(y%40?0:50);x<730;x+=100)box(x,y,1,20,0xb88f67);box(40,y+3,682,1,0xd4b18a);}
 box(30,76,708,8,0x8d7355);box(36,76,696,3,0xa48a66);
 // Three large windows, warm walls and small hanging lamps.
 for(const x of [142,338,534]){box(x,29,90,43,0x937c5d);box(x+4,33,82,34,0xb9d4cd);box(x+8,38,32,23,0xd9e9d9);box(x+47,38,34,23,0xd3e5d9);box(x+43,33,4,34,0xf1e9d1);box(x-4,69,98,5,0xb69c75);box(x+32,22,24,4,0xd8bb7f);}
 function plant(x:number,y:number){box(x-8,y,17,12,0x936b50);box(x-10,y-2,21,5,0xc69b75);box(x-1,y-28,3,29,0x6f8050);for(const [dx,dy] of [[-13,-20],[2,-28],[-9,-34],[5,-17]]){box(x+dx,y+dy,10,10,0x68805b);box(x+dx+2,y+dy,6,4,0x91a16d);}}
 plant(65,70);plant(703,70);plant(63,height-43);plant(705,height-43);
 // A shelf and a little coffee corner at the far wall.
 box(270,31,36,38,0x9b7d58);box(274,35,28,12,0xc3a177);box(274,51,28,13,0xc3a177);for(let i=0;i<6;i++)box(275+i*4,39,3,8,[0x698477,0xb77e66,0xb5ad81][i%3]);
 box(458,48,49,23,0xa98a62);box(463,37,19,19,0x5f6158);box(466,40,13,8,0x303d35);box(490,52,7,8,0xf6edda);
 // One entrance at the bottom: open jamb, threshold and a welcome mat.
 box(350,height-39,68,39,0x78654e);box(356,height-37,56,37,0xc9a278);box(356,height-4,56,4,0xe6c9a0);box(347,height-39,6,39,0xb89a72);box(415,height-39,6,39,0xb89a72);
 g.fillStyle(0x8b7151).fillPoints([{x:350,y:height-36},{x:337,y:height-28},{x:337,y:height+2},{x:350,y:height-4}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
 g.fillStyle(0xb79970).fillPoints([{x:347,y:height-32},{x:341,y:height-28},{x:341,y:height-3},{x:347,y:height-6}].map(p=>new Phaser.Math.Vector2(p.x,p.y)),true);
 group.add(scene.add.text(384,height-69,'PINTU',{fontFamily:'Arial, sans-serif',fontSize:'6px',fontStyle:'bold',color:'#6d7056'}).setOrigin(.5));
 box(357,height-56,54,15,0x9eaa82);box(361,height-53,46,9,0xb5be98);
 const computers:Computer[]=[];
 for(let i=0;i<seatCount(count);i++){
  const {x,y}=station(i);
  box(x-47,y+24,100,11,0xb18a62);box(x-45,y-20,94,49,0x8a7155);box(x-48,y-23,96,47,0xdbbc8d);box(x-46,y-21,92,3,0xf0d4a4);box(x-43,y+25,7,11,0x8d7254);box(x+37,y+25,7,11,0x8d7254);
  box(x-28,y-25,56,33,0x46524c);box(x-25,y-22,50,27,0x293e36);box(x-2,y+8,5,8,0x60675a);box(x-13,y+15,27,3,0x626a5c);
  box(x-21,y+21,42,10,0x8f9685);box(x-19,y+22,38,7,0xd9d7bc);for(let k=0;k<9;k++)box(x-17+k*4,y+23,2,2,0x919984);box(x-9,y+27,18,1,0x9b9f8b);
  box(x+28,y+23,6,8,0xe5dfc7);box(x-38,y+8,9,10,0xf7ebd0);box(x-35,y+7,3,2,0x927758);
  // Empty chairs. Occupied chairs get a front layer over the sprite's legs.
  box(x-13,y+43,27,19,0x8a9678);box(x-15,y+48,31,7,0x697c61);box(x-10,y+62,3,6,0x6b6b59);box(x+8,y+62,3,6,0x6b6b59);
  const screen=scene.add.graphics(),cursor=scene.add.rectangle(x-19,y-15,2,5,0xb9d7a0).setOrigin(0);group.add([screen,cursor]);computers.push({screen,cursor});
 }
 return {group,computers,height};
}
export function drawScreen(computer:Computer,x:number,y:number,active:boolean,phase:number) {
 const g=computer.screen;g.clear();g.fillStyle(active?0x8aaf87:0x596d5e);
 for(let row=0;row<3;row++){const width=active?9+((phase+row*7)%26):[24,16,20][row];g.fillRect(x-20,y-17+row*6,width,2);}
 computer.cursor.setPosition(x-20+(phase%26),y-4).setVisible(active&&phase%4<3);
}
