import test from 'node:test';
import assert from 'node:assert/strict';
import {matchEntities,classifyEvent,transformCandidate,mergeCandidates,retryDelayMs,reviewMetrics} from './research-intelligence.mjs';
import {collect} from './wealth-research.mjs';
function kv(){const db=new Map();return {db,get:async(k)=>db.has(k)?JSON.parse(db.get(k)):null,put:async(k,v)=>db.set(k,v)};}
test('entity match requires full normalized name and does not assert verification',()=>{
 assert.deepEqual(matchEntities('Elon Musk announces a deal').map(x=>x.id),['elon-musk']);
 assert.deepEqual(matchEntities('Musk announces a deal'),[]);
 assert.deepEqual(matchEntities('Françoise Bettencourt Meyers takes a board seat').map(x=>x.id),['francoise-bettencourt-meyers']);
 assert.equal(matchEntities('Elon Musk')[0].verified,false);
});
test('event classification stays uncertain if ambiguous or unrecognized',()=>{
 assert.equal(classifyEvent('Company announces IPO'),'ipo');
 assert.equal(classifyEvent('Company IPO and acquisition'),'unclassified');
 assert.equal(classifyEvent('Family investment news'),'unclassified');
});
test('candidate provenance and deduplication preserve review status',()=>{
 const t='2026-11-25T12:00:00.000Z';
 const x=transformCandidate({url:'https://example.org/story?utm_source=a',title:'Elon Musk acquisition'},'q1',t);
 const y=transformCandidate({url:'https://example.org/story',title:'Elon Musk acquisition'},'q2',t);
 const m=mergeCandidates([x],[y]);
 assert.equal(m.newLeads,0);assert.deepEqual(m.leads[0].queries,['q1','q2']);
 assert.equal(m.leads[0].status,'pending_review');assert.equal(m.leads[0].evidenceStatus,'discovery_only');
 assert.equal(m.leads[0].sourceDomain,'example.org');
});
test('reject nonweb candidate URLs',()=>assert.throws(()=>transformCandidate({url:'file:///etc/passwd',title:'x'},'q',new Date().toISOString())));
test('429 respects cooldown and does not delete previous leads or invent success',async()=>{
 const RESEARCH=kv(),env={RESEARCH},at=Date.parse('2026-11-25T12:00:00.000Z');
 const first=await collect(env,at,async()=>({ok:false,status:429}));
 assert.equal(first.state,'rate_limited');assert.equal(first.lastSuccess,null);assert.equal(first.leads,0);
 assert.ok(Date.parse(first.retryAfter)>at);
 let calls=0;const second=await collect(env,at+60000,async()=>{calls++;throw Error('unexpected call')});
 assert.equal(calls,0);assert.equal(second.state,'rate_limited');
});
test('successful collection records candidate matches but no verified events',async()=>{
 const RESEARCH=kv(),at=Date.parse('2026-11-25T12:00:00Z');
 const out=await collect({RESEARCH},at,async()=>({ok:true,json:async()=>({articles:[
 {url:'https://example.org/a',title:'Elon Musk acquisition',language:'English'},
 {url:'https://example.org/b',title:'Unrelated market report'}]})}));
 assert.equal(out.state,'ok');assert.equal(out.leads,2);assert.equal(out.matchedCandidates,1);
 assert.equal(out.classifiedCandidates,1);
 assert.ok(RESEARCH.db.get('leads').includes('"pending_review"'));
});
test('backoff is bounded',()=>{assert.ok(Date.parse(retryDelayMs(10,0))<=6*60*60*1000);});

test('review figures distinguish volume, relevance and independent proof',()=>{
 const at='2026-11-25T12:00:00Z';
 const leads=[
  transformCandidate({url:'https://media-a.test/one',title:'Elon Musk acquisition'},'acquisition',at),
  transformCandidate({url:'https://media-b.test/two',title:'Elon Musk acquisition'},'acquisition',at),
  transformCandidate({url:'https://media-c.test/three',title:'Unrelated global market analysis'},'acquisition',at)
 ];
 assert.deepEqual(reviewMetrics(leads),{
  matchedCandidates:2,classifiedCandidates:2,highPriorityReview:2,repeatedHeadlineGroups:1,verifiedEvents:0
 });
});
test('old unclassified documents remain unpublished after metrics processing',()=>{
 const metrics=reviewMetrics([{title:'El Pentágono cuestiona a Canadá',url:'https://example.org'}]);
 assert.equal(metrics.highPriorityReview,0);assert.equal(metrics.verifiedEvents,0);
});
