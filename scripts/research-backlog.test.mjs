import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditProfiles,queryPlan} from './research-backlog.mjs';
const dataset=JSON.parse(fs.readFileSync('data/biographies-research.json','utf8'));
const curated=JSON.parse(fs.readFileSync('data/curated.json','utf8'));
test('Katharina is not an empty dossier and has a diversified source trail',()=>{
 const x=dataset.profiles['katharina-von-baumbach'];
 assert.ok(x.sections.length>=8);
 assert.ok(x.events.length>=5);
 assert.ok(x.personal.relationships.length>=1);
 const sources=new Set(x.sections.map(s=>new URL(s.source).hostname));
 assert.ok(sources.size>=5);
 const bodies=x.sections.map(s=>s.body).join(' ');
 for(const token of ['KB Design','2021','2025','2026','Boehringer Ingelheim'])assert.ok(bodies.includes(token));
});
test('backlog sorts empty dossiers first and retains research language and source types',()=>{
 const p=[{id:'one',name:'A Person',country:'Allemagne',co:'Some Company'},
  {id:'two',name:'B Person',country:'France',co:'Another Group'}];
 const x=auditProfiles(p,{one:{sections:[],events:[]},two:{sections:Array.from({length:5},()=>({source:'https://example.com/a'})),events:[]}});
 assert.equal(x.totalProfiles,2);
 assert.equal(x.queue[0].slug,'one');
 assert.equal(x.statistics.noEditorialArticles,1);
 assert.equal(x.statistics.substantiveDossiers,1);
 assert.ok(x.queue[0].nextResearch.languages.includes('de'));
 assert.ok(x.queue[0].nextResearch.queries.some(q=>q.includes('Some Company')));
 assert.ok(x.queue[0].nextResearch.sourceTargets.includes('national business registry'));
});
test('no automated confidence score or psychological claim is produced',()=>{
 const x=auditProfiles([{id:'one',name:'Person',country:'France',co:'Group'}],{});
 assert.equal(x.queue[0].editorialStatus,'no_editorial_articles');
 assert.equal('credibilityScore' in x.queue[0],false);
 assert.equal('personalityScore' in x.queue[0],false);
});
