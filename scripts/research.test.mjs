import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalUrl,normalizeArticle,mergeLeads,discover} from './research.mjs';
test('tracking removal and duplicate URL',()=>{assert.equal(canonicalUrl('https://example.org/a?utm_source=x&b=2#x'),'https://example.org/a?b=2');const a=normalizeArticle({url:'https://example.org/a',title:'Example'},'a');const b=normalizeArticle({url:'https://example.org/a?utm_source=x',title:'Example'},'b');assert.equal(mergeLeads([a],[b]).length,1);assert.deepEqual(mergeLeads([a],[b])[0].queries,['a','b']);});
test('untrusted leads never published',async()=>{const out=await discover('test',async()=>({ok:true,json:async()=>({articles:[{url:'https://example.org/a',title:'Example'},{url:'javascript:alert(1)',title:'bad'}]})}));assert.equal(out.length,1);assert.equal(out[0].status,'pending_review');});
test('HTTP failure is surfaced',async()=>{await assert.rejects(discover('test',async()=>({ok:false,status:429})),/429/);});
