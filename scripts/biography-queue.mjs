// Deterministic research queue. This script does NOT publish unverified facts.
import fs from 'node:fs';
const slug=s=>s.replace(/ & family$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const base=fs.readFileSync('data/forbes2026-top200.psv','utf8').trim().split('\n').map(l=>l.split('|'));
const curated=JSON.parse(fs.readFileSync('data/curated.json','utf8'));
const researched=JSON.parse(fs.readFileSync('data/biographies-research.json','utf8')).profiles;
const people=base.map(([rank,name,nw,age,country,sector])=>({id:slug(name),name:name.replace(/ & family$/,''),rank:+rank,sector,country,nw:Number(nw)}));
for(const [id,record] of Object.entries(curated)){if(record.extra)people.push({id,name:record.name,rank:null,sector:record.ind,country:record.country,nw:record.nw});}
const seen={};for(const p of people){if(seen[p.id])p.id+='-'+(++seen[p.id]);else seen[p.id]=1;}
const dossiers=new Set(['elon-musk','thomas-frist-jr']);
const queue=people.map(p=>{
 const evidence=researched[p.id];
 const sections=(evidence?.sections.length||0)+(dossiers.has(p.id)?1:0);
 return {id:p.id,name:p.name,rank:p.rank,sector:p.sector,country:p.country,
  status:evidence?'initial_research':dossiers.has(p.id)?'legacy_biography':'research_required',
  sourceAnchoredChapters:evidence?.sections.length||0,sourceAnchoredEvents:evidence?.events.length||0,
  priority:p.rank!==null?p.rank:9999,
  searchQueries:[p.name+' official biography company investor relations',p.name+' annual report corporate governance regulator filing',p.name+' business history transactions reliable sources'],
  requiredFields:['identity','career','company_roles','ownership_or_shareholdings_if_sourced','economic_events','professional_relationships','governance_and_procedures','dated_timeline','evidence_links'],
  publicationRule:'no new assertions without dated original source and editorial review'
 };
}).sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name));
const counts={profiles:queue.length,initialResearch:queue.filter(p=>p.status==='initial_research').length,legacyBiography:queue.filter(p=>p.status==='legacy_biography').length,needsResearch:queue.filter(p=>p.status==='research_required').length};
if(new Set(queue.map(p=>p.id)).size!==queue.length)throw Error('Duplicate biography IDs');
const out={generatedAt:'2026-11-25',method:'Deterministic editorial inventory; no external research performed by this script',counts,queue};
fs.writeFileSync('data/biography-research-queue.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(counts));
