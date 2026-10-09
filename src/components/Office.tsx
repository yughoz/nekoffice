import {useEffect,useRef,useState} from 'react';
import Phaser from 'phaser';
import {Crosshair,Maximize2,Minus,Plus} from 'lucide-react';
import {OfficeScene,type SceneBridge,type SceneView} from '../OfficeScene';
export default function Office({view,onSelect}:{view:SceneView;onSelect:(id:string)=>void}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<OfficeScene|null>(null),bridge=useRef<SceneBridge>(null!);const [ready,setReady]=useState(false),[error,setError]=useState(''),[following,setFollowing]=useState(false);
 if(!bridge.current)bridge.current={view,select:onSelect,ready:()=>setReady(true),error:setError,followChanged:setFollowing};bridge.current.view=view;bridge.current.select=onSelect;
 useEffect(()=>{const s=new OfficeScene(bridge.current);scene.current=s;const game=new Phaser.Game({type:Phaser.AUTO,parent:host.current!,backgroundColor:'#f6eedb',pixelArt:true,antialias:false,roundPixels:true,scene:[s],scale:{mode:Phaser.Scale.RESIZE,width:host.current!.clientWidth,height:host.current!.clientHeight},audio:{noAudio:true}});return()=>{game.destroy(true);scene.current=null;};},[]);
 return <div className="office-stage"><div ref={host} className="game-host"/>{!ready&&!error&&<div className="stage-loading">Membuka kantor…</div>}{error&&<div className="stage-loading">{error}</div>}<div className="camera-controls"><button aria-label="Perkecil" title="Perkecil" onClick={()=>scene.current?.zoom(-.15)}><Minus size={16}/></button><button aria-label="Perbesar" title="Perbesar" onClick={()=>scene.current?.zoom(.15)}><Plus size={16}/></button><button aria-label="Reset kamera" title="Seluruh kantor" onClick={()=>scene.current?.fit()}><Maximize2 size={15}/></button>{view.selected&&<button className={following?'active':''} aria-label="Ikuti agent terpilih" title="Ikuti agent" onClick={()=>following?scene.current?.stopFollow():scene.current?.follow(view.selected!)}><Crosshair size={16}/></button>}</div></div>;
}
