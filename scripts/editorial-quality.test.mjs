import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('data/biographies-research.json','utf8'));
const gates=data.profiles['bill-gates'];
const generator=fs.readFileSync('build.mjs','utf8');
const photos=JSON.parse(fs.readFileSync('data/photos.json','utf8'));
test('Bill Gates editorial dossier has substantive source-linked chapters',()=>{
 assert.ok(gates.sections.length>=9);
 assert.ok(gates.events.length>=8);
 for(const item of gates.sections){
  assert.ok(item.body.length>110);
  assert.ok(new URL(item.source).protocol==='https:');
 }
 for(const category of ['personality','preferences','personalLife','relationships','documentedRisks']){
  assert.ok(gates.personal[category]?.length>0);
  assert.ok(gates.personal[category].every(x=>x.body.length>100 && x.source.startsWith('https://')));
 }
});
test('Public pages do not print token-count experiments or internal editorial admonitions',()=>{
 const from=generator.indexOf('return details+personalHtml+');
 const to=generator.indexOf('const TOTAL =',from);
 assert.ok(from>0&&to>from);
 const html=generator.slice(from,to);
 assert.doesNotMatch(html,/behavior\+experiment\+completedModels|modeles-executes/);
 assert.doesNotMatch(generator,/Les rôles et liens juridiques exigent/);
 assert.doesNotMatch(generator,/Un fait allégué, une procédure en cours et une décision définitive/);
 assert.match(generator,/personalSections\.filter\(group=>group\.items\.length\)/);
});
test('Recent Gates portrait has attribution and a source',()=>{
 assert.ok(photos['bill-gates'].some(x=>x.type==='portrait' && x.licence==='CC BY 4.0' && x.credit && x.source.includes('commons.wikimedia.org')));
});
