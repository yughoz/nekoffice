import Phaser from 'phaser';
import {roomInfo,statusInfo,type OfficeAgent,type OfficeSnapshot,type Room} from './officeModel';
import {findPath,type Point} from './navigation';
import {seat,station,seatCount,doorway,agentSeed} from './officeLayout';
import {drawOpenOffice,drawScreen} from './openOfficeArt';
interface AtlasManifest {frame_layout:{rows:Record<string,{x:number;y:number;w:number;h:number}[]>};animation:{rows:Record<string,{fps:number;loop:boolean}>};}
interface VisualAgent {root:Phaser.GameObjects.Container;body:Phaser.GameObjects.Sprite;ring:Phaser.GameObjects.Ellipse;badge:Phaser.GameObjects.Arc;name:Phaser.GameObjects.Text;bubble:Phaser.GameObjects.Text;path:Point[];action:string;signature:string;team:Room;hands:Phaser.GameObjects.Container[];chair:Phaser.GameObjects.Container;seatIndex:number;phase:'entering'|'working'|'leaving'|'gone';pace:number;}
export interface SceneView {snapshot:OfficeSnapshot;paused:boolean;selected:string|null;reducedMotion:boolean;}
export interface SceneBridge {view:SceneView;select:(id:string)=>void;ready:()=>void;error:(message:string)=>void;followChanged:(value:boolean)=>void;}
export class OfficeScene extends Phaser.Scene {
 bridge:SceneBridge;avatars=new Map<string,VisualAgent>();followed?:string;epoch='';panStart?:Point;cameraStart?:Point;manifest?:AtlasManifest;fitZoom=1;selecting=false;lastWidth=0;lastHeight=0;locations=new Map<string,number>();art?:ReturnType<typeof drawOpenOffice>;capacity=0;motionTime=0;screenSignature='';
 constructor(bridge:SceneBridge){super('office');this.bridge=bridge;}
 preload(){this.load.json('worker-manifest','/assets/worker.manifest.json');for(const team of Object.keys(roomInfo))this.load.image(`worker-${team}`,`/assets/worker-${team}.png`);this.load.on('loaderror',()=>this.bridge.error('Aset kantor belum bisa dimuat. Coba muat ulang.'));}
 create(){
  this.rebuildOffice(15);this.manifest=this.cache.json.get('worker-manifest');if(!this.manifest?.frame_layout?.rows){this.bridge.error('Manifest animasi tidak valid.');return;}
  for(const team of Object.keys(roomInfo)){const texture=this.textures.get(`worker-${team}`);for(const [state,frames] of Object.entries(this.manifest.frame_layout.rows)){frames.forEach((r,i)=>texture.add(`${state}-${i}`,0,r.x,r.y,r.w,r.h));this.anims.create({key:`${team}-${state}`,frames:frames.map((_,i)=>({key:`worker-${team}`,frame:`${state}-${i}`})),frameRate:this.manifest.animation?.rows[state]?.fps||6,repeat:state==='celebrate'?0:-1});}}
  this.fit();this.scale.on('resize',this.onResize,this);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(this.selecting){this.selecting=false;return;}this.panStart={x:p.x,y:p.y};this.cameraStart={x:this.cameras.main.scrollX,y:this.cameras.main.scrollY};});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(!p.isDown||!this.panStart||!this.cameraStart)return;if(Math.hypot(p.x-this.panStart.x,p.y-this.panStart.y)>4){this.stopFollow();this.cameras.main.setScroll(this.cameraStart.x-(p.x-this.panStart.x)/this.cameras.main.zoom,this.cameraStart.y-(p.y-this.panStart.y)/this.cameras.main.zoom);}});
  this.input.on('pointerup',()=>{this.panStart=undefined;this.cameraStart=undefined;});this.input.on('wheel',(_p:unknown,_g:unknown,_dx:number,dy:number)=>this.zoom(dy>0?-.1:.1));this.input.keyboard?.on('keydown-ESC',()=>this.stopFollow());
  this.game.canvas.setAttribute('aria-label','Kantor animasi. Agent juga dapat dipilih melalui tombol Daftar agent.');this.bridge.ready();
 }
 onResize(){if(this.scale.width!==this.lastWidth||this.scale.height!==this.lastHeight)this.fit();}
 fit(){if(!this.cameras?.main)return;this.lastWidth=this.scale.width;this.lastHeight=this.scale.height;this.fitZoom=Math.min(this.scale.width/810,this.scale.height/((this.art?.height||486)+38));this.cameras.main.setZoom(this.fitZoom).centerOn(384,(this.art?.height||486)/2);this.stopFollow();}
 zoom(amount:number){this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom+amount,this.fitZoom*.8,this.fitZoom*2.8));}
 follow(id:string){const avatar=this.avatars.get(id);if(!avatar||avatar.phase==='gone')return;this.followed=id;this.cameras.main.startFollow(avatar.root,true,.08,.08);this.cameras.main.setZoom(Math.max(this.fitZoom*1.65,this.cameras.main.zoom));this.bridge.followChanged(true);}
 stopFollow(){this.cameras.main.stopFollow();this.followed=undefined;this.bridge.followChanged(false);}
 rebuildOffice(count:number){this.art?.group.destroy(true);this.capacity=seatCount(count);this.art=drawOpenOffice(this,count);this.screenSignature='';this.fit();}
 stationIndex(agent:OfficeAgent){if(!this.locations.has(agent.id)){const used=new Set(this.locations.values());const preferred=agent.seatIndex;let i=Number.isInteger(preferred)&&preferred!<64&&!used.has(preferred as number)?preferred as number:0;while(used.has(i))i++;this.locations.set(agent.id,i);}return this.locations.get(agent.id)!;}
 home(agent:OfficeAgent){return agent.position||seat(this.stationIndex(agent));}
 addAgent(agent:OfficeAgent){const p=doorway(this.capacity);p.x+=agentSeed(agent.id)%17-8;const root=this.add.container(p.x,p.y),color=Phaser.Display.Color.HexStringToColor(roomInfo[agent.team].color).color;
  const shadow=this.add.ellipse(0,-2,23,7,0x382718,.18),ring=this.add.ellipse(0,-2,30,11).setStrokeStyle(2,color).setVisible(false),body=this.add.sprite(0,3,`worker-${agent.team}`,'idle-0').setOrigin(.5,1).setScale(.85),badge=this.add.circle(13,-30,2.6,statusInfo[agent.status].color).setStrokeStyle(1,0xfffaf0),name=this.add.text(0,7,agent.name,{fontFamily:'Arial, sans-serif',fontSize:'10px',color:'#514833',backgroundColor:'#fff9e9dd',padding:{x:4,y:2}}).setOrigin(.5,0),bubble=this.add.text(0,-58,'',{fontFamily:'Arial, sans-serif',fontSize:'8px',color:'#657452',backgroundColor:'#fffef2ee',padding:{x:5,y:3},wordWrap:{width:104}}).setOrigin(.5,1).setVisible(false);
  if(agent.avatarStyle!==undefined)body.setTint([0xffffff,0xffeee3,0xe7f0ff,0xf3e9ff,0xfff1c7,0xe5f5e8,0xffe6f0,0xe5f0f5][agent.avatarStyle%8]);
  root.add([shadow,ring,body,badge,name,bubble]);root.setSize(45,60).setInteractive(new Phaser.Geom.Rectangle(-24,-52,48,70),Phaser.Geom.Rectangle.Contains);root.on('pointerover',()=>{ring.setVisible(true);this.game.canvas.style.cursor='pointer';});root.on('pointerout',()=>{ring.setVisible(this.bridge.view.selected===agent.id);this.game.canvas.style.cursor='grab';});root.on('pointerdown',()=>{this.selecting=true;this.bridge.select(agent.id);});const hands=[-12,12].map(x=>this.add.container(x,-25,[this.add.rectangle(0,4,5,9,color),this.add.rectangle(0,0,5,4,0xd4b387)]));
  const chair=this.add.container(0,0,[this.add.rectangle(0,1,25,11,0x748867),this.add.rectangle(0,-4,27,4,0x93a07e)]);root.add([...hands,chair]);hands.forEach(h=>h.setVisible(false));chair.setVisible(false);body.play(`${agent.team}-idle`);
  const visual:VisualAgent={root,body,ring,badge,name,bubble,path:[],action:'idle',signature:'',team:agent.team,hands,chair,seatIndex:this.stationIndex(agent),phase:agent.status==='done'?'gone':'entering',pace:52+agentSeed(agent.id)%15};root.setVisible(visual.phase!=='gone');root.setAlpha(.4);this.avatars.set(agent.id,visual);return visual;
 }
 update(_time:number,delta:number){if(!this.manifest)return;const view=this.bridge.view;
  if(view.snapshot.epoch!==this.epoch){this.epoch=view.snapshot.epoch;for(const a of this.avatars.values())a.root.destroy();this.avatars.clear();this.locations.clear();this.rebuildOffice(view.snapshot.agents.length);}
  for(const [id,a] of this.avatars)if(!view.snapshot.agents.some(agent=>agent.id===id)){a.root.destroy();this.avatars.delete(id);this.locations.delete(id);if(this.followed===id)this.stopFollow();}
  const count=Math.max(view.snapshot.agents.length,...[...this.locations.values()].map(i=>i+1));if(seatCount(count)!==this.capacity)this.rebuildOffice(count);
  if(!view.paused&&!view.reducedMotion)this.motionTime+=delta;
  const occupied=new Map(view.snapshot.agents.map(agent=>[this.stationIndex(agent),agent]));
  const screenSignature=`${view.snapshot.epoch}/${view.snapshot.revision}/${Math.floor(this.motionTime/180)}/${view.reducedMotion}/${[...this.avatars.values()].map(a=>`${a.phase}/${a.path.length>0}`).join(',')}`;
  if(screenSignature!==this.screenSignature){this.screenSignature=screenSignature;this.art?.computers.forEach((computer,i)=>{const p=station(i),agent=occupied.get(i),a=agent&&this.avatars.get(agent.id),active=agent?.status==='working'&&!agent.position&&a?.phase==='working'&&!a.path.length;drawScreen(computer,p.x,p.y,!!active,view.reducedMotion?0:Math.floor(this.motionTime/180)+i*3);});}
  for(const agent of view.snapshot.agents){let a=this.avatars.get(agent.id);if(a&&a.team!==agent.team){a.root.destroy();this.avatars.delete(agent.id);a=undefined;}a??=this.addAgent(agent);
   if(agent.status==='done'&&a.phase!=='gone'&&a.phase!=='leaving')a.phase='leaving';
   if((agent.status==='working'||agent.status==='thinking')&&(a.phase==='gone'||a.phase==='leaving')){
    if(a.phase==='gone'){const entry=doorway(this.capacity);a.root.setPosition(entry.x,entry.y).setVisible(true).setAlpha(.4);}
    a.phase='entering';
   }
   if(a.phase==='gone'){a.root.setVisible(false);continue;}
   const home=this.home(agent),goal=a.phase==='leaving'?doorway(this.capacity):home,signature=`${a.phase}/${goal.x}/${goal.y}`;
   if(signature!==a.signature){a.signature=signature;a.path=findPath({x:a.root.x,y:a.root.y},goal,count);}
   if(view.reducedMotion&&a.path.length){const end=a.path.at(-1)!;a.root.setPosition(end.x,end.y);a.path=[];}
   let animation=agent.status==='done'?'celebrate':'idle';
   if(a.path.length&&!view.reducedMotion){animation=a.action.startsWith('walk')?a.action:'walk_down';if(!view.paused){const p=a.path[0],dx=p.x-a.root.x,dy=p.y-a.root.y,d=Math.hypot(dx,dy),step=Math.min(d,delta/1000*a.pace);a.root.x+=d?dx/d*step:0;a.root.y+=d?dy/d*step:0;if(Math.abs(dx)>Math.abs(dy)){animation='walk_side';a.body.setFlipX(dx<0);}else{animation=dy<0?'walk_up':'walk_down';a.body.setFlipX(false);}if(d<2||step>=d)a.path.shift();}}else a.body.setFlipX(false);
   if(!view.paused){const remaining=Math.hypot(a.root.x-goal.x,a.root.y-goal.y);a.root.setAlpha(a.phase==='leaving'?Math.min(1,remaining/18):Math.min(1,a.root.alpha+delta/350));}
   if(!a.path.length&&a.phase==='leaving'){a.phase='gone';a.root.setVisible(false);if(this.followed===agent.id)this.stopFollow();continue;}
   if(!a.path.length&&a.phase==='entering')a.phase='working';
   const seated=a.phase==='working'&&!agent.position&&!a.path.length&&Math.hypot(a.root.x-home.x,a.root.y-home.y)<9&&agent.status!=='done';
   const typing=seated&&agent.status==='working';a.chair.setVisible(seated);a.body.setCrop(0,0,48,seated?38:48);
   if(seated){animation='seated';a.body.anims.stop();a.body.setFrame('walk_up-0');a.body.setFlipX(false);a.body.setY(3+(typing&&!view.reducedMotion?Math.floor(this.motionTime/320+a.seatIndex)%2:0));}else a.body.setY(3);
   const activity=agent.activityCode==='thinking'||agent.status==='thinking'?'Berpikir':agent.activityCode==='waiting'||agent.status==='waiting'?'Menunggu':agent.activityCode==='test'?'Menjalankan tes':agent.activityCode==='edit'?'Mengubah file':agent.activityCode==='research'?'Membaca referensi':agent.activityCode==='command'?'Menjalankan perintah':agent.status==='error'?'Perlu perhatian':agent.status==='working'?'Bekerja':'';
   a.bubble.setText(activity);a.bubble.setVisible(seated&&Boolean(activity)&&!view.reducedMotion);a.bubble.setY(agent.status==='waiting'&&!view.reducedMotion? -61 : -58);
   a.hands.forEach((hand,i)=>{hand.setVisible(typing);hand.y=-25+(typing&&!view.reducedMotion?Math.floor(this.motionTime/110+a.seatIndex+i)%2*2:0);});
   if(animation!==a.action){a.action=animation;if(animation!=='seated')a.body.play(`${agent.team}-${animation}`,true);}if(!seated){if(view.paused||view.reducedMotion)a.body.anims.pause();else a.body.anims.resume();}a.name.setText(agent.name);a.badge.setFillStyle(statusInfo[agent.status].color);a.ring.setVisible(view.selected===agent.id);a.root.setDepth(a.root.y+50);
  }
  if(this.followed&&view.selected&&this.followed!==view.selected)this.follow(view.selected);
 }
}
