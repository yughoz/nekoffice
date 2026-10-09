import Phaser from 'phaser';

type LabelKind = 'name' | 'activity' | 'group' | 'door';
export type SceneLabel = Phaser.GameObjects.DOMElement & {node:HTMLElement;baseFontSize:number};
const fontSizes:Record<LabelKind,number>={name:12,activity:11,group:10,door:9};

// Keep text in the browser's font renderer instead of enlarging a pixel texture.
export function sceneLabel(scene:Phaser.Scene,x:number,y:number,text:string,kind:LabelKind):SceneLabel {
 const node=document.createElement('span');
 node.className=`scene-label scene-label--${kind}`;
 node.textContent=text;
 node.style.fontSize=`${fontSizes[kind]}px`;
 const label=scene.add.dom(x,y,node) as SceneLabel;
 label.baseFontSize=fontSizes[kind];
 label.pointerEvents='none';
 return label;
}

export function syncSceneLabel(label:SceneLabel,text:string,zoom:number,depth:number) {
 const node=label.node;
 const fontSize=`${Math.round(label.baseFontSize*Phaser.Math.Clamp(zoom,1,1.65)*10)/10}px`;
 const changed=node.textContent!==text||node.style.fontSize!==fontSize;
 if(changed){
  node.textContent=text;
  node.style.fontSize=fontSize;
  // Hidden DOM elements report zero size; measure only when content/zoom changes.
  const display=node.style.display;
  node.style.display='block';
  label.updateSize();
  node.style.display=display;
 }
 // The font itself changes size; cancel camera scaling to avoid bitmap compositing.
 label.setScale(1/zoom).setDepth(depth);
}
