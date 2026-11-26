import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normName,identifyWikidata,eligibleCommonsFile,researchPortrait,runPortraitCycle} from '../workers/portrait-auto.mjs';
test('exact canonical label matches accented names but not unrelated people',()=>{
 assert.equal(normName('Françoise Bettencourt Meyers'),normName('Francoise Bettencourt Meyers'));
 assert.equal(identifyWikidata({slug:'bill-gates',name:'Bill Gates'},{
   wikipedia:{status:'encyclopedic_sources_found',wikidataId:'Q5284',label:'Bill Gates'}})?.id,'Q5284');
 assert.equal(identifyWikidata({slug:'bill-gates',name:'Bill Gates'},{
   wikipedia:{status:'encyclopedic_sources_found',wikidataId:'Q999',label:'Bill Gates Jr.'}}),null);
 assert.equal(identifyWikidata({slug:'unknown',name:'Someone'},{wikipedia:{status:'no_candidate'}}),null);
});
const page={title:'File:Bill Gates.jpg',imageinfo:[{width:1200,height:1200,
 thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Bill_Gates.jpg/900px-Bill_Gates.jpg',
 url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Bill_Gates.jpg',
 descriptionurl:'https://commons.wikimedia.org/wiki/File:Bill_Gates.jpg',
 extmetadata:{LicenseShortName:{value:'CC BY 4.0'},Artist:{value:'Photographer'},LicenseUrl:{value:'https://creativecommons.org/licenses/by/4.0/'}}}]};
test('commons photo eligible only with free license and sufficient dimensions',()=>{
 const x=eligibleCommonsFile(page,'Q5284','Bill Gates');
 assert.equal(x.status,'commons_eligible');
 assert.equal(x.identityVerified,false);
 assert.equal(x.license,'CC BY 4.0');
 assert.equal(x.width,1200);
 assert.equal(eligibleCommonsFile({...page,imageinfo:[{...page.imageinfo[0],width:450}]},'Q5284','Bill Gates'),null);
 assert.equal(eligibleCommonsFile({...page,imageinfo:[{...page.imageinfo[0],extmetadata:{LicenseShortName:{value:'All rights reserved'}}}]},'Q5284','Bill Gates'),null);
 assert.equal(eligibleCommonsFile({...page,imageinfo:[{...page.imageinfo[0],thumburl:'https://example.com/image.jpg'}]},'Q5284','Bill Gates'),null);
});
test('Wikidata P18 resolves human and Commons licence without guessing identity',async()=>{
 const person={slug:'bill-gates',name:'Bill Gates'};
 const bio={wikipedia:{status:'encyclopedic_sources_found',wikidataId:'Q5284',label:'Bill Gates'}};
 const fetcher=async url=>{
  if(String(url).includes('www.wikidata.org'))return {ok:true,json:async()=>({entities:{Q5284:{labels:{en:{value:'Bill Gates'}},claims:{
   P31:[{mainsnak:{datavalue:{value:{id:'Q5'}}}}],
   P18:[{mainsnak:{datavalue:{value:'Bill Gates.jpg'}}}]
  }}}})};
  return {ok:true,json:async()=>({query:{pages:[page]}})};
 };
 const result=await researchPortrait(person,bio,fetcher);
 assert.equal(result.status,'candidate_eligible');
 assert.equal(result.selected.source,'https://commons.wikimedia.org/wiki/File:Bill_Gates.jpg');
 assert.equal(result.selected.identityVerified,false);
});
test('a scheduled photo cycle creates one KV entry for one person',async()=>{
 let writes=0;const stored=new Map();
 const env={BIOGRAPHY:{get:async k=>stored.get(k)||null,put:async(k,v)=>{writes++;stored.set(k,JSON.parse(v))}}};
 const at=new Date('2026-11-26T08:00:00Z');
 const run=await runPortraitCycle(env,at,async()=>({ok:false,status:429}));
 assert.ok(run.slug);
 assert.equal(writes,1);
 const repeat=await runPortraitCycle(env,at,async()=>{throw Error('should not fetch fresh')});
 assert.equal(repeat.status,'cached');
 assert.equal(writes,1);
});
test('site serves standalone portrait client and never overrides user selected Jean Louis',()=>{
 const b=fs.readFileSync('build.mjs','utf8');
 assert.match(b,/assets\/portrait-auto\.js/);
 assert.match(b,/editorial_priority\|\|0\)<100/);
 const j=fs.readFileSync('src/portrait-auto.js','utf8');
 assert.match(j,/candidate\.license/);
 assert.match(j,/candidate\.source/);
});
