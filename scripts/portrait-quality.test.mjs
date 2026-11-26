import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pickPortrait,photoInitials,photoAudit} from '../src/portrait-selection.mjs';
const DATA=JSON.parse(fs.readFileSync('data/photos.json','utf8'));
test('Van der Velde uses the user-selected Hearst editorial photograph ahead of old press image',()=>{
 const photos=DATA['jean-louis-van-der-velde'];
 assert.equal(photos.length,2);
 const selected=pickPortrait(photos);
 assert.match(selected.src,/^https:\/\/hips\.hearstapps\.com\/hmg-prod\/images\/c405e9d0-/);
 assert.equal(selected.editorial_priority,100);
 assert.equal(selected.image_width,769);
 assert.equal(selected.image_height,768);
 assert.equal(selected.publication_autorisee,null);
 assert.equal(selected.identity_verified,false);
 assert.equal(photos[1].src.includes('indodax.com'),true);
});
test('Do not mistake visual quality priority for verification or usage rights',()=>{
 const audit=photoAudit(DATA);
 assert.equal(audit.profiles,207);
 assert.ok(audit.candidates>=207);
 assert.ok(audit.identityUnverified>0);
 assert.ok(audit.permissionsUnknown>0);
});
test('Higher editorial priority wins irrespective of insertion order, with stable fallback',()=>{
 const old={type:'portrait',src:'https://example.com/old.jpg',editorial_priority:0};
 const chosen={type:'portrait',src:'https://example.com/new.jpg',editorial_priority:200};
 assert.equal(pickPortrait([old,chosen]),chosen);
 assert.equal(pickPortrait([old]),old);
 assert.equal(pickPortrait([]),null);
 assert.equal(photoInitials('Jean-Louis van der Velde'),'JV');
});
test('Every published portrait has a fallback when a hotlinked image fails',()=>{
 const build=fs.readFileSync('build.mjs','utf8');
 const css=fs.readFileSync('src/site.css','utf8');
 assert.match(build,/const portrait = p => pickPortrait/);
 assert.match(build,/class=\\"portrait-initials\\"/);
 assert.match(build,/onerror=\\"this.remove\(\)\\"/);
 assert.match(css,/\.g\.ph \.portrait-initials/);
 assert.match(build,/photo-audit\.json/);
});
