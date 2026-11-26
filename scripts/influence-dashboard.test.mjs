import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzeInfluence,brandIcon} from '../src/influence-research.mjs';
import {renderInfluenceDashboard} from '../src/influence-dashboard.mjs';
const people=[
 {id:'a',name:'A Person',co:'Google',nw:30,age:40,country:'France',sec:'tech',orig:'herit'},
 {id:'b',name:'B Person',co:'Google',nw:20,age:72,country:'France',sec:'tech',orig:'self'},
 {id:'c',name:'C Person',co:'Microsoft',nw:10,age:null,country:'Allemagne',sec:'fin',orig:''}
];
const groups=[{name:'Google',people:people.slice(0,2)}];
test('statistical denominator includes unknown wealth origin rather than inventing inheritance',()=>{
 const x=analyzeInfluence(people,groups);
 assert.equal(x.total,3);
 assert.equal(x.knownOrigin,2);
 assert.equal(x.inheritedOrMixed,1);
 assert.equal(x.origins.unknown,1);
 assert.equal(x.countries[0].count,2);
 assert.equal(x.groupsCount,1);
 assert.equal(x.peopleWithGroup,2);
 assert.equal(x.ages.find(x=>x.label==='Âge non renseigné').count,1);
});
test('dashboard publishes four real charts and documented public decisions',()=>{
 const x=renderInfluenceDashboard({people,companyGroups:groups,researchProfiles:{'bill-gates':{sections:[1]},'elon-musk':{sections:[1]}},link:(from,to)=>'/'+to+'/',asset:(from,to)=>'/'+to,escape:x=>String(x).replace(/</g,'&lt;'),format:n=>String(n),sectorNames:{tech:'Technologie',fin:'Finance'}});
 assert.equal((x.html.match(/class="inf-chart"/g)||[]).length,4);
 assert.ok(x.html.includes('1 / 2 profils renseignés'));
 assert.ok(x.html.includes('Entreprises les plus représentées'));
 assert.ok(x.html.includes('infGraphData'));
 assert.ok(x.html.includes('document original'));
 assert.ok(x.html.includes('infShare'));
 assert.ok(x.html.includes('infDownload'));
 assert.ok(x.html.includes('infWatch'));
 assert.ok(x.html.includes('pubmed.ncbi.nlm.nih.gov'));
});
test('logo mapping never fabricates an icon for unknown company',()=>{
 assert.equal(brandIcon('Google'),'google');
 assert.equal(brandIcon('NoSuchBusinessXYZ'),null);
});
test('static website copies accessible network script',()=>{
 const b=fs.readFileSync('build.mjs','utf8');
 assert.ok(b.includes("fs.copyFileSync('src/influence-live.js'"));
 assert.ok(b.includes("hubWrite('influence'"));
});
