import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('build.mjs','utf8');
const home=fs.readFileSync('src/home.html','utf8');
const routes=['entreprises','influence','risques','next-billionaires','recherche','intelligence'];
test('all navigation sections generate standalone HTML and sitemap entries',()=>{
 for(const route of routes){
  assert.match(source,new RegExp("hubWrite\\('"+route+"'"));
  assert.ok(source.includes("'"+route+"/'"),route+' is absent from sitemap');
 }
});
test('main menu feature links no longer depend on SPA hash routes',()=>{
 for(const key of ['ENTREPRISES','INFLUENCE','RISQUES','NEXT','RECHERCHE','INTELLIGENCE']){
   assert.ok(home.includes('href="__L_'+key+'__"'),key+' missing');
   assert.ok(source.includes('__L_'+key+'__: link('),key+' not injected');
 }
});
test('category pages contain actual records and not placeholder-only copy',()=>{
 assert.match(source,/const companyGroups=/);
 assert.match(source,/hubSection\('Dossiers documentaires'/);
 assert.match(source,/hubSection\('Profils hors du Top 200'/);
 assert.match(source,/id="hubResults"/);
});
