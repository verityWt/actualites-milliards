import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeName,selectCandidate,resolveWikipedia} from './wikipedia-profile.mjs';
const person={slug:'bill-gates',name:'Bill Gates',country:'United States'};
const suggestions=[{wikidataId:'Q5284',label:'Bill Gates',description:'American businessman and philanthropist'}];
test('normalization handles accents without weakening exact-name match',()=>{
 assert.equal(normalizeName('Françoise Bettencourt Meyers'),normalizeName('Francoise Bettencourt Meyers'));
 assert.equal(selectCandidate(person,suggestions)?.wikidataId,'Q5284');
 assert.equal(selectCandidate(person,[{...suggestions[0],label:'Bill Gates II'}]),null);
 assert.equal(selectCandidate(person,[...suggestions,...suggestions]),null);
});
test('associated Wiki summaries are attributed, URLs constrained and identity remains unverified',async()=>{
 const calls=[];
 const mock=async url=>{
  calls.push(url);
  if(url.includes('wbgetentities'))return {ok:true,json:async()=>({entities:{Q5284:{labels:{en:{value:'Bill Gates'}},
   sitelinks:{frwiki:{title:'Bill Gates'},enwiki:{title:'Bill Gates'}},
   claims:{P856:[{mainsnak:{datavalue:{value:'https://www.gatesnotes.com/'}}}]}}}})};
  if(url.includes('fr.wikipedia.org'))return {ok:true,json:async()=>({type:'standard',title:'Bill Gates',extract:'Bill Gates est un entrepreneur américain, connu comme cofondateur de Microsoft et pour ses activités dans la santé mondiale.',content_urls:{desktop:{page:'https://fr.wikipedia.org/wiki/Bill_Gates'}}})};
  return {ok:true,json:async()=>({type:'standard',title:'Bill Gates',extract:'Bill Gates is an American entrepreneur, co-founder of Microsoft, and a major contributor to global health projects.',content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Bill_Gates'}}})};
 };
 const v=await resolveWikipedia(person,suggestions,mock);
 assert.equal(v.status,'encyclopedic_sources_found');
 assert.equal(v.verified,false);
 assert.equal(v.pages.length,2);
 assert.equal(v.pages[0].language,'fr');
 assert.deepEqual(v.officialWebsites,['https://www.gatesnotes.com/']);
 assert.equal(v.pages[0].license,'CC BY-SA 4.0');
 assert.equal(calls.length,3);
});
test('ambiguous name skips calls to upstream sources',async()=>{
 let calls=0;const fake=async()=>{calls++;throw Error('should not fetch')};
 const v=await resolveWikipedia(person,[...suggestions,...suggestions],fake);
 assert.equal(v.status,'identity_ambiguous');assert.equal(calls,0);
});
