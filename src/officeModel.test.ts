import {it,expect} from 'vitest';
import {demoSnapshot} from './officeModel';
it('staggers arrivals and finishes independently, then rests between jobs',()=>{
 const firstSeen=new Map<string,number>(),finished=new Set<string>(),departed=new Set<string>(),previous=new Map<string,string>();
 for(let tick=0;tick<150;tick++){
  const snapshot=demoSnapshot(tick),present=new Set(snapshot.agents.map(a=>a.id));
  for(const [id,status] of previous)if(!present.has(id)&&status==='done')departed.add(id);
  for(const agent of snapshot.agents){if(!firstSeen.has(agent.id)){firstSeen.set(agent.id,tick);expect(agent.status).toBe('working');}if(agent.status==='done'){expect(previous.has(agent.id)).toBe(true);finished.add(agent.id);}previous.set(agent.id,agent.status);}
 }
 expect(firstSeen.size).toBe(13);expect(new Set(firstSeen.values()).size).toBeGreaterThan(3);expect(finished.size).toBe(13);expect(departed.size).toBe(13);
});
