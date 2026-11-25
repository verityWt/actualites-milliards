import test from 'node:test';
import assert from 'node:assert/strict';
import service,{PEOPLE,selection,slotFor,discover} from './biography-discovery.mjs';
function kv(){const m=new Map();return {m,async get(k){return m.has(k)?JSON.parse(m.get(k)):null},async put(k,v){m.set(k,v)}}}
test('coverage: all people are visited across a full rotation',()=>{
 assert.equal(PEOPLE.length,207);
 assert.equal(new Set(PEOPLE.map(p=>p.slug)).size,PEOPLE.length);
 const first=slotFor('2026-11-25T00:00:00Z');
 const visited=new Set(Array.from({length:PEOPLE.length},(_,i)=>selection(new Date((first+i)*900000)).slug));
 assert.equal(visited.size,PEOPLE.length);
});
test('a verified run stores suggestions as unverified candidates',async()=>{
 const store=kv(),date=new Date('2026-11-25T00:00:00Z');
 const mock=async()=>({ok:true,json:async()=>({search:[{id:'Q1234',label:'Sample Person',description:'business person'},{id:'invalid',label:'skip'}]})});
 const x=await discover({RESEARCH:store},date,mock);
 assert.equal(x.state,'candidate_found');
 const record=await store.get('profile:'+x.person);
 assert.equal(record.suggestions.length,1);
 assert.equal(record.suggestions[0].status,'candidate_identity_unverified');
 assert.equal(record.verifiedFacts,0);
 assert.equal(record.analysisStatus,'not_executed');
 assert.ok(await store.get('run:'+slotFor(date)));
});
test('provider error is recorded without publishing a false match',async()=>{
 const store=kv(),date=new Date('2026-11-25T00:15:00Z');
 const state=await discover({RESEARCH:store},date,async()=>({ok:false,status:429}));
 assert.equal(state.state,'error');
 assert.match(state.error,/429/);
 assert.ok(await store.get('error:'+state.person));
 assert.equal(await store.get('profile:'+state.person),null);
});
test('public API is read-only and shows true waiting state',async()=>{
 const store=kv();
 const status=await service.fetch(new Request('https://example.com/status'),{RESEARCH:store});
 assert.equal(status.status,200);
 const value=await status.json();
 assert.equal(value.state,'waiting_for_first_cron');
 assert.equal(value.totalProfiles,207);
 const blocked=await service.fetch(new Request('https://example.com/status',{method:'POST'}),{RESEARCH:store});
 assert.equal(blocked.status,405);
});
