import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptedPublisher,extractPublisherMetadata,fetchPublisherMetadata,sourcePreviews} from './publisher-previews.mjs';

const URL='https://www.reuters.com/world/test-report-2026-11-15/';
const HTML='<html><head><meta property="og:title" content="Company &amp; founder announce change"><meta property="og:description" content="Management said the transition would occur in November."><meta property="article:published_time" content="2026-11-15T08:15:00Z"></head><body></body></html>';

test('parse source title, teaser and publication day, never infer them',()=>{
 const r=extractPublisherMetadata(HTML,URL);
 assert.equal(r.title,'Company & founder announce change');
 assert.equal(r.description,'Management said the transition would occur in November.');
 assert.equal(r.publishedAt,'2026-11-15');
 assert.equal(r.publisher,'reuters.com');
 assert.equal(r.state,'publisher_metadata_unreviewed');
});
test('require an approved HTTPS publisher and avoid redirect abuse',()=>{
 assert.equal(acceptedPublisher(URL),true);
 assert.equal(acceptedPublisher('https://reuters.com.attacker.test/article'),false);
 assert.equal(acceptedPublisher('http://www.reuters.com/article'),false);
 assert.equal(acceptedPublisher('https://evil.test/'),false);
 assert.equal(acceptedPublisher('https://www.sec.gov/Archives/sample.htm'),true);
});
test('skip restricted pages and unsupported content without invented summaries',async()=>{
 const fake=async()=>({ok:true,headers:{get:()=> 'text/html'},body:null,text:async()=>'<title>Access denied</title>'});
 assert.equal(await fetchPublisherMetadata({url:URL},fake),null);
 const image=async()=>({ok:true,headers:{get:()=> 'image/png'},body:null,text:async()=> HTML});
 assert.equal(await fetchPublisherMetadata({url:URL},image),null);
});
test('preview pipeline deduplicates sources and returns only actually fetched metadata',async()=>{
 let called=0;
 const fake=async()=>{called++;return {ok:true,headers:{get:()=> 'text/html'},body:null,text:async()=>HTML}};
 const result=await sourcePreviews([{url:URL},{url:URL},{url:'https://not-approved.example/a'}],fake);
 assert.equal(called,1);
 assert.equal(result.length,1);
 assert.equal(result[0].title,'Company & founder announce change');
});
