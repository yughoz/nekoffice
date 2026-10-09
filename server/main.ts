import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOfficeApi} from './api.js';

const token=process.env.OFFICE_API_TOKEN;
if(!token||token.length<32||token.startsWith('replace-with-'))throw new Error('Set OFFICE_API_TOKEN to a random secret of at least 32 characters.');
const port=Number(process.env.PORT??3000),host=process.env.HOST??'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT.');
const root=resolve(fileURLToPath(new URL('../../dist/',import.meta.url)));
await stat(resolve(root,'index.html')).catch(()=>{throw new Error('Build the browser client first: npm run build');});
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.md':'text/markdown; charset=utf-8','.ico':'image/x-icon'};
async function staticFile(req:IncomingMessage,res:ServerResponse){
 if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405);res.end();return;}
 let path:string;try{path=decodeURIComponent((req.url??'/').split('?')[0]);}catch{res.writeHead(400);res.end();return;}
 const filename=resolve(root,'.'+(path==='/'?'/index.html':path));
 if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 try{const info=await stat(filename);if(!info.isFile())throw new Error();const data=await readFile(filename);res.writeHead(200,{'Content-Type':mime[extname(filename)]??'application/octet-stream','Content-Length':data.length,'Cache-Control':path.startsWith('/assets/')&&/[-][a-zA-Z0-9_-]{8,}\./.test(path)?'public,max-age=31536000,immutable':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}
 catch{res.writeHead(404);res.end('Not found');}
}
const dataDir=process.env.OFFICE_DATA_DIR;
const api=createOfficeApi({token,historyPath:dataDir?join(dataDir,'history.json'):undefined});
const server=createServer((req,res)=>{void api.middleware(req,res,()=>{void staticFile(req,res);});});
server.requestTimeout=15000;server.headersTimeout=10000;
api.start();server.listen(port,host,()=>console.log(`Little Office server: http://${host}:${port}`));
function shutdown(){api.close();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
