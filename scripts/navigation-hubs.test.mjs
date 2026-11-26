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

test('Influence group cards display an explicit title, number and associated people',()=>{
 assert.match(source,/hub-group-label/);
 assert.match(source,/hub-group-count/);
 assert.match(source,/hub-group-people/);
 assert.match(source,/hub-group-people[^\n]*item\.people\.map/);
});

test('portrait thumbnails are constrained for every hub profile card',()=>{
 const css=fs.readFileSync('src/site.css','utf8');
 assert.match(css,/\.hub-profile>\.g\{[^}]*width:64px;[^}]*height:64px;/);
 assert.match(css,/\.hub-profile>\.g img,\.hub-profile>\.g svg\{[^}]*max-width:100%;[^}]*max-height:100%;/);
 assert.match(css,/\.hub-profile>div:not\(\.g\)\{[^}]*min-width:0;/);
 for(const route of ['influence','next-billionaires']){
  assert.ok(source.includes("hubCard('"+route+"'"),route+' not using shared constrained portrait card');
 }
});
