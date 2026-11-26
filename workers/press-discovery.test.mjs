import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePressRSS,discoverPress} from './press-discovery.mjs';
const person={slug:'katharina-von-baumbach',name:'Katharina von Baumbach'};
const xml='<?xml version="1.0"?><rss version="2.0"><channel>'+
 '<item><title>Katharina von Baumbach verlobt sich mit Leopold von Baden</title><link>https://news.google.com/rss/articles/CBMiTest1</link><source url="https://www.swr.de">SWR</source><pubDate>Tue, 20 Oct 2026 10:00:00 GMT</pubDate></item>'+
 '<item><title>Katharina von Baumbach eröffnet Designstudio</title><link>https://news.google.com/rss/articles/CBMiTest2</link><source url="https://www.abendzeitung-muenchen.de">Abendzeitung</source><pubDate>Wed, 21 Oct 2026 10:00:00 GMT</pubDate></item>'+
 '<item><title>Leopold von Baden zieht nach München</title><link>https://news.google.com/rss/articles/CBMiTest3</link></item>'+
 '</channel></rss>';
test('German regional RSS yields dated person-specific, attributed news candidates',()=>{
 const found=parsePressRSS(xml,person);
 assert.equal(found.length,2);
 assert.equal(found[0].publishedAt,'2026-10-20');
 assert.equal(found[0].reviewStatus,'candidate_unreviewed');
 assert.equal(found[0].publisher,'SWR');
});
test('unknown publisher and unrelated name never become a biographical fact',async()=>{
 const fetcher=async url=>{
   assert.match(url,/news\.google\.com\/rss\/search/);
   assert.match(decodeURIComponent(url),/Katharina von Baumbach/);
   return {ok:true,text:async()=>xml};
 };
 const found=await discoverPress(person,fetcher);
 assert.equal(found.items.length,2);
 assert.equal(found.status,'candidates_found');
 assert.ok(found.items.every(x=>x.origin==='Google News RSS'));
});
test('malicious article URLs and lookalike names are not accepted',()=>{
 const unsafe=xml.replace('https://news.google.com/rss/articles/CBMiTest1','https://malicious.test/article');
 const items=parsePressRSS(unsafe,person);
 assert.equal(items.length,1);
 assert.deepEqual(parsePressRSS(xml,{name:'Katharina von Bäumer'}),[]);
});
test('failed remote feed does not fabricate content',async()=>{
 const x=await discoverPress(person,async()=>({ok:false,status:429}));
 assert.equal(x.status,'feed_unavailable');
 assert.deepEqual(x.items,[]);
});
