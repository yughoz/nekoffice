import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,it,expect} from 'vitest';
import {OfficeHistory} from './history';

const folders:string[]=[];
afterEach(()=>{for(const folder of folders.splice(0))rmSync(folder,{recursive:true,force:true});});

it('persists completed intervals and reloads them after a server restart',()=>{
 const folder=mkdtempSync(join(tmpdir(),'nekoffice-history-'));folders.push(folder);const file=join(folder,'history.json');
 const agent={id:'codex-project',name:'yt-office-codex',role:'Codex · Desktop',team:'production',room:'production',revision:1,status:'working',task:'Mengubah file'} as const;
 let now=1000;const first=new OfficeHistory(file,()=>now);first.update(agent,true);now=2500;first.update({...agent,status:'done'},false,'completed');
 expect(JSON.parse(readFileSync(file,'utf8'))).toHaveLength(1);
 expect(new OfficeHistory(file,()=>now).list().items[0]).toMatchObject({name:agent.name,durationMs:1500,reason:'completed'});
});
