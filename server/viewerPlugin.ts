import type {Plugin} from 'vite';
import {createOfficeApi} from './api.js';
import {HermesBridge} from './hermesBridge.js';
export function viewerPlugin():Plugin {
 const api=createOfficeApi({token:process.env.OFFICE_API_TOKEN,deviceTokensPath:process.env.OFFICE_DATA_DIR?`${process.env.OFFICE_DATA_DIR}/device-tokens.json`:'.little-office-device-tokens.json',localHealth:()=>bridge.getHealth()});
 const bridge=new HermesBridge(api.store,api.publish);
 function cleanup(){bridge.stop();api.close();}
 return {name:'little-office-display-api',
  configureServer(server){api.start();bridge.start();server.httpServer?.once('close',cleanup);server.middlewares.use((req,res,next)=>{void api.middleware(req,res,next);});},
  configurePreviewServer(server){api.start();bridge.start();server.httpServer.once('close',cleanup);server.middlewares.use((req,res,next)=>{void api.middleware(req,res,next);});},
  closeBundle:cleanup};
}
