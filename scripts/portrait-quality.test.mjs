import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pickPortrait,portraitCandidates,photoInitials,photoAudit,photoReviewQueue} from '../src/portrait-selection.mjs';
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

test('review queue covers every published profile and provides source-discovery searches',()=>{
 const rows=photoReviewQueue(DATA);
 assert.equal(rows.length,207);
 const person=rows.find(p=>p.slug==='jean-louis-van-der-velde');
 assert.ok(person.selectedUrl.includes('hearstapps.com'));
 assert.ok(person.researchQueries.photoSearch.includes('google.com/search'));
 assert.ok(person.researchQueries.linkedinSearch.includes('linkedin.com%2Fin'));
 assert.ok(person.issues.includes('republication_rights_unconfirmed'));
 assert.ok(rows.every(x=>typeof x.reviewed==='boolean'&&Array.isArray(x.issues)));
});

test('fallback candidates try editorial favorite, then previously documented alternatives',()=>{
 const list=DATA['jean-louis-van-der-velde'];
 const ordered=portraitCandidates(list);
 assert.equal(ordered.length,2);
 assert.match(ordered[0].src,/hips\.hearstapps\.com/);
 assert.match(ordered[1].src,/indodax\.com/);
 const build=fs.readFileSync('build.mjs','utf8');
 assert.match(build,/data-portrait-fallbacks/);
 assert.match(build,/assets\/portrait-fallback\.js/);
 assert.match(build,/window\.actualitesPhotoError/);
 const script=fs.readFileSync('src/portrait-fallback.js','utf8');
 assert.match(script,/window\.actualitesPhotoError/);
 assert.match(script,/while\(sources\.length\)/);
});
test('photo review console renders source candidates and exports decisions without altering the source photos',()=>{
 const build=fs.readFileSync('build.mjs','utf8');
 const js=fs.readFileSync('src/photo-review-console.js','utf8');
 assert.match(build,/write\('photos-a-verifier'/);
 assert.match(build,/name="robots" content="noindex,nofollow"/);
 assert.match(build,/photoReviewData=P\.map/);
 assert.match(js,/localStorage/);
 assert.match(js,/Exporter|exportedAt/);
 assert.match(js,/republication|droits|droits/i);
});

test('Unrelated gallery media cannot become a person's portrait',()=>{
 const galleryOnly={type:'event',src:'https://example.com/award-ceremony.jpg'};
 assert.equal(pickPortrait([galleryOnly]),null);
 assert.deepEqual(portraitCandidates([galleryOnly]),[]);
 const row=photoReviewQueue({'sample-person':[galleryOnly]})[0];
 assert.equal(row.selectedUrl,null);
 assert.ok(row.issues.includes('missing_photo'));
});
test('Photo review requires a loaded image for framing approval and exposes its provenance',()=>{
 const js=fs.readFileSync('src/photo-review-console.js','utf8');
 assert.match(js,/const canAccept=.*photo\.naturalWidth>0/);
 assert.match(js,/acceptButton\.disabled=!canAccept\(\)/);
 assert.match(js,/if\(value==='acceptable'&&!canAccept\(\)\)return/);
 assert.match(js,/Aucune photo candidate/);
 assert.match(js,/candidate\?\.source/);
 assert.match(js,/Consulter la source de cette photo/);
});
