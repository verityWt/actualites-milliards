// Génère le site statique Actualites.fr (fiches, listes, sitemap) à partir de data/.
// Usage : node build.mjs            -> dist/ (production, URLs propres)
//         node build.mjs --preview  -> dist-preview/ (liens en index.html relatifs, pour l'aperçu)
import fs from 'node:fs';
import path from 'node:path';
import { rosette } from './src/guil.mjs';
import {pickPortrait,portraitCandidates,photoInitials,photoAudit} from './src/portrait-selection.mjs';
import { graph, timeline, sources, validate, candidates, observations } from './src/intelligence.mjs';
import { validateResearchProfiles } from './scripts/validate-biographies.mjs';
import { renderInfluenceDashboard } from './src/influence-dashboard.mjs';
import { auditProfiles } from './scripts/research-backlog.mjs';
import { validateExperimentResults } from './scripts/validate-experiments.mjs';
import { publicSpeechMetrics, experimentalSensitivity } from './src/behavioral-analysis.mjs';
validate();

const PREVIEW = process.argv.includes('--preview');
const OUT = PREVIEW ? 'dist-preview' : 'dist';
const SITE = 'https://actualites.fr';
const SRC_FORBES = 'Forbes, World\'s Billionaires 2026, fortunes et âges au 1er mars 2026';

const IND = {
  'Technology': ['tech', 'Technologie'], 'Fashion & Retail': ['mode', 'Mode et distribution'],
  'Finance & Investments': ['fin', 'Finance et investissement'], 'Telecom': ['telecom', 'Télécoms'],
  'Diversified': ['div', 'Conglomérats'], 'Food & Beverage': ['food', 'Alimentation et boissons'],
  'Metals & Mining': ['mines', 'Métaux et mines'], 'Energy': ['energie', 'Énergie'],
  'Logistics': ['logist', 'Logistique et transport'], 'Healthcare': ['sante', 'Santé'],
  'Automotive': ['auto', 'Automobile'], 'Manufacturing': ['indus', 'Industrie'],
  'Manufacturing Entrepreneur': ['indus', 'Industrie'], 'Gambling & Casinos': ['casino', 'Jeux et casinos'],
  'Real Estate': ['immo', 'Immobilier'], 'Media & Entertainment': ['media', 'Médias et divertissement'],
  'Construction & Engineering': ['btp', 'Construction'], 'Sports': ['sport', 'Sport'], 'Service': ['service', 'Services']
};
const SECSLUG = { tech: 'technologie', mode: 'mode-distribution', fin: 'finance', telecom: 'telecoms', div: 'conglomerats', food: 'alimentation', mines: 'mines-metaux', energie: 'energie', logist: 'logistique', sante: 'sante', auto: 'automobile', indus: 'industrie', casino: 'casinos', immo: 'immobilier', media: 'medias', btp: 'construction', sport: 'sport', service: 'services' };
const SEC = Object.fromEntries(Object.values(IND).map(([k, l]) => [k, l]));
const COUNTRY = {
  'United States': 'États-Unis', 'France': 'France', 'Spain': 'Espagne', 'Mexico': 'Mexique', 'Canada': 'Canada',
  'India': 'Inde', 'Italy': 'Italie', 'China': 'Chine', 'Germany': 'Allemagne', 'Japan': 'Japon', 'Hong Kong': 'Hong Kong',
  'Chile': 'Chili', 'Austria': 'Autriche', 'Switzerland': 'Suisse', 'Netherlands': 'Pays-Bas', 'Russia': 'Russie',
  'Brazil': 'Brésil', 'Israel': 'Israël', 'Czech Republic': 'République tchèque', 'Indonesia': 'Indonésie',
  'Nigeria': 'Nigeria', 'Vietnam': 'Viêt Nam', 'Greece': 'Grèce', 'South Korea': 'Corée du Sud', 'Australia': 'Australie',
  'Sweden': 'Suède', 'Cyprus': 'Chypre', 'United Kingdom': 'Royaume-Uni', 'Saudi Arabia': 'Arabie saoudite',
  'Thailand': 'Thaïlande', 'Norway': 'Norvège', 'Ireland': 'Irlande', 'Denmark': 'Danemark', 'Philippines': 'Philippines',
  'South Africa': 'Afrique du Sud', 'Taiwan': 'Taïwan', 'United Arab Emirates': 'Émirats arabes unis', 'Colombia': 'Colombie'
};
// Genre publiquement documenté (femmes du top 200) ; les autres entrées du top 200 sont des hommes ou des familles.
const WOMEN = new Set(['Alice Walton', 'Francoise Bettencourt Meyers & family', 'Julia Koch & family', 'Iris Fontbona & family',
  'Jacqueline Mars', 'Rafaela Aponte-Diamant', 'Savitri Jindal & family', 'Miriam Adelson & family', 'Abigail Johnson',
  'Zheng Shuliang & family', 'Marilyn Simons & family', 'Elaine Marshall & family', 'Melinda French Gates',
  'Lyndal Stephens Greth & family', 'Susanne Klatten', 'MacKenzie Scott', 'Vicky Safra & family', 'Gina Rinehart',
  'Christy Walton', 'Diane Hendricks', 'Renata Kellnerova & family', 'Nancy Walton Laurie', 'Beate Heister',
  'Zhong Huijuan', 'Charlene de Carvalho-Heineken & family', 'Zhou Qunfei & family', 'Kwong Siu-hing',
  'Antonia Ax:son Johnson & family', 'Ann Walton Kroenke']);

const slugify = s => s.replace(/ & family$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sourceParts = note => { const raw=String(note||''); const match=raw.match(/https?:\/\/[^\s]+/); let url=null; if(match){try{const u=new URL(match[0]);if(u.protocol==='https:')url=u.href;}catch{}} return {label:raw.replace(/https?:\/\/[^\s]+/g,'').replace(/\s*[:;,]\s*$/,'').trim(),url}; };
const sourceHtml = note => { const s=sourceParts(note); return s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.label||'Document source')+'</a>':esc(s.label||'Source non renseignée'); };
const fr = (n, d) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d ?? (n % 1 ? 1 : 0), maximumFractionDigits: d ?? 1 });

const PHOTOS = JSON.parse(fs.readFileSync('data/photos.json', 'utf8'));
const phSrc = (from, ph) => /^https?:/.test(ph.fichier || ph.src || '') ? (ph.fichier || ph.src) : asset(from, ph.fichier || ph.src);
const portrait = p => pickPortrait(PHOTOS[p.id]||[]);
const curated = JSON.parse(fs.readFileSync('data/curated.json', 'utf8'));
const DET = Object.fromEntries(fs.readFileSync('data/details-fr.psv', 'utf8').trim().split('\n').map(l => l.split('|')).map(([n, co, role, fact, o]) => [n, { co, role, fact, orig: { s: 'self', h: 'herit', m: 'mix' }[o] }]));
const rows = fs.readFileSync('data/forbes2026-top200.psv', 'utf8').trim().split('\n').map(l => l.split('|'));
let P = rows.map(([rank, name, nw, age, country, ind]) => {
  const id = slugify(name), c = curated[id] || {}, d = DET[name] || {};
  const fam = / & family$/.test(name);
  const [sec] = IND[ind] || ['div'];
  return {
    id, name: (c.name || name.replace(/ & family$/, '')).replace('Francoise', 'Françoise'), fam, rank: +rank, nw: +nw,
    age: age ? +age : null, born: c.born || null, country: COUNTRY[country] || country, sec,
    g: WOMEN.has(name) ? 'f' : 'h', co: c.co || d.co || '', role: d.role || '', fact: d.fact || '', orig: c.orig || d.orig || '', bio: c.bio || '', single: c.single || null,
    srcNote: SRC_FORBES
  };
});
for (const [id, c] of Object.entries(curated)) if (c.extra) P.push({
  id, name: c.name, fam: false, rank: null, nw: c.nw, age: c.age ?? null, born: c.born ?? null, country: c.country, sec: ({alimentation:'food'}[c.ind] || (Object.hasOwn(SEC,c.ind)?c.ind:'div')),
  g: c.g, co: c.co, orig: c.orig, bio: c.bio, single: c.single || null, srcNote: c.srcNote
});
// unicité des slugs
const seen = {}; for (const p of P) { if (seen[p.id]) p.id += '-' + (++seen[p.id]); else seen[p.id] = 1; }
P.sort((a, b) => (b.nw ?? -1) - (a.nw ?? -1));
const byId = Object.fromEntries(P.map(p => [p.id, p]));
const researchData = JSON.parse(fs.readFileSync('data/biographies-research.json','utf8'));
const researchQuality = validateResearchProfiles(researchData,P.map(p=>p.id));
const researchProfiles = researchData.profiles;
const researchBacklog = auditProfiles(P,researchProfiles);
const experimentV2 = JSON.parse(fs.readFileSync('data/behavioral-experiments-v2.json','utf8'));
const experimentalBatch=JSON.parse(fs.readFileSync('data/behavioral-experiments-batch-20261125.json','utf8'));
if(experimentalBatch.schemaVersion!==1||!Array.isArray(experimentalBatch.runs))throw Error('Invalid experimental batch');
const allExperiments=[experimentV2,...experimentalBatch.runs];
const experimentSubjects=new Set();
for(const entry of allExperiments){
 validateExperimentResults(entry,researchProfiles);
 if(experimentSubjects.has(entry.subject))throw Error('Duplicate experimental subject '+entry.subject);
 experimentSubjects.add(entry.subject);
}
const experimentByPerson=Object.fromEntries(allExperiments.map(x=>[x.subject,x]));

// ---------- liens ----------
const link = (from, to) => { // from/to : chemins de répertoire sans slash initial, '' = racine
  if (!PREVIEW) return '/' + (to ? to + '/' : '');
  const up = from ? from.split('/').length : 0;
  return '../'.repeat(up) + (to ? to + '/' : '') + 'index.html';
};
const asset = (from, f) => PREVIEW ? '../'.repeat(from ? from.split('/').length : 0) + f : '/' + f;
const home = (from, hash = '') => (PREVIEW ? '../'.repeat(from ? from.split('/').length : 0) + 'index.html' : '/') + (hash ? '#' + hash : '');

const COL = { tech: '#3b5bdb', mode: '#b8860b', fin: '#0f766e', telecom: '#0e7490', div: '#6b21a8', food: '#c2410c', mines: '#57534e', energie: '#b45309', logist: '#1e40af', sante: '#15803d', auto: '#be123c', indus: '#475569', casino: '#9d174d', immo: '#7c2d12', media: '#be185d', btp: '#78716c', sport: '#7c3aed', service: '#0f766e' };
const INK = { tech: '#1f4e8c', mode: '#7a1d3a', fin: '#0e5a5c', telecom: '#155e75', div: '#5b2a86', food: '#9a3412', mines: '#44403c', energie: '#92400e', logist: '#1e3a8a', sante: '#166534', auto: '#9f1239', indus: '#334155', casino: '#831843', immo: '#7c2d12', media: '#9d174d', btp: '#57534e', sport: '#6d28d9', service: '#0f766e' };
const portraitImage = (p,from='',alt='',loading='lazy',auto=false) => {
 const candidates=portraitCandidates(PHOTOS[p.id]||[]);
 if(!candidates.length)return '';
 const srcs=candidates.map(ph=>phSrc(from,ph));
 return `<img src="${esc(srcs[0])}" data-portrait-fallbacks="${esc(JSON.stringify(srcs.slice(1)))}" ${auto&&Number(portrait(p)?.editorial_priority||0)<100?'data-auto-portrait="'+esc(p.id)+'"':''} alt="${esc(alt||p.name)}" loading="${loading}" decoding="async" onerror="window.actualitesPhotoError?window.actualitesPhotoError(this):this.remove()">`;
};
const medal = (p, size = 64, from = '') => portrait(p) ? `<div class="g ph"><span class="portrait-initials" aria-hidden="true">${esc(photoInitials(p.name))}</span>${portraitImage(p,from,p.name)}</div>` : `<div class="g" data-r="${p.id}" data-i="${INK[p.sec] || '#5a1230'}" data-d="${size > 100 ? 200 : 80}"></div>`;
const serial = p => p.rank ? 'N° ' + String(p.rank).padStart(3, '0') : 'HORS CLASSEMENT';
const billet = (p, big, from = '') => `<div class="billet${big ? ' big' : ''}">${portrait(p) ? `<div class="guil ph"><span class="portrait-initials" aria-hidden="true">${esc(photoInitials(p.name))}</span>${portraitImage(p,from,'Portrait de '+p.name,'eager',big)}</div>` : `<div class="guil" data-r="${p.id}" data-i="${INK[p.sec] || '#5a1230'}" data-d="220"></div>`}<div><div class="bt"><span>${serial(p)}</span><span>${p.rank ? 'FORBES 2026' : 'ACTUALITES.FR'}</span></div><div class="bn">${esc(fullName(p))}</div><div class="bm">${esc([p.co || SEC[p.sec], p.country].filter(Boolean).join(' · '))}</div><div class="bv">${nwTxt(p)}</div></div><div class="micro">ACTUALITES.FR · LE MONDE DES MILLIARDS · ${esc(fullName(p).toUpperCase())} · ${serial(p)} · ACTUALITES.FR · LE MONDE DES MILLIARDS</div></div>`;
const nwTxt = p => p.nw == null ? 'Fortune liée' : fr(p.nw) + ' Md$';
const fullName = p => p.name + (p.fam ? ' et sa famille' : '');
const meta = p => [p.co || SEC[p.sec], p.country, p.age ? p.age + ' ans' : (p.born ? (p.g === 'f' ? 'née' : 'né') + ' en ' + p.born : '')].filter(Boolean).join(' · ');
const card = (from, p) => `<a class="card pcard" href="${link(from, 'milliardaires/' + p.id)}">${p.rank ? `<span class="rk">N° ${p.rank}</span>` : ''}${medal(p, 64, from)}<div><div class="nm">${esc(fullName(p))}</div><div class="meta">${esc(meta(p))}</div><div class="nw" style="margin-top:6px">${nwTxt(p)}</div></div></a>`;

const header = from => `<header class="top"><div class="in"><a class="logo" href="${home(from)}">Actualites<span>.fr</span></a><nav class="nav" aria-label="Rubriques"><a href="${link(from, 'milliardaires')}">Fortunes</a><a href="${link(from, 'fortunes-invisibles')}">Fortunes invisibles</a><a href="${link(from, 'entreprises')}">Entreprises</a><a href="${link(from, 'influence')}">Influence</a><a href="${link(from, 'risques')}">Risques</a><a href="${link(from, 'next-billionaires')}">Next Billionaires</a><a href="${link(from, 'recherche')}">Recherche</a><a class="hot" href="${link(from, 'intelligence')}">Intelligence Pro</a></nav></div><aside class="wealth-monitor" aria-label="Thèmes de veille des grandes fortunes"><div class="wm-line"><div class="wm-label">Classements</div><div class="wm-window"><div class="wm-track"><span><a href="${link(from,'milliardaires')}">Grandes fortunes mondiales</a> · <a href="${link(from,'milliardaires/france')}">France</a> · <a href="${link(from,'milliardaires/femmes')}">Femmes milliardaires</a> · <a href="${link(from,'milliardaires/moins-de-40-ans')}">Jeunes fortunes</a> · <a href="${home(from,'methode')}">Méthodologie et sources</a></span><span aria-hidden="true" inert><a href="${link(from,'milliardaires')}">Grandes fortunes mondiales</a> · <a href="${link(from,'milliardaires/france')}">France</a> · <a href="${link(from,'milliardaires/femmes')}">Femmes milliardaires</a> · <a href="${link(from,'milliardaires/moins-de-40-ans')}">Jeunes fortunes</a> · <a href="${home(from,'methode')}">Méthodologie et sources</a></span></div></div></div><div class="wm-line"><div class="wm-label">Entreprises</div><div class="wm-window"><div class="wm-track"><span><a href="${link(from,'recherche')}">Technologie · LVMH · Tesla · Amazon · Finance · Distribution · Énergie · Immobilier</a></span><span aria-hidden="true" inert><a href="${link(from,'recherche')}">Technologie · LVMH · Tesla · Amazon · Finance · Distribution · Énergie · Immobilier</a></span></div></div></div><div class="wm-line"><div class="wm-label">Dossiers et risques</div><div class="wm-window"><div class="wm-track"><span><a href="${link(from,'milliardaires')}">Classement Forbes 2026</a> · Gouvernance · Successions · Conflits d’intérêts · Risques économiques</span><span aria-hidden="true" inert><a href="${link(from,'milliardaires')}">Classement Forbes 2026</a> · Gouvernance · Successions · Conflits d’intérêts · Risques économiques</span></div></div></div><div class="wm-controls"><button type="button" id="wm-pause" aria-pressed="false">Pause</button></div></aside></header><script>{const b=document.getElementById("wm-pause");b.addEventListener("click",()=>{const p=b.closest(".wealth-monitor").toggleAttribute("data-paused");b.setAttribute("aria-pressed",String(p));b.textContent=p?"Reprendre":"Pause"})}</script>`;
const footer = from => `<footer class="band"><div class="in cols"><div><div class="logo" style="color:#f5ede3">Actualites<span>.fr</span></div><p style="margin-top:8px">Global Billionaire Intelligence — fortunes, pouvoir, influence et risques.</p></div><div><b style="color:#f5ede3">Classements</b><p><a href="${link(from, 'milliardaires')}">Les 200 plus grandes fortunes</a><br><a href="${link(from, 'milliardaires/femmes')}">Les femmes milliardaires</a><br><a href="${link(from, 'milliardaires/france')}">Les milliardaires français</a><br><a href="${link(from, 'milliardaires/moins-de-40-ans')}">Les milliardaires de moins de 40 ans</a></p></div><div><b style="color:#f5ede3">Méthode</b><p>Fortunes : ${esc(SRC_FORBES)} ; Challenges 2026 pour la France. <a href="${home(from, 'methode')}">Méthodologie et corrections</a>.</p></div><div><b style="color:#f5ede3">Éditeur</b><p>Édité par DeepSci Labs<br><a href="${link(from, 'mentions-legales')}">Mentions légales</a><br><a href="${link(from, 'cgu')}">Conditions d'utilisation</a><br><a href="${link(from, 'confidentialite')}">Confidentialité</a><br><a href="${link(from,'contact')}?objet=correction">Signaler une erreur ou contacter la rédaction</a></p></div></div></footer>`;
const page = ({ from, title, desc, canonical, body, jsonld = [] }) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${canonical}">
<meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="Actualites.fr">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}/${canonical}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,700;1,6..96,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${asset(from, 'assets/site.css')}">
<style>
.wealth-monitor{background:#26152a;color:#f5ede3;font:11px Inter,sans-serif;border-bottom:1px solid #b8892d;overflow:hidden}
.wm-line{display:flex;align-items:center;min-height:26px;border-bottom:1px solid #ffffff18;gap:12px}
.wm-label{flex:0 0 190px;padding:0 12px;color:#e2c27a;font-weight:600;white-space:nowrap}
.wm-label:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#e2c27a;margin-right:8px;animation:wm-pulse 3s infinite}
.wm-window{overflow:hidden;flex:1;min-width:0;mask-image:linear-gradient(90deg,transparent,#000 2%,#000 96%,transparent)}
.wm-track{display:flex;width:max-content;animation:wm-scroll 42s linear infinite}
.wm-line:nth-child(2) .wm-track{animation-duration:52s}.wm-line:nth-child(3) .wm-track{animation-duration:62s}
.wm-track span{white-space:nowrap;padding-right:32px}.wm-track a{color:inherit;text-decoration:underline;text-underline-offset:3px}
.wm-line:hover .wm-track,.wm-line:focus-within .wm-track,.wealth-monitor[data-paused] .wm-track,.wealth-monitor[data-paused] .wm-label:before{animation-play-state:paused}
.wm-controls{display:flex;justify-content:space-between;align-items:center;padding:3px 12px;color:#d8c8d8;font-size:10px}.wm-controls button{background:none;border:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline}
@keyframes wm-scroll{to{transform:translateX(-50%)}}@keyframes wm-pulse{50%{opacity:.35}}
@media(max-width:600px){.wm-label{flex-basis:120px;font-size:9px;padding:0 7px}.wm-line{gap:4px}}
@media(prefers-reduced-motion:reduce){.wm-track,.wm-label:before{animation:none}.wm-window{overflow:auto;mask-image:none}}

.wealth-monitor{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;align-items:stretch}
.wealth-monitor .wm-line{min-width:0;min-height:29px;border-bottom:0;border-right:1px solid #ffffff28;gap:6px}
.wealth-monitor .wm-label{flex:0 0 auto;padding:0 8px;font-size:10px}
.wealth-monitor .wm-window{min-width:0}
.wealth-monitor .wm-controls{padding:0 7px;justify-content:center}
@media(max-width:600px){.wealth-monitor .wm-line{flex-direction:column;align-items:stretch;justify-content:center;gap:2px;padding:3px 0;min-height:37px}.wealth-monitor .wm-label{font-size:8px;padding:0 4px;overflow:hidden;text-overflow:ellipsis}.wealth-monitor .wm-window{width:100%;font-size:9px}.wealth-monitor .wm-controls{padding:0 4px}.wealth-monitor .wm-controls button{font-size:9px}}
.top .wealth-monitor{background:var(--night);border-top:1px solid #e2c27a26;border-bottom:0;max-width:1340px;margin:0 auto;padding:0 max(5vw,16px)}
@media(min-width:901px){html{scroll-padding-top:115px}}
@media(max-width:600px){.top .wealth-monitor{padding:0 4px}}
</style>
<script src="${asset(from,'assets/portrait-fallback.js')}"></script><script src="${asset(from,'assets/portrait-auto.js')}" defer></script>
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head><body>${header(from)}<main>${body}</main>${footer(from)}<script src="${asset(from, 'assets/guil.js')}" defer></script></body></html>`;
const write = (dir, html) => { const d = path.join(OUT, dir); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), html); };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.copyFileSync('src/site.css', path.join(OUT, 'assets/site.css'));
fs.copyFileSync('src/portrait-fallback.js',path.join(OUT,'assets/portrait-fallback.js'));
fs.copyFileSync('src/portrait-auto.js',path.join(OUT,'assets/portrait-auto.js'));
fs.copyFileSync('src/photo-review-console.js',path.join(OUT,'assets/photo-review-console.js'));
fs.copyFileSync('src/influence-live.js',path.join(OUT,'assets/influence-live.js'));
if(fs.existsSync('assets/brands'))fs.cpSync('assets/brands',path.join(OUT,'assets/brands'),{recursive:true});

fs.copyFileSync('src/wiki-live.js', path.join(OUT, 'assets/wiki-live.js'));
fs.writeFileSync(path.join(OUT,'assets/news-live.js'),"(async()=>{const el=document.querySelector('[data-news-profile]');if(!el)return;const id=el.dataset.newsProfile;if(!/^[a-z0-9-]+$/.test(id))return;try{const res=await fetch('https://actualites-biography-discovery.actualites-fr-next.workers.dev/news/'+id,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(17500)});if(!res.ok)throw Error('HTTP');const d=await res.json(),items=Array.isArray(d.items)?d.items:[],seen=new Set();el.replaceChildren();const stamp=d.attemptedAt;if(stamp){const t=document.createElement('p');t.className='small';t.textContent='Dernière collecte disponible : '+stamp.slice(0,10);el.append(t)}const grid=document.createElement('div');grid.className='wiki-press-grid';for(const x of items.sort((a,b)=>String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')))){try{const u=new URL(x.url);if(u.protocol!=='https:'||!x.title||seen.has(x.title.toLowerCase()))continue;seen.add(x.title.toLowerCase());const card=document.createElement('article');card.className='wiki-press-card';const meta=document.createElement('p');meta.className='wiki-press-meta';meta.textContent=(x.publisher||u.hostname)+(x.publishedAt?' · '+x.publishedAt:' · Date non renseignée');const h=document.createElement('h3');h.textContent=x.title;card.append(meta,h);const desc=document.createElement('p');const excerpt=String(x.description||x.excerpt||'').trim();desc.textContent=excerpt&&excerpt!==x.title?excerpt.split(/\\s+/).slice(0,25).join(' ')+(excerpt.split(/\\s+/).length>25?'…':''):'Aucun extrait fourni par la source.';card.append(desc);const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Lire l’article original ↗';card.append(a);grid.append(card);if(grid.children.length>=12)break}catch{}}if(grid.children.length)el.append(grid);else el.textContent='Aucun article disponible dans le corpus de veille pour le moment.'}catch{el.textContent='Le flux documentaire est temporairement indisponible.'}})();");

if (fs.existsSync('photos')) fs.cpSync('photos', path.join(OUT, 'photos'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'assets/guil.js'), `${rosette.toString()}\nfor(const e of document.querySelectorAll('[data-r]'))e.innerHTML=rosette(e.dataset.r,'r'+Math.random().toString(36).slice(2,8),e.dataset.i,'#b8892d',+e.dataset.d);\nfor(const e of document.querySelectorAll('[data-p]'))e.innerHTML=rosette(e.dataset.p,'p'+Math.random().toString(36).slice(2,8),'#e2c27a','#e2c27a',260).replace(/^<svg[^>]*>|<\\/svg>$/g,'');`);

// ---------- fiches ----------
const dossiers = {"elon-musk":[["Origines entrepreneuriales et premières cessions","Selon la biographie officielle de Tesla, Elon Musk a cofondé Zip2, société de logiciels et services Internet vendue à Compaq en mars 1999. Il a ensuite participé à la création de PayPal, acquis par eBay en octobre 2002. Ces deux cessions précèdent ses principaux engagements industriels.","https://ir.tesla.com/corporate/elon-musk"],["SpaceX : entreprise spatiale fondée en 2002","La NASA indique dans son dossier de mission CRS-4 que SpaceX a été fondée par Elon Musk en 2002. L’entreprise le présente comme son fondateur et directeur général. Ses activités et contrats spatiaux doivent être examinés séparément des autres entreprises auxquelles il est associé.","https://www.nasa.gov/wp-content/uploads/2018/07/spacex_nasa_crs-4_presskit.pdf"],["Tesla : direction et activités industrielles","La page officielle de relations investisseurs de Tesla identifie Elon Musk comme son directeur général. Le groupe développe des véhicules électriques, des solutions de stockage d’énergie et d’autres technologies. Une fonction de direction ne détermine pas à elle seule le niveau de participation personnelle au capital.","https://ir.tesla.com/corporate/elon-musk"],["Autres entreprises fondées ou cofondées","Tesla mentionne également Neuralink et The Boring Company parmi les entreprises dont Elon Musk est fondateur. Les relations économiques et juridiques entre ces sociétés nécessitent des sources propres à chaque transaction : leur présence dans une biographie ne démontre aucune fusion ni détention croisée.","https://ir.tesla.com/corporate/elon-musk"],["Acquisition de Twitter en 2022","Le 25 avril 2022, Twitter annonçait un accord de rachat par une entité contrôlée par Elon Musk pour environ 44 milliards de dollars, selon un communiqué déposé auprès de la SEC. La finalisation de l’opération le 28 octobre 2022 est documentée par le cabinet qui conseillait le conseil d’administration de Twitter.","https://www.sec.gov/Archives/edgar/data/1418091/000119312522117720/d319190dex991.htm"],["Gouvernance et rémunération chez Tesla en 2026","Le rapport trimestriel de Tesla pour septembre 2026 décrit les conséquences de la réintégration du plan de rémunération de 2018 : le conseil a constaté le 21 avril 2026 la déchéance de l’attribution intérimaire de 96 millions d’actions accordée en 2025. Il s’agit d’une information de gouvernance rapportée par la société, pas d’une estimation du patrimoine net de Musk.","https://www.sec.gov/Archives/edgar/data/1318605/000162828026066775/tsla-20260930.htm"]],"thomas-frist-jr":[["Origines et formation","Thomas Fearn Frist Jr. est né le 12 août 1938. Il étudie à Montgomery Bell Academy puis à Vanderbilt, dont il sort diplômé en 1961. Il obtient son diplôme de médecine à Washington University à Saint-Louis et sert comme médecin de l'US Air Force.","https://www.tnhealthcarehall.com/2021/06/17/thomas-f-frist-jr/"],["La naissance de HCA","En 1968, il fonde Hospital Corporation of America avec son père, le cardiologue Thomas Frist Sr., et l'entrepreneur Jack C. Massey. Leur modèle repose sur la gestion de plusieurs hôpitaux au sein d'une même entreprise. Cette organisation permet de mutualiser des fonctions administratives et de financer l'expansion du réseau.","https://news.vanderbilt.edu/2002/07/04/vanderbilt-names-frist-distinguished-alumni-60247/"],["Direction et crise de gouvernance","Après la fusion avec Columbia en 1994, Richard Scott dirige le groupe. En juillet 1997, Scott démissionne et Frist reprend les fonctions de président et directeur général. Cette succession intervient dans un contexte d'enquête fédérale sur les pratiques de facturation du groupe. Il convient de distinguer les faits concernant la société des responsabilités individuelles.","https://www.upi.com/Archives/1997/07/25/UPI-Focus-Report-Columbia-gets-new-chief/6097869803200/"],["Capital et transmission","En 2006, HCA fait l'objet d'un rachat avec effet de levier associant la famille Frist, Bain Capital, KKR et Merrill Lynch. Forbes chiffre alors l'opération à 33 milliards de dollars. Les liens avec ces investisseurs relèvent d'une transaction documentée, sans présumer d'une proximité personnelle.","https://images.forbes.com/lists/2006/54/biz_06rich400_Thomas-F-Frist-Jr-family_XA34.html"],["Dynastie et gouvernance","Ses fils Thomas Frist III et William Frist siègent au conseil de HCA selon Forbes. Thomas Frist Jr. n'occupe plus de fonction exécutive dans l'entreprise. Le maintien de la famille dans la gouvernance constitue un élément de continuité entre générations.","https://www.forbes.com/profile/thomas-frist-jr/"],["Philanthropie et culture","La fondation familiale trouve son origine dans une structure créée par HCA en 1982, devenue indépendante. Elle soutient des institutions et programmes du Tennessee central. La famille a également contribué à la création du Frist Art Museum à Nashville. Ces engagements publics attestent un soutien à la culture, sans établir ses préférences artistiques personnelles.","https://fristfoundation.org/about/"],["Habitudes et centres d'intérêt documentés","Forbes rapporte en 2017 que Frist pratiquait assidûment le marathon dans sa jeunesse et consacrait des courses quotidiennes de 90 minutes à réfléchir à des idées pour HCA. Cette habitude est historique : elle ne permet pas de déduire son emploi du temps actuel. Ses couleurs, plats et marques préférés ne sont pas établis dans les sources consultées.","https://www.forbes.com/sites/michelatindera/2017/08/15/meet-the-richest-person-in-tennessee-hca-healthcares-thomas-frist-jr/"],["Engagement associatif","En 1981, alors qu'il préside United Way of Middle Tennessee, Frist lance un programme de grands donateurs qui deviendra l'Alexis de Tocqueville Society. Vanderbilt lui décerne une distinction d'ancien élève en 2002.","https://news.vanderbilt.edu/2002/07/04/vanderbilt-names-frist-distinguished-alumni-60247/"]]};
const companyKeys = p => [...new Set(String(p.co||'').split(',').map(s=>s.trim().normalize('NFKC').toLocaleLowerCase('fr')).filter(s=>s.length>1))];
const sharedCompanies=(p,q)=>companyKeys(p).filter(k=>companyKeys(q).includes(k));
const economicLinks=(p,from)=>{
 const related=P.filter(q=>q.id!==p.id&&sharedCompanies(p,q).length>0);
 const list=related.map(q=>'<li><a href="'+link(from,'milliardaires/'+q.id)+'">'+esc(fullName(q))+'</a> — '+esc(String(p.co).split(',').map(s=>s.trim()).filter(s=>sharedCompanies(p,q).includes(s.normalize('NFKC').toLocaleLowerCase('fr'))).join(', '))+'</li>').join('');
 const groups=companyKeys(p).length?'<dl class="facts"><dt>Entreprises recensées</dt><dd>'+esc(p.co)+'</dd>'+(p.role?'<dt>Fonction recensée</dt><dd>'+esc(p.role)+'</dd>':'')+'</dl>':'<p>Entreprise non renseignée dans les données disponibles.</p>';
 return '<section style="margin:30px 0"><h2>Participations et entreprises associées</h2>'+groups+'<h3>Autres personnes liées aux mêmes entreprises dans le classement</h3>'+(list?'<ul>'+list+'</ul>':'<p>Aucune autre personne associée à la même entreprise n’est recensée dans ce classement.</p>')+'<p class="small">Correspondances de noms d’entreprises dans le classement Forbes 2026.</p></section>';
};
const dossierHtml=(p,from)=>{
 const researched=researchProfiles[p.id]||null;
 const sections=[...(dossiers[p.id]||[]),...(researched?.sections||[]).map(x=>[x.heading,x.body,x.source])];
 const peers=P.filter(q=>q.id!==p.id&&q.sec===p.sec).sort((a,b)=>Math.abs((a.nw||0)-(p.nw||0))-Math.abs((b.nw||0)-(p.nw||0))).slice(0,6);
 const details=sections.length
  ?'<section class="bio-section" id="parcours"><div class="bio-section-head"><p class="bio-eyebrow">Biography / Research</p><h2>Son histoire, ses entreprises et ses choix</h2><p>Des origines de la fortune aux principaux tournants professionnels.</p></div>'+sections.map(([heading,body,url],i)=>'<article class="bio-document"><div class="bio-document-index">'+String(i+1).padStart(2,'0')+'</div><div><h3>'+esc(heading)+'</h3><p>'+esc(body)+'</p><a class="bio-source-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Consulter le document source ↗</a></div></article>').join('')+'</section>'
  :'<section class="bio-section" id="parcours"><div class="bio-section-head"><p class="bio-eyebrow">Biography / Research</p><h2>Parcours documenté</h2></div><p class="bio-empty">Les principales étapes connues figurent dans le portrait et les informations économiques de cette page.</p></section>';
 const relations=p.id==='elon-musk'
  ?'<section class="bio-section" id="relations"><div class="bio-section-head"><p class="bio-eyebrow">Knowledge Graph / Relations publiques</p><h2>Relations professionnelles documentées</h2></div><dl class="facts"><dt>Tesla</dt><dd>Directeur général, selon les informations de la société</dd><dt>SpaceX</dt><dd>Fondateur et directeur général</dd><dt>Twitter / X</dt><dd>Acquisition réalisée en octobre 2022</dd><dt>Neuralink et The Boring Company</dt><dd>Entreprises dont Musk est fondateur, d’après Tesla</dd></dl><p class="bio-note"><a href="https://ir.tesla.com/corporate/elon-musk">Tesla</a> · <a href="https://ir.spacex.com/leadership/">SpaceX</a> · <a href="https://www.stblaw.com/elon-musk-completes-twitter-acquisition/">Cabinet conseil de Twitter</a>.</p></section>'
  :p.id==='thomas-frist-jr'
  ?'<section class="bio-section" id="relations"><div class="bio-section-head"><p class="bio-eyebrow">Knowledge Graph / Vérifié</p><h2>Relations professionnelles documentées</h2></div><dl class="facts"><dt>Thomas Frist Sr.</dt><dd>Père et cofondateur de HCA</dd><dt>Jack C. Massey</dt><dd>Cofondateur de HCA</dd><dt>Richard Scott</dt><dd>Dirigeant de Columbia/HCA, remplacé par Frist en 1997</dd><dt>KKR et Bain Capital</dt><dd>Investisseurs associés au rachat de 2006</dd></dl><p class="bio-note">Sources : <a href="https://news.vanderbilt.edu/2002/07/04/vanderbilt-names-frist-distinguished-alumni-60247/">Vanderbilt</a>, <a href="https://www.upi.com/Archives/1997/07/25/UPI-Focus-Report-Columbia-gets-new-chief/6097869803200/">UPI</a>, <a href="https://images.forbes.com/lists/2006/54/biz_06rich400_Thomas-F-Frist-Jr-family_XA34.html">Forbes</a>.</p></section>'
  :'';
 const companies='<section class="bio-section" id="entreprises"><div class="bio-section-head"><p class="bio-eyebrow">Knowledge Graph / Associations</p><h2>Entreprises et réseaux économiques</h2></div>'+economicLinks(p,from)+'</section>';
 const items=[...timeline(p.id),...(researched?.events||[]).map(e=>({date:e.date,type:e.type,title:e.title,sourceUrl:e.source}))].sort((a,b)=>a.date.localeCompare(b.date));
 const chronology='<section class="bio-section" id="chronologie"><div class="bio-section-head"><p class="bio-eyebrow">Billionaire Timeline</p><h2>Chronologie vérifiable</h2></div>'+(items.length?'<ol class="bio-timeline">'+items.map(e=>'<li><time>'+esc(e.date)+'</time><div><strong>'+esc(e.title)+'</strong><a href="'+esc(e.sourceUrl||sources.find(s=>s.id===e.source)?.url||'#sources')+'" target="_blank" rel="noopener noreferrer">Document original ↗</a></div></li>').join('')+'</ol>':'<p class="bio-empty">Les prochains événements historiques seront ajoutés à cette chronologie.</p>')+'</section>';
 const risk=p.id==='elon-musk'
  ?'<section class="bio-section" id="risques"><div class="bio-section-head"><p class="bio-eyebrow">Gouvernance</p><h2>Les controverses de gouvernance</h2></div><article class="bio-document"><div class="bio-document-index">2026</div><div><h3>Rémunération chez Tesla</h3><p>Le rapport de Tesla pour septembre 2026 relate la déchéance, le 21 avril 2026, d’une attribution intérimaire de 96 millions d’actions accordée en 2025, après le rétablissement judiciaire du plan de rémunération de 2018.</p><a class="bio-source-link" href="https://www.sec.gov/Archives/edgar/data/1318605/000162828026066775/tsla-20260930.htm" target="_blank" rel="noopener noreferrer">Déclaration Tesla à la SEC ↗</a></div></article></section>'
  :'';
 const publicPersonal=researched?.personal||{};
 const personalSections=[
  {id:'personnalite',title:'Un portrait à travers ses prises de position',eyebrow:'Portrait public',items:publicPersonal.personality||[]},
  {id:'gouts',title:'Goûts, passions et loisirs',eyebrow:'Vie quotidienne',items:publicPersonal.preferences||[]},
  {id:'vie-personnelle',title:'Famille et vie personnelle',eyebrow:'Biographie',items:publicPersonal.personalLife||[]},
  {id:'sentimental',title:'Vie sentimentale',eyebrow:'Relations publiques',items:publicPersonal.relationships||[]}
 ];
 const personalHtml=personalSections.filter(group=>group.items.length).map(group=>'<section class="bio-section" id="'+group.id+'"><div class="bio-section-head"><p class="bio-eyebrow">'+esc(group.eyebrow)+'</p><h2>'+esc(group.title)+'</h2></div>'+group.items.map((record,i)=>'<article class="bio-document"><div class="bio-document-index">'+String(i+1).padStart(2,'0')+'</div><div><h3>'+esc(record.heading)+'</h3><p>'+esc(record.body)+'</p><a class="bio-source-link" href="'+esc(record.source)+'" target="_blank" rel="noopener noreferrer">Lire la source ↗</a></div></article>').join('')+'</section>').join('');
 const publicRisks=publicPersonal.documentedRisks||[];
 const documentedRiskHtml=publicRisks.length?'<section class="bio-section" id="risques-personnels"><div class="bio-section-head"><p class="bio-eyebrow">Enquête et controverses</p><h2>Épisodes controversés</h2></div>'+publicRisks.map((record,i)=>'<article class="bio-document"><div class="bio-document-index">'+String(i+1).padStart(2,'0')+'</div><div><h3>'+esc(record.heading)+'</h3><p>'+esc(record.body)+'</p><a class="bio-source-link" href="'+esc(record.source)+'" target="_blank" rel="noopener noreferrer">Lire l’enquête ↗</a></div></article>').join('')+'</section>':'';
 const speeches=researched?.speechSamples||[];
 const behavior='<section class="bio-section" id="analyses"><div class="bio-section-head"><p class="bio-eyebrow">Billionaire Behavioral Lab / Observation</p><h2>Discours et décisions publics</h2><p>Observations lexicales sur de courts extraits attribués, avec date et source. Les comptes de mots mesurent ces extraits, pas la personnalité de l’auteur.</p></div>'+(speeches.length?speeches.map(sample=>{const m=publicSpeechMetrics(sample);return '<article class="bio-document"><div class="bio-document-index">'+esc(sample.date.slice(0,4))+'</div><div><h3>Déclaration du '+esc(sample.date)+'</h3><blockquote lang="'+esc(sample.language)+'" class="bio-quote">'+esc(sample.text)+'</blockquote><p class="bio-note">'+m.words+' mots · '+m.uniqueWords+' mots distincts · termes collectifs : '+m.frequencies.collective+' · termes associés au futur : '+m.frequencies.future+' (dans cet extrait seulement).</p><a class="bio-source-link" href="'+esc(sample.url)+'" target="_blank" rel="noopener noreferrer">Lire la déclaration originale ↗</a></div></article>';}).join(''):'<p class="bio-empty">Aucun extrait de discours attribué, daté et validé n’est encore enregistré pour cette personne.</p>')+'<p class="bio-note">Mesures exploratoires, sensibles à la langue et à la sélection des extraits. Elles ne permettent aucun diagnostic psychologique, classement de personnalité, mesure de sincérité ou prédiction individuelle.</p></section>';
 const experiment='<section class="bio-section" id="experiences"><div class="bio-section-head"><p class="bio-eyebrow">Experimental Lab / Protocole 01</p><h2>Expériences reproductibles</h2><p>Essai de sensibilité : nous comparons les comptages lexicaux avant et après suppression éventuelle de la première proposition jusqu’à la première virgule. L’objectif est de voir à quel point le résultat dépend du traitement du texte.</p></div>'+(speeches.length?speeches.map(sample=>{
 const x=experimentalSensitivity(sample);
 const deltas=Object.entries(x.changeInTermCounts).map(([key,value])=>'<li>'+esc(key)+' : '+(value>0?'+':'')+value+'</li>').join('');
 return '<article class="bio-document"><div class="bio-document-index">TEST</div><div><h3>Expérience sur l’extrait du '+esc(sample.date)+'</h3><p class="bio-note">Protocole : '+esc(x.protocolId)+' · Texte d’origine : '+x.baselineWords+' mots · Texte transformé : '+x.alternateWords+' mots · Transformation appliquée : '+(x.transformed?'oui':'non')+'</p><details><summary>Voir les variations de comptage (expérimental)</summary><ul>'+deltas+'</ul></details><a class="bio-source-link" href="'+esc(sample.url)+'" target="_blank" rel="noopener noreferrer">Source de l’extrait ↗</a></div></article>';
 }).join(''):'<p class="bio-empty">Aucune expérience individuelle n’a été exécutée : il faut d’abord un corpus de déclarations attribuées, datées et validées.</p>')+'<p class="bio-note">Aucun modèle d’inférence psychologique n’est exécuté dans cette version. Les futures comparaisons TweetNLP / pysentimiento exigeront vérification de licence, version des modèles, jeu de référence, mesures d’erreurs et revue avant publication. Les mesures ci-dessus concernent le texte, jamais la personnalité, la santé mentale ou la vie intime.</p></section>';
 const experimentRecord=experimentByPerson[p.id]||null;
 const experimentalRuns=experimentRecord?.results||[];
 const completedModels='<section class="bio-section" id="modeles-executes"><div class="bio-section-head"><p class="bio-eyebrow">Behavioral Lab / Tests exécutés</p><h2>Comparaison de traitements du langage</h2><p>Résultats reproductibles sur les extraits publiés dans les documents d’origine. Le score est attribué au texte, jamais à la personne.</p></div>'+(experimentalRuns.length?'<div class="bio-experiments">'+experimentalRuns.map(x=>'<article class="bio-document"><div class="bio-document-index">'+esc(x.date.slice(0,4))+'</div><div><h3>Texte du '+esc(x.date)+'</h3><dl class="facts"><dt>Mots examinés</dt><dd>'+Number(x.words)+'</dd><dt>Polarité du texte</dt><dd>'+Number(x.polarity).toFixed(3)+' (TextBlob : −1 à +1)</dd><dt>Subjectivité lexicale</dt><dd>'+Number(x.subjectivity).toFixed(3)+' (TextBlob : 0 à 1)</dd></dl><a class="bio-source-link" href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">Communiqué original ↗</a></div></article>').join('')+(experimentRecord.comparison?'<p class="bio-note">TF-IDF, similarité cosinus entre ces deux extraits : '+Number(experimentRecord.comparison.tfidfCosineSimilarity).toFixed(4)+'. Mesure fondée sur seulement deux courts textes, sans stabilité statistique ni valeur psychologique.</p>':'<p class="bio-note">Un seul extrait : aucune comparaison temporelle entre deux discours n’a été calculée.</p>'):'<p class="bio-empty">Aucun calcul de sentiment ou de similarité linguistique n’a été exécuté pour ce dossier.</p>')+'<p class="bio-note">Protocole local du '+esc(experimentRecord?.runDate||'2026-11-25')+'. TextBlob '+esc(experimentRecord?.models[0].version)+' ; scikit-learn '+esc(experimentRecord?.models[1].version)+'. Aucune conclusion sur la psychologie, l’intimité, les intentions ou l’évolution comportementale.</p></div></section>';
 const research='';
 const next='';
 const peersHtml=peers.length?'<section class="bio-section" id="comparaisons"><div class="bio-section-head"><p class="bio-eyebrow">Comparaison sectorielle</p><h2>Autres fortunes du même secteur</h2><p>Proximité de secteur et de fortune estimée, sans supposer de relation entre les personnes.</p></div><div class="grid">'+peers.map(q=>card(from,q)).join('')+'</div></section>':'';
 return details+personalHtml+companies+relations+chronology+risk+documentedRiskHtml+peersHtml+
 '<section class="bio-section" id="sources"><div class="bio-section-head"><p class="bio-eyebrow">Documentation</p><h2>Sources et corrections</h2></div><p>Les articles ci-dessus donnent accès aux documents cités et aux reportages consultés. Les données de fortune correspondent à l’édition 2026 du classement Forbes.</p><p class="bio-note"><a href="'+link(from,'contact')+'?objet=correction&amp;fiche='+encodeURIComponent(p.id)+'">Signaler une erreur</a> · <a href="'+home(from,'methode')+'">Méthodologie</a></p></section>';
};
const TOTAL = 20100; // fortune cumulée des 3 428 milliardaires Forbes 2026, en Md$
const MUSK = P[0].nw;
const pattern = id => `<svg class="pattern" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g transform="translate(1250 300) scale(7)" data-p="${id}"></g></svg>`;
for (const p of P) {
  const from = 'milliardaires/' + p.id;
  const sameCountry = P.filter(x => x !== p && x.country === p.country).slice(0, 3);
  const sameSec = P.filter(x => x !== p && x.sec === p.sec && !sameCountry.includes(x)).slice(0, 3);
  const i = P.indexOf(p); const near = P.slice(Math.max(0, i - 2), i + 3).filter(x => x !== p);
  const rankTxt = p.rank ? `${p.rank === 1 ? '1re' : p.rank + 'e'} fortune mondiale au classement Forbes 2026` : '';
  const story = [
    p.fact,
    p.bio && p.bio !== p.fact ? p.bio : '',
    p.rank ? `${fullName(p)} ${p.fam ? 'occupent' : 'occupe'} le ${p.rank === 1 ? '1er' : p.rank + 'e'} rang mondial, avec une fortune estimée à ${fr(p.nw)} milliards de dollars au 1er mars 2026.` : (p.nw != null ? `Fortune estimée à ${fr(p.nw)} milliards de dollars${String(p.srcNote||"").includes("1er mars 2026")?" au 1er mars 2026":""}.` : '')
  ].filter(Boolean);
  const facts = [['Fortune', nwTxt(p)], p.rank && ['Rang mondial', 'N° ' + p.rank + ' (Forbes 2026)'], p.co && ['Entreprises', p.co], p.role && ['Rôle', p.role], ['Secteur', SEC[p.sec]], ['Pays', p.country],
    (p.age || p.born) && ['Âge', p.age ? p.age + ' ans' + (p.rank ? ' (au 1er mars 2026)' : '') : (p.g === 'f' ? 'Née' : 'Né') + ' en ' + p.born],
    p.orig && ['Origine', { self: 'Fortune bâtie', herit: 'Fortune héritée', mix: 'Fortune mixte' }[p.orig]],
    ...(p.single ? [['Situation personnelle annoncée', `${esc(p.single.d)} : ${esc(p.single.t)} <span class="small">(source : <a href="${esc(p.single.u)}" rel="noopener noreferrer">${esc(p.single.src)}</a>)</span>`]] : [])].filter(Boolean);
  const quality=researchProfiles[p.id]||null;
  const referencedChapters=(quality?.sections?.length||0)+(dossiers[p.id]?.length||0);
  const referencedEvents=(quality?.events?.length||0)+timeline(p.id).length;
  const speechCount=quality?.speechSamples?.length||0;
  const dossierStatus=referencedChapters+referencedEvents?'Articles et événements documentés':'Portrait économique';
  const kpis = p.nw ? [[fr(p.nw / TOTAL * 100, 2) + ' %', 'de la fortune de tous les milliardaires du monde'], [fr(p.nw / MUSK * 100, p.nw / MUSK < .1 ? 1 : 0) + ' %', 'de la fortune d\'Elon Musk']] : [];
  const body = `<section class="inkband" id="identite">${pattern(p.id)}<div class="in band"><p class="small"><a href="${link(from, 'milliardaires')}">Milliardaires</a> · <a href="${link(from, 'milliardaires/secteur/' + SECSLUG[p.sec])}">${esc(SEC[p.sec])}</a> · <a href="${link(from, 'milliardaires/' + (p.country === 'France' ? 'france' : 'pays/' + slugify(p.country)))}">${esc(p.country)}</a></p>
<div class="hero" style="margin-top:6px"><div class="in" style="padding:10px 0 20px"><div><p class="tagline">${esc(rankTxt || 'Billion Index')}</p><h1 style="font-size:clamp(38px,5.6vw,64px)">${esc(fullName(p))}</h1>${p.role || p.co ? `<p class="lede" style="margin-top:14px">${esc([p.role, p.co].filter(Boolean).join(' · '))}</p>` : ''}<div class="row">${p.orig ? `<span class="chip">${{ self: 'Fortune bâtie', herit: 'Fortune héritée', mix: 'Fortune mixte' }[p.orig]}</span>` : ''}<span class="chip">${esc(SEC[p.sec])}</span></div></div>${billet(p, true, from)}</div></div></div></section>
<nav class="bio-nav" aria-label="Sommaire de la fiche"><div class="in"><a href="#identite">Portrait</a><a href="#parcours">Biographie</a><a href="#actualite">Actualités</a><a href="#questions">Questions</a><a href="#comparateur-fortunes">Comparer</a><a href="#contribuer">Contribuer</a>${quality?.personal?.personality?.length?'<a href="#personnalite">Portrait public</a>':''}${quality?.personal?.preferences?.length?'<a href="#gouts">Loisirs</a>':''}${quality?.personal?.personalLife?.length?'<a href="#vie-personnelle">Famille</a>':''}${quality?.personal?.relationships?.length?'<a href="#sentimental">Vie sentimentale</a>':''}<a href="#entreprises">Entreprises</a>${p.id==='elon-musk'||p.id==='thomas-frist-jr'?'<a href="#relations">Relations</a>':''}<a href="#chronologie">Dates</a>${p.id==='elon-musk'?'<a href="#risques">Gouvernance</a>':''}${quality?.personal?.documentedRisks?.length?'<a href="#risques-personnels">Controverses</a>':''}<a href="#wikipedia">Wikipédia et sources</a><a href="#sources">Sources</a></div></nav>
<div class="band"><div class="in prof">
<div class="story"><div class="bio-intro"><p class="bio-eyebrow">Identity / Profile</p><h2>Profil et trajectoire</h2><p class="bio-intro-lede">Des origines de la fortune aux grandes décisions, avec des récits, des dates et des sources à explorer.</p></div>${story.map((t, j) => `<p${j ? '' : ' class="first"'}>${esc(t)}</p>`).join('')}
<section class="bio-section" id="actualite"><div class="bio-section-head"><p class="bio-eyebrow">REVUE DE PRESSE</p><h2>Dernières actualités : ${esc(p.name)}</h2><p>Articles associés à cette personnalité, repérés dans les flux de presse. Les extraits sont affichés lorsqu’ils sont fournis par leur éditeur.</p></div><div data-news-profile="${esc(p.id)}" data-news-name="${esc(p.name)}" aria-live="polite"><p class="small">Chargement des articles disponibles…</p></div><p class="small"><a target="_blank" rel="noopener noreferrer" href="https://news.google.com/search?q=${encodeURIComponent(p.name)}&amp;hl=fr&amp;gl=FR&amp;ceid=FR:fr">Voir également les résultats de presse récents ↗</a></p></section>
<script src="${asset(from,'assets/news-live.js')}" defer></script>
${dossierHtml(p,from)}
<section class="bio-section" id="questions"><div class="bio-section-head"><p class="bio-eyebrow">REPÈRES DOCUMENTÉS</p><h2>Questions sur ${esc(p.name)}</h2></div>${p.nw!=null?`<details open><summary>Quelle est la fortune estimée de ${esc(p.name)} ?</summary><p>${esc(nwTxt(p))}. ${sourceHtml(p.srcNote)}. Cette estimation ne représente pas un solde bancaire.</p></details>`:''}${p.co?`<details><summary>À quelles entreprises cette fortune est-elle associée ?</summary><p>${esc(p.co)}. <a href="${link(from,'entreprises')}">Explorer les entreprises recensées</a>.</p></details>`:''}<details><summary>Quelles autres fortunes comparer ?</summary><p>Consultez le <a href="${link(from,'milliardaires/secteur/'+SECSLUG[p.sec])}">classement ${esc(SEC[p.sec])}</a> et les <a href="${link(from,'milliardaires/'+(p.country==='France'?'france':'pays/'+slugify(p.country)))}">fortunes recensées : ${esc(p.country)}</a>.</p></details></section>
<section class="bio-section" id="comparateur-fortunes"><div class="bio-section-head"><p class="bio-eyebrow">COMPARATEUR</p><h2>Comparer les fortunes recensées</h2><p>Comparaison des estimations publiées, sans supposer de lien entre les personnes ni de date commune.</p></div>${p.nw!=null?`<div class="rule-box"><label for="compare-person">Comparer ${esc(p.name)} avec</label><select id="compare-person" style="display:block;width:100%;margin:12px 0;padding:10px">${P.filter(q=>q.id!==p.id&&q.nw>0).map(q=>`<option value="${esc(q.id)}" data-nw="${q.nw}">${esc(fullName(q))} — ${esc(nwTxt(q))}</option>`).join('')}</select><p><strong>${esc(nwTxt(p))}</strong> · <span id="compare-value"></span></p><div style="background:#ddd;height:12px;border-radius:4px;overflow:hidden"><div id="compare-bar-a" style="height:100%;background:#a77b32"></div></div><div style="background:#ddd;height:12px;border-radius:4px;overflow:hidden;margin-top:8px"><div id="compare-bar-b" style="height:100%;background:#5b4666"></div></div><p id="compare-ratio" aria-live="polite"></p><a id="compare-link" href="${link(from,'milliardaires')}">Ouvrir la fiche comparée</a></div><script>(function(){const s=document.getElementById("compare-person"),a=${p.nw},fmt=new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2});function update(){const o=s.selectedOptions[0];if(!o)return;const b=Number(o.dataset.nw),m=Math.max(a,b);document.getElementById("compare-value").textContent=fmt.format(b)+" Md$";document.getElementById("compare-bar-a").style.width=(a/m*100)+"%";document.getElementById("compare-bar-b").style.width=(b/m*100)+"%";document.getElementById("compare-ratio").textContent="Écart absolu : "+fmt.format(Math.abs(a-b))+" Md$";document.getElementById("compare-link").href=${JSON.stringify(link(from,'milliardaires'))}+o.value+"/";}s.addEventListener("change",update);update()})();</script>`:'<p>Estimation individuelle indisponible.</p>'}</section>
<section class="bio-section" id="avis-fiche"><div class="bio-section-head"><p class="bio-eyebrow">QUALITÉ DOCUMENTAIRE</p><h2>Cette fiche vous a-t-elle été utile ?</h2><p>Votre réponse aide la rédaction à choisir les dossiers à approfondir.</p></div><form data-feedback method="post" action="/api/feedback/" style="display:grid;gap:12px"><input type="hidden" name="fiche" value="${esc(p.id)}"><fieldset style="border:0;padding:0"><legend>Utilité de la fiche</legend><label style="margin-right:20px"><input type="radio" name="vote" value="yes" required> Oui</label><label><input type="radio" name="vote" value="no" required> Non</label></fieldset><label>Quel sujet souhaitez-vous approfondir ? (facultatif)<select name="topic" style="display:block;width:100%;padding:10px"><option value="">Aucune préférence</option><option value="fortune">Évolution de la fortune</option><option value="business">Entreprises et investissements</option><option value="life">Parcours biographique</option><option value="network">Réseaux professionnels</option><option value="news">Actualités</option></select></label><div hidden><label>Ne pas remplir<input name="website" tabindex="-1" autocomplete="off"></label></div><button class="btn pri" type="submit">Envoyer mon avis</button><p class="small" role="status" data-feedback-status></p><p class="small">Avis non publics, utilisés pour améliorer les fiches. <a href="${link(from,'confidentialite')}">Confidentialité</a></p></form><script>(function(){const f=document.querySelector("[data-feedback]"),s=f.querySelector("[data-feedback-status]"),b=f.querySelector("button");f.addEventListener("submit",async e=>{e.preventDefault();b.disabled=true;try{const r=await fetch(f.action,{method:"POST",body:new URLSearchParams(new FormData(f))});if(r.status===429){s.textContent="Un avis a déjà été enregistré récemment.";return}if(!r.ok)throw Error();s.textContent="Votre avis a été enregistré. Merci.";f.reset()}catch{s.textContent="Enregistrement impossible. Réessayez."}finally{b.disabled=false}})})();</script></section>
<section class="bio-section" id="contribuer"><div class="bio-section-head"><p class="bio-eyebrow">CONTRIBUTIONS DES LECTEURS</p><h2>Enrichir cette fiche</h2><p>Une source manque ? Une donnée mérite d’être précisée ? Proposez un document ou une correction à la rédaction. Les contributions ne sont pas publiées automatiquement.</p></div><div class="row"><a class="btn pri" href="${link(from,'contact')}?objet=correction&amp;fiche=${encodeURIComponent(p.id)}">Proposer une source ou une correction</a><a class="btn" href="${link(from,'ma-veille')}">Ma sélection personnelle</a></div></section>

<section class="bio-section wiki-panel" id="wikipedia" data-wiki-profile="${esc(p.id)}" aria-live="polite"><div class="bio-section-head"><p class="bio-eyebrow">Wikimedia / Recherche documentaire</p></div><p data-wiki-status>Recherche des références encyclopédiques…</p></section>
<script src="${asset(from, 'assets/wiki-live.js')}" defer></script>\n${kpis.length ? `<h2 style="margin-top:30px">En perspective</h2><div class="kpis">${kpis.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>` : ''}${(PHOTOS[p.id] || []).length ? `<h2 style="margin-top:30px">En images</h2><div class="gal">${PHOTOS[p.id].map(ph => `<figure><img src="${esc(phSrc(from, ph))}" alt="${esc(p.name + (ph.legende ? ', ' + ph.legende : ''))}" loading="lazy"><figcaption>${esc(ph.legende || '')} <span>© ${esc(ph.auteur || ph.credit)}, ${esc(ph.licence)}${ph.source ? ` · <a href="${esc(ph.source)}" rel="noopener">source</a>` : ''}</span></figcaption></figure>`).join('')}</div>` : ''}</div>
<aside><section class="rule-box" style="margin-bottom:20px"><p class="tagline">MON OBSERVATOIRE</p><h2 style="margin:8px 0">Suivre cette fortune</h2><p class="small">Retrouvez ce dossier dans votre sélection, sans créer de compte.</p><button class="btn pri" type="button" data-watch-id="${esc(p.id)}" aria-pressed="false">Ajouter à ma veille</button><p class="small" data-watch-status role="status"></p><a href="${link(from,'ma-veille')}">Ouvrir ma veille personnelle →</a><p class="small" style="margin-top:12px">Sélection conservée sur cet appareil. Les notifications automatiques et la synchronisation sont en préparation.</p></section><script>(function(){const b=document.querySelector("[data-watch-id]"),s=document.querySelector("[data-watch-status]"),k="actualites.watch.v1";function read(){try{const v=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(v)?v:[]}catch{return []}}function render(){const on=read().includes(b.dataset.watchId);b.setAttribute("aria-pressed",String(on));b.textContent=on?"Retirer de ma veille":"Ajouter à ma veille";}b.addEventListener("click",()=>{try{const a=read(),id=b.dataset.watchId,on=a.includes(id);localStorage.setItem(k,JSON.stringify(on?a.filter(x=>x!==id):[...a,id]));render();s.textContent=on?"Dossier retiré.":"Dossier ajouté à votre veille.";}catch{s.textContent="Le stockage local est indisponible."}});render()})();</script><h2>L'essentiel</h2><div class="rule-box" style="margin-bottom:16px"><p class="small" style="margin:0"><b>Documents disponibles.</b> ${esc(dossierStatus)}.</p><p class="small" style="margin:8px 0 0">${referencedChapters} chapitres documentaires · ${referencedEvents} événements datés · ${speechCount} extraits de discours enregistrés.</p></div><dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${k === 'Situation personnelle annoncée' ? v : esc(v)}</dd>`).join('')}</dl>
<div class="rule-box" style="margin-top:16px"><p class="small" style="margin:0"><b>Données financières.</b> ${p.rank ? 'Fortune, âge, rang, entreprises et faits : <a href="https://www.forbes.com.au/news/billionaires/the-forbes-billionaires-list-top-200/" rel="noopener">Forbes, World\'s Billionaires 2026</a> (données au 1er mars 2026), textes réécrits par la rédaction.' : sourceHtml(p.srcNote) + '.'} <a href="${link(from,'contact')}?objet=correction&amp;fiche=${encodeURIComponent(p.id)}">Signaler une erreur</a></p></div></aside>
</div></div>
<div class="band" style="padding-top:0"><div class="in">
${near.length ? `<h2>Fortunes voisines</h2><div class="grid">${near.map(x => card(from, x)).join('')}</div>` : ''}
${sameCountry.length ? `<h2 style="margin-top:36px">Autres fortunes : ${esc(p.country)}</h2><div class="grid">${sameCountry.map(x => card(from, x)).join('')}</div>` : ''}
${sameSec.length ? `<h2 style="margin-top:36px">Même secteur : ${esc(SEC[p.sec])}</h2><div class="grid">${sameSec.map(x => card(from, x)).join('')}</div>` : ''}
</div></div>`;
  const title = `${fullName(p)} : fortune${p.nw != null ? ' de ' + fr(p.nw) + ' milliards de dollars' : ''}, parcours, entreprises (2026)`;
  const desc = p.nw != null ? `${fullName(p)}${p.co ? ' (' + p.co + ')' : ''} : fortune estimée à ${fr(p.nw)} Md$${p.rank ? ', ' + p.rank + 'e fortune mondiale' : ''}. Parcours, rôle, faits clés et fortunes comparables, sources citées.` : `${fullName(p)} : parcours et situation publique, sources citées.`;
  write(from, page({
    from, title, desc, canonical: from + '/', body, jsonld: [
      { '@context': 'https://schema.org', '@type': 'Person', name: p.name, nationality: p.country, ...(p.nw != null && { netWorth: { '@type': 'MonetaryAmount', currency: 'USD', value: p.nw * 1e9 } }), url: `${SITE}/${from}/` },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Milliardaires', item: `${SITE}/milliardaires/` }, { '@type': 'ListItem', position: 2, name: p.name, item: `${SITE}/${from}/` }] }]
  }));
}

// ---------- listes ----------
const lists = [
  { dir: 'milliardaires', h: 'Les 200 plus grandes fortunes du monde', t: 'Les milliardaires les plus riches du monde en 2026 : le classement', d: 'Les 200 plus grandes fortunes du monde en 2026, avec fiche pour chaque milliardaire : fortune, pays, secteur, âge. Source Forbes.', f: p => p.rank },
  { dir: 'milliardaires/femmes', h: 'Les femmes les plus riches du monde', t: 'Les femmes milliardaires les plus riches du monde en 2026', d: 'Classement 2026 des femmes milliardaires : Alice Walton, Françoise Bettencourt Meyers, Julia Koch et les autres. Fortunes sourcées.', f: p => p.g === 'f' },
  { dir: 'milliardaires/france', h: 'Les milliardaires français', t: 'Les milliardaires français les plus riches en 2026', d: 'Les plus grandes fortunes françaises en 2026 : Arnault, Bettencourt Meyers, Wertheimer, Pinault, Besnier, Niel. Classements Forbes et Challenges.', f: p => p.country === 'France', extra: 'france' },
  { dir: 'milliardaires/moins-de-40-ans', h: 'Les milliardaires de moins de 40 ans', t: 'Les plus jeunes milliardaires du monde en 2026', d: 'Les milliardaires de moins de 40 ans en 2026 : héritiers et fondateurs de la tech et de l\'intelligence artificielle.', f: p => p.age && p.age < 40 }
];
const geographicGroups=[
 {slug:'chine-hong-kong',name:'Chine continentale et Hong Kong',countries:['Chine','Hong Kong']},
 {slug:'asie-orientale',name:'Asie orientale',countries:['Chine','Hong Kong','Taïwan','Japon','Corée du Sud']},
 {slug:'pays-arabes',name:'Pays arabes',countries:['Arabie saoudite','Émirats arabes unis','Qatar','Koweït','Bahreïn','Oman','Égypte','Liban','Maroc','Algérie','Tunisie','Jordanie','Irak','Syrie','Libye','Soudan','Yémen','Mauritanie','Somalie','Djibouti','Comores','Palestine']},
 {slug:'golfe',name:'Pays du Golfe (CCG)',countries:['Arabie saoudite','Émirats arabes unis','Qatar','Koweït','Bahreïn','Oman']},
 {slug:'afrique-du-nord',name:'Afrique du Nord',countries:['Maroc','Algérie','Tunisie','Libye','Égypte','Soudan']},
 {slug:'inde',name:'Inde',countries:['Inde']}
];
for(const g of geographicGroups) lists.push({dir:'milliardaires/region/'+g.slug,h:'Fortunes : '+g.name,t:'Les grandes fortunes recensées : '+g.name+' (2026)',d:'Profils disponibles dans notre corpus pour '+g.name+'. Couverture partielle, sans actifs souverains.',f:p=>g.countries.includes(p.country),regional:true});
const secs = [...new Set(P.map(p => p.sec))];
for (const s of secs) lists.push({ dir: 'milliardaires/secteur/' + SECSLUG[s], h: 'Milliardaires : ' + SEC[s], t: `Les milliardaires de la catégorie ${SEC[s].toLowerCase()} en 2026`, d: `Les plus grandes fortunes du secteur ${SEC[s].toLowerCase()} en 2026, avec fiche détaillée pour chacune.`, f: p => p.sec === s });
const countries = Object.entries(P.reduce((a, p) => (a[p.country] = (a[p.country] || 0) + 1, a), {})).filter(([, n]) => n >= 1).map(([c]) => c);
const cslug = c => slugify(c);
for (const c of countries) if (c !== 'France') lists.push({ dir: 'milliardaires/pays/' + cslug(c), h: 'Milliardaires : ' + c, t: `Les milliardaires les plus riches : ${c} (2026)`, d: `Les plus grandes fortunes de ce pays en 2026 (${c}), avec fiche détaillée pour chacune. Source Forbes.`, f: p => p.country === c });

const FRCH = [['Famille Arnault', 'LVMH', 116.7, 121.2], ['Héritiers Hermès', 'Hermès', 163.4, 114], ['Alain et Gérard Wertheimer', 'Chanel', 95, 95], ['Françoise Bettencourt Meyers', 'L\'Oréal', 73.8, 69.7], ['Rodolphe Saadé', 'CMA CGM', 35, 31.5], ['Emmanuel Besnier', 'Lactalis', null, 14.2]];
for (const L of lists) {
  const items = P.filter(L.f), from = L.dir, max = Math.max(1,...items.map(p => p.nw || 0));
  const chips = [['milliardaires', 'Monde'], ['milliardaires/femmes', 'Femmes'], ['milliardaires/france', 'France'], ['milliardaires/moins-de-40-ans', 'Moins de 40 ans'], ...countries.filter(c => c !== 'France').map(c => ['milliardaires/pays/' + cslug(c), c])];
  const frBlock = L.extra === 'france' ? `<h2 style="margin-top:40px">Le classement Challenges 2026</h2><p class="small">Fortunes professionnelles en milliards d'euros, publiées le 8 juillet 2026. Challenges compte par famille et en euros, Forbes par personne et en dollars : les chiffres diffèrent.</p><div class="scroll"><table><thead><tr><th>Fortune</th><th>Groupe</th><th class="n">2025</th><th class="n">2026</th></tr></thead><tbody>${FRCH.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="n">${r[2] == null ? 'n.d.' : fr(r[2], 1)}</td><td class="n">${fr(r[3], 1)}</td></tr>`).join('')}</tbody></table></div><p class="small">Bernard Arnault est devenu l'unique propriétaire de Challenges fin 2025.</p>` : '';
  const body = `<section class="inkband">${pattern(L.dir.replace(/\//g, '-'))}<div class="in band"><p class="tagline">Billion Index</p><h1 style="font-size:clamp(36px,5.4vw,60px);max-width:18ch">${esc(L.h)}</h1>
<p class="lede" style="margin-top:12px">${items.length} profils dans le corpus. ${esc(L.regional ? "Couverture partielle : ce classement ne recense pas toutes les fortunes de la région." : SRC_FORBES)}.</p></div></section><div class="band"><div class="in">
<div class="row" style="margin:0 0 26px">${chips.slice(0, 4).map(([d, l]) => `<a class="btn${d === from ? ' pri' : ''}" href="${link(from, d)}">${esc(l)}</a>`).join('')}<a class="btn" href="${link(from, 'recherche')}">Recherche avancée</a></div>
${items.length >= 3 ? `<div class="grid podium" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:26px;margin:10px 0 34px">${items.slice(0, 3).map(p => `<a href="${link(from, 'milliardaires/' + p.id)}" style="text-decoration:none">${billet(p, false, from)}</a>`).join('')}</div>` : ''}<div class="bars">${items.map((p, i) => `<a class="bar${i ? '' : ' top1'}" href="${link(from, 'milliardaires/' + p.id)}"><span>${i + 1}. ${esc(fullName(p))}</span><div class="t"><div class="f" style="width:${p.nw ? (p.nw / max * 100).toFixed(1) : 0}%"></div></div><span class="v">${nwTxt(p)}</span></a>`).join('')}</div>
${items.length===0?'<p class="small">Aucun profil publié dans ce périmètre à ce jour. Cela ne signifie pas qu’aucun milliardaire n’y existe.</p>':''}
${frBlock}
<h2 style="margin-top:40px">Explorer par région</h2><div class="row">${geographicGroups.map(g=>`<a class="btn" href="${link(from,'milliardaires/region/'+g.slug)}">${esc(g.name)} (${P.filter(p=>g.countries.includes(p.country)).length})</a>`).join('')}</div>
<h2 style="margin-top:40px">Explorer par pays et par secteur</h2>
<div class="row">${chips.slice(4).map(([d, l]) => `<a class="btn" href="${link(from, d)}">${esc(l)}</a>`).join('')}</div>
<div class="row" style="margin-top:10px">${secs.map(s => `<a class="btn" href="${link(from, 'milliardaires/secteur/' + SECSLUG[s])}">${esc(SEC[s])}</a>`).join('')}</div>
</div></div>`;
  write(from, page({
    from, title: L.t, desc: L.d, canonical: from + '/', body, jsonld: [{
      '@context': 'https://schema.org', '@type': 'ItemList', name: L.h, numberOfItems: items.length,
      itemListElement: items.slice(0, 100).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/milliardaires/${p.id}/`, name: p.name }))
    }]
  }));
}



// ---------- rubriques documentaires autonomes, accessibles sans routage JavaScript ----------
const hubHead=(eyebrow,title,subtitle)=>'<section class="inkband"><div class="in band"><p class="tagline">'+esc(eyebrow)+'</p><h1>'+esc(title)+'</h1><p class="lede" style="margin-top:13px">'+esc(subtitle)+'</p></div></section>';
const hubWrap=(content)=>'<div class="band"><div class="in hub-page">'+content+'</div></div>';
const hubSection=(title,subtitle,cards)=>'<section class="hub-part"><div class="hub-heading"><h2>'+esc(title)+'</h2>'+(subtitle?'<p>'+esc(subtitle)+'</p>':'')+'</div><div class="grid hub-cards">'+cards+'</div></section>';
const hubCard=(from,p,detail)=>'<a class="card hub-profile" href="'+link(from,'milliardaires/'+p.id)+'">'+medal(p,64,from)+'<div><h3>'+esc(fullName(p))+'</h3><p>'+esc(detail||[p.co,SEC[p.sec],p.country].filter(Boolean).join(' · '))+'</p><strong>'+esc(nwTxt(p))+'</strong></div></a>';
const hubWrite=(dir,title,description,body)=>write(dir,page({from:dir,title:title+' · Actualites.fr',desc:description,canonical:dir+'/',body}));

const companyIndex=new Map();
for(const p of P){
 const names=new Set(String(p.co||'').split(/[,;/]/).map(x=>x.trim()).filter(x=>x.length>=3));
 for(const name of names){const id=normalizeCompany(name);if(!companyIndex.has(id))companyIndex.set(id,{name,people:[]});companyIndex.get(id).people.push(p)}
}
function normalizeCompany(v){return v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
const companyGroups=[...companyIndex.values()].sort((a,b)=>b.people.length-a.people.length||a.name.localeCompare(b.name,'fr'));
const activeSectors=Object.entries(SEC).map(([k,name])=>({id:k,name,people:P.filter(p=>p.sec===k)})).filter(x=>x.people.length).sort((a,b)=>b.people.length-a.people.length);
const sectorCards=activeSectors.map(item=>'<a class="card hub-sector" href="'+link('entreprises','milliardaires/secteur/'+SECSLUG[item.id])+'"><h3>'+esc(item.name)+'</h3><p>'+item.people.length+' profils associés</p><strong>'+esc(item.people.slice(0,3).map(p=>p.name).join(' · '))+'</strong></a>').join('');
const bigCompanyCards=companyGroups.filter(x=>x.people.length>1).slice(0,22).map(item=>'<article class="card hub-company"><h3>'+esc(item.name)+'</h3><p>'+item.people.length+' personnalités associées dans notre corpus</p><div class="hub-company-links">'+item.people.slice(0,8).map(p=>'<a href="'+link('entreprises','milliardaires/'+p.id)+'">'+esc(p.name)+'</a>').join('')+'</div></article>').join('');
hubWrite('entreprises','Entreprises et groupes associés aux grandes fortunes',
 'Explorez les secteurs, groupes et personnes présents dans le classement des grandes fortunes.',
 hubHead('Billionaire Knowledge Graph','Les entreprises derrière les fortunes','Explorez les groupes et les secteurs, puis ouvrez les biographies des personnes concernées.')+
 hubWrap('<div class="hub-metrics"><div><b>'+companyIndex.size+'</b><span>noms d’entreprises recensés</span></div><div><b>'+activeSectors.length+'</b><span>secteurs d’activité</span></div><div><b>'+P.length+'</b><span>fiches personnelles</span></div></div>'+
 hubSection('Secteurs économiques','Classement par nombre de personnalités présentes dans le corpus.',sectorCards)+
 hubSection('Groupes associés à plusieurs fortunes','Les liens ci-dessous proviennent des entreprises mentionnées dans les fiches. Ils peuvent correspondre à des situations différentes : héritiers, cofondateurs ou dirigeants.',bigCompanyCards)));

const influenceDashboard=renderInfluenceDashboard({people:P,companyGroups,researchProfiles,link,escape:esc,format:fr,sectorNames:SEC,asset});
hubWrite('influence','Influence économique, dynasties et réseaux',
 'Graphiques, réseaux économiques, entreprises et décisions publiques des grandes fortunes.',influenceDashboard.html);

const influenceNetworkPages=companyGroups.filter(g=>g.people.length>=2).slice(0,14).map(group=>{
 const route='influence/reseaux/'+slugify(group.name);
 const peopleRows=group.people.map(p=>'<a class="card hub-profile" href="'+link(route,'milliardaires/'+p.id)+'">'+medal(p,64,route)+'<div><h3>'+esc(fullName(p))+'</h3><p>'+esc([p.country,SEC[p.sec],p.orig==='herit'?'Fortune héritée':p.orig==='mix'?'Origine mixte':p.orig==='self'?'Création personnelle':null].filter(Boolean).join(' · '))+'</p><strong>'+esc(nwTxt(p))+'</strong></div></a>').join('');
 const title=group.name+' : réseau de '+group.people.length+' grandes fortunes';
 const intro='Explorez les '+group.people.length+' personnes du classement Forbes 2026 associées au groupe '+group.name+', leurs fortunes estimées, pays et biographies.';
 const body=hubHead('LE RÉSEAU / '+group.name,title,intro)+
  hubWrap('<div class="hub-metrics"><div><b>'+group.people.length+'</b><span>profils associés à ce groupe</span></div><div><b>'+new Set(group.people.map(p=>p.country)).size+'</b><span>pays représentés dans ce sous-ensemble</span></div></div>'+
  '<section class="hub-part"><h2>Les personnalités liées à '+esc(group.name)+'</h2><p>Relations issues de noms d’entreprises recensés dans le classement. Les fonctions, participations et appartenances familiales sont à préciser dans chaque biographie.</p><div class="grid hub-cards">'+peopleRows+'</div></section>'+
  '<section class="hub-part"><h2>Explorer et comparer</h2><p>Comparez ce groupe aux autres réseaux identifiés, consultez les documents de ses membres et partagez cette sélection.</p><div class="inf-pro-actions"><a class="inf-primary" href="'+link(route,'influence')+'?g='+encodeURIComponent(group.name)+'#reseaux">Voir le graphe interactif</a><a href="'+link(route,'entreprises')+'">Toutes les entreprises</a></div></section>');
 write(route,page({from:route,title:title+' · Actualites.fr',desc:intro,canonical:route+'/',body}));
 return route;
});


const riskEntries=[];
for(const p of P){const r=researchProfiles[p.id]?.personal?.documentedRisks||[];for(const e of r){if(e.heading&&e.body&&/^https:\/\//.test(e.source||''))riskEntries.push({person:p,item:e})}}
const governanceEvents=P.flatMap(p=>timeline(p.id)).filter(x=>x.type==='governance'&&sources.some(s=>s.id===x.source&&/^https:\/\//.test(s.url||'')));
const riskRecords=[
 ...riskEntries.map(({person,item})=>({person,category:'Dossier documentaire',date:/^\d{4}(?:-\d{2}){0,2}$/.test(item.date||'')?item.date:'',title:item.heading,body:item.body,url:item.source,anchor:'#risques-personnels'})),
 ...governanceEvents.map(e=>({person:P.find(p=>p.id===e.person),category:'Gouvernance',date:e.date,title:e.title,body:e.scope==='company'?'Événement concernant une entreprise associée. Il ne constitue pas une attribution de responsabilité individuelle.':'Événement de gouvernance recensé dans la chronologie documentaire.',url:sources.find(s=>s.id===e.source).url,anchor:''}))
].filter(r=>r.person).sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title,'fr'));
const riskPeople=[...new Map(riskRecords.map(r=>[r.person.id,r.person])).values()].sort((a,b)=>fullName(a).localeCompare(fullName(b),'fr'));
const riskCategories=[...new Set(riskRecords.map(r=>r.category))];
const riskCards=riskRecords.map(r=>'<article class="card risk-record" data-person="'+esc(r.person.id)+'" data-category="'+esc(r.category)+'" data-date="'+esc(r.date)+'"><div class="risk-meta"><span>'+esc(r.category)+'</span><time>'+esc(r.date||'Date non renseignée dans le corpus')+'</time></div><p class="tagline">'+esc(fullName(r.person))+'</p><h3>'+esc(r.title)+'</h3><details><summary>Contexte documentaire</summary><p>'+esc(r.body)+'</p></details><div class="hub-company-links"><a href="'+link('risques','milliardaires/'+r.person.id)+r.anchor+'">Biographie</a><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">Document source ↗</a></div></article>').join('');
const riskCss='<style>.risk-layout{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}.risk-list{display:grid;gap:14px}.risk-record{padding:24px;display:grid;gap:10px}.risk-record[hidden]{display:none!important}.risk-meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;font-size:.8rem;color:inherit}.risk-meta span{border:1px solid currentColor;border-radius:4px;padding:3px 8px}.risk-record summary{cursor:pointer;font-weight:600}.risk-side{padding:20px;position:sticky;top:20px}.risk-controls{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin:18px 0}.risk-controls label{display:grid;gap:6px;font-size:.82rem;font-weight:600}.risk-controls input,.risk-controls select{width:100%;padding:12px;border:1px solid #a7a29b;border-radius:5px;background:#fff;color:#252525;min-width:0}.risk-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:14px 0;flex-wrap:wrap}.risk-toolbar button,.risk-side button{cursor:pointer;padding:9px 14px;border:1px solid currentColor;border-radius:4px;background:transparent;color:inherit;font:inherit}.risk-side p{margin:12px 0}.risk-note{margin-top:20px}.risk-record h3{margin:0}.risk-side ul{padding-left:20px}.risk-side li{margin:8px 0}@media(max-width:780px){.risk-layout{grid-template-columns:1fr}.risk-controls{grid-template-columns:1fr}.risk-side{position:static}}</style>';
const riskJs='<script>(function(){const q=document.getElementById("risk-q"),p=document.getElementById("risk-person"),c=document.getElementById("risk-cat"),sort=document.getElementById("risk-sort"),list=document.getElementById("risk-list"),count=document.getElementById("risk-count"),empty=document.getElementById("risk-empty"),cards=Array.from(list.querySelectorAll(".risk-record"));const norm=s=>s.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().trim();function filter(){let n=0;const term=norm(q.value);const sorted=cards.slice().sort((a,b)=>sort.value==="old"?((!a.dataset.date)-(!b.dataset.date)||a.dataset.date.localeCompare(b.dataset.date)):b.dataset.date.localeCompare(a.dataset.date));for(const el of sorted){const yes=(!term||norm(el.textContent).includes(term))&&(!p.value||p.value===el.dataset.person)&&(!c.value||c.value===el.dataset.category);el.hidden=!yes;list.appendChild(el);if(yes)n++;}count.textContent=n+" résultat(s) sur "+cards.length;empty.hidden=n!==0;}for(const el of [q,p,c,sort])el.addEventListener(el===q?"input":"change",filter);document.getElementById("risk-reset").addEventListener("click",()=>{q.value=p.value=c.value="";sort.value="new";filter()});filter();})();</script>';
hubWrite('risques','Billionaire Risk Monitor — événements documentés',
 'Explorez les événements de gouvernance et dossiers documentaires des grandes fortunes. Sources, chronologie et filtres.',
 riskCss+hubHead('ACTUALITES.FR / BILLIONAIRE RISK MONITOR','Gouvernance, procédures et controverses','Un observatoire documentaire des événements publics associés aux grandes fortunes. Chaque entrée renvoie à une source et à une biographie.')+
 hubWrap('<div class="hub-metrics"><div><b>'+riskRecords.length+'</b><span>entrées documentaires</span></div><div><b>'+riskPeople.length+'</b><span>personnalités couvertes</span></div><div><b>'+riskRecords.filter(r=>r.date).length+'</b><span>entrées datées</span></div><div><b>'+new Set(riskRecords.map(r=>r.url)).size+'</b><span>documents sources distincts</span></div></div>'+
 '<section class="hub-part"><h2>Explorer les événements</h2><p>Recherchez dans les dossiers publiés. Les dates absentes ne sont pas estimées.</p><div class="risk-controls"><label>Recherche<input id="risk-q" type="search" placeholder="Nom, entreprise, événement"></label><label>Personnalité<select id="risk-person"><option value="">Toutes</option>'+riskPeople.map(p=>'<option value="'+esc(p.id)+'">'+esc(fullName(p))+'</option>').join('')+'</select></label><label>Catégorie<select id="risk-cat"><option value="">Toutes</option>'+riskCategories.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('')+'</select></label></div><div class="risk-toolbar"><span id="risk-count" role="status">'+riskRecords.length+' résultat(s)</span><label>Ordre <select id="risk-sort"><option value="new">Plus récent</option><option value="old">Plus ancien</option></select></label><button type="button" id="risk-reset">Réinitialiser</button></div><div class="risk-layout"><div><div id="risk-list" class="risk-list">'+riskCards+'</div><p id="risk-empty" hidden>Aucun dossier ne correspond à ces critères.</p></div><aside class="card risk-side"><p class="tagline">MÉTHODOLOGIE</p><h3>Lire les dossiers</h3><ul><li>Les événements d’entreprise ne prouvent pas une faute individuelle.</li><li>Une accusation ou une enquête ne vaut pas condamnation.</li><li>La présence ou l’absence de dossier ne constitue pas un score de risque.</li></ul><p>La couverture reste partielle : '+riskPeople.length+' profils sur '+P.length+'.</p><a href="'+link('risques','intelligence')+'">Découvrir Intelligence Pro</a></aside></div></section><section class="hub-note risk-note"><h2>Surveillance professionnelle</h2><p>Vous consultez un dossier aujourd’hui. Comment saurez-vous qu’une nouvelle pièce est publiée demain ? Intelligence Pro prépare des listes suivies et des bulletins de changements sourcés. Ces fonctions ne sont pas encore disponibles.</p><a href="'+link('risques','intelligence')+'">Découvrir le suivi professionnel</a></section>'+riskJs));

const newUnranked=P.filter(p=>p.rank==null).sort((a,b)=>(b.nw??-1)-(a.nw??-1));
const young=P.filter(p=>p.age!=null&&p.age<40).sort((a,b)=>(b.nw??-1)-(a.nw??-1));
hubWrite('next-billionaires','Next Billionaires — nouvelles fortunes et relève',
 'Les fortunes émergentes, les moins de quarante ans et les candidats suivis hors du top 200.',
 hubHead('Next Billionaires','Les fortunes de demain','Suivez les personnalités hors des deux cents premières fortunes et la nouvelle génération déjà présente dans le classement.')+
 hubWrap(hubSection('Profils hors du Top 200','Personnalités suivies dans le site, sans les présenter comme des prédictions de richesse future.',newUnranked.map(p=>hubCard('next-billionaires',p)).join(''))+
 hubSection('Les fortunes de moins de 40 ans','Jeunes milliardaires recensés dans les données Forbes 2026.',young.slice(0,24).map(p=>hubCard('next-billionaires',p)).join(''))+
 '<div class="hub-note"><h2>Suivre les nouveaux entrants</h2><p>La veille biographique collecte des documents sur les personnalités répertoriées. Les annonces de financement et de participation devront être ajoutées au corpus avant l’établissement d’une liste de candidats qui ne sont pas encore milliardaires.</p></div>'));

const searchRows=P.map(p=>({id:p.id,name:fullName(p),country:p.country,co:p.co,sec:SEC[p.sec],nw:p.nw,age:p.age,orig:p.orig||''}));
const searchCards=P.map(p=>'<a class="card hub-profile hub-search-card" data-search="'+esc([p.name,p.co,p.country,SEC[p.sec]].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())+'" data-sector="'+esc(p.sec)+'" href="'+link('recherche','milliardaires/'+p.id)+'">'+medal(p,60,'recherche')+'<div><h3>'+esc(p.name)+'</h3><p>'+esc([p.co,p.country].filter(Boolean).join(' · '))+'</p><strong>'+nwTxt(p)+'</strong></div></a>').join('');
hubWrite('recherche','Recherche avancée des grandes fortunes',
 'Moteur de recherche par nom, entreprise, pays et secteur sur les biographies du corpus.',
 hubHead('Billionaire Finder','Rechercher dans '+P.length+' biographies','Parcourez les personnes, entreprises, pays et secteurs à partir des données publiées.')+
 hubWrap('<div class="hub-searchbar"><label for="hubQuery">Personne, entreprise ou pays</label><input id="hubQuery" type="search" autocomplete="off" placeholder="Ex. Microsoft, Arnault, France"><label for="hubSector">Secteur</label><select id="hubSector"><option value="">Tous les secteurs</option>'+activeSectors.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('')+'</select></div><p id="hubCount" class="small" role="status">'+P.length+' fiches</p><div class="grid hub-cards" id="hubResults">'+searchCards+'</div>'+
 '<script>const q=document.getElementById("hubQuery"),sector=document.getElementById("hubSector"),cards=[...document.querySelectorAll(".hub-search-card")],count=document.getElementById("hubCount");function filter(){const v=q.value.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase(),s=sector.value;let n=0;for(const c of cards){const yes=(!v||c.dataset.search.includes(v))&&(!s||c.dataset.sector===s);c.hidden=!yes;if(yes)n++}count.textContent=n+" fiche"+(n>1?"s":"")+" correspondante"+(n>1?"s":"")}q.addEventListener("input",filter);sector.addEventListener("change",filter);</script>'));

const watchData=P.map(p=>({id:p.id,name:fullName(p),company:p.co||'',country:p.country,fortune:nwTxt(p),url:link('ma-veille','milliardaires/'+p.id)}));
hubWrite('ma-veille','Ma veille personnelle','Retrouvez les dossiers que vous avez sélectionnés sur cet appareil.',
 hubHead('ACTUALITES.FR / MON OBSERVATOIRE','Ma veille personnelle','Votre sélection de grandes fortunes, accessible sans compte.')+
 hubWrap('<section class="hub-part"><div class="hub-heading"><h2>Mes dossiers suivis</h2><p>Retrouvez vos biographies et leurs documents. Cette sélection est enregistrée dans votre navigateur.</p></div><p id="watch-count" role="status"></p><div id="watch-results" class="grid hub-cards"></div><p><a class="btn" href="'+link('ma-veille','recherche')+'">Ajouter des personnalités</a> <button class="btn" type="button" id="watch-export">Exporter ma sélection (CSV)</button></p></section><section class="hub-note"><h2>Et si les dossiers évoluent ?</h2><p>Votre liste gratuite vous permet de retrouver les informations. Intelligence Pro prépare la surveillance automatique des changements, les bulletins sourcés et la synchronisation. Ces fonctions ne sont pas encore disponibles.</p><a href="'+link('ma-veille','intelligence')+'">Découvrir le suivi professionnel</a></section><script id="watch-data" type="application/json">'+JSON.stringify(watchData).replace(/</g,'\\u003c')+'</script><script>(function(){const k="actualites.watch.v1",data=JSON.parse(document.getElementById("watch-data").textContent),out=document.getElementById("watch-results"),count=document.getElementById("watch-count"),exp=document.getElementById("watch-export");function read(){try{const v=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(v)?v:[]}catch{return []}}function selected(){return data.filter(x=>read().includes(x.id))}function render(){const rows=selected();out.replaceChildren();count.textContent=rows.length?rows.length+" dossier(s) suivi(s)":"Votre sélection est vide. Ouvrez une biographie pour commencer.";exp.disabled=!rows.length;for(const x of rows){const a=document.createElement("article");a.className="card hub-research";const h=document.createElement("h3"),p=document.createElement("p"),v=document.createElement("strong"),l=document.createElement("a"),b=document.createElement("button");h.textContent=x.name;p.textContent=[x.company,x.country].filter(Boolean).join(" · ");v.textContent=x.fortune;l.href=x.url;l.textContent="Ouvrir le dossier";b.type="button";b.className="btn";b.textContent="Retirer";b.onclick=()=>{try{localStorage.setItem(k,JSON.stringify(read().filter(id=>id!==x.id)));render()}catch{count.textContent="Impossible de modifier la sélection."}};a.append(h,p,v,document.createElement("br"),l,document.createElement("br"),b);out.append(a)}}exp.onclick=()=>{const csv=s=>{let v=String(s);if(/^[=+@-]/.test(v))v=" "+v;return String.fromCharCode(34)+v.split(String.fromCharCode(34)).join(String.fromCharCode(34,34))+String.fromCharCode(34)};const content=[["Nom","Entreprise","Pays","Fortune","Dossier"],...selected().map(x=>[x.name,x.company,x.country,x.fortune,new URL(x.url,location.href).href])].map(r=>r.map(csv).join(";")).join(String.fromCharCode(13,10));const u=URL.createObjectURL(new Blob([String.fromCharCode(65279)+content],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download="actualites-ma-veille.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};render()})();</script>'));
hubWrite('contact','Contacter la rédaction','Contact professionnel, corrections et droit de réponse.',
 hubHead('ACTUALITES.FR / CONTACT','Contacter notre équipe','Une question, une correction documentée ou une demande professionnelle ? Écrivez-nous directement.')+
 hubWrap('<section class="hub-part" style="max-width:760px;margin:auto"><form method="post" action="/api/contact/" id="contact-form" style="display:grid;gap:16px"><label>Nom et prénom *<input name="name" required maxlength="120" autocomplete="name" style="display:block;width:100%;padding:12px;border:1px solid #999"></label><label>Adresse e-mail *<input name="email" type="email" required maxlength="254" autocomplete="email" style="display:block;width:100%;padding:12px;border:1px solid #999"></label><label>Organisation (facultatif)<input name="organisation" maxlength="160" style="display:block;width:100%;padding:12px;border:1px solid #999"></label><label>Objet *<select name="objet" required style="display:block;width:100%;padding:12px"><option value="general">Contact général</option><option value="correction">Correction ou droit de réponse</option><option value="professionnel">Intelligence Pro / demande commerciale</option></select></label><label>Page ou référence concernée<input name="fiche" maxlength="300" style="display:block;width:100%;padding:12px;border:1px solid #999"></label><label>Message *<textarea name="message" required minlength="10" maxlength="4000" rows="7" style="display:block;width:100%;padding:12px;border:1px solid #999"></textarea></label><div hidden><label>Ne pas remplir<input name="website" tabindex="-1" autocomplete="off"></label></div><p class="small">Les informations transmises servent à traiter votre demande. <a href="'+link('contact','confidentialite')+'">Politique de confidentialité</a>.</p><button class="btn pri" type="submit">Envoyer mon message</button><p id="contact-status" role="status"></p></form><script>(function(){const f=document.getElementById("contact-form"),q=new URLSearchParams(location.search),s=document.getElementById("contact-status");if(["general","correction","professionnel"].includes(q.get("objet")))f.elements.objet.value=q.get("objet");f.elements.fiche.value=(q.get("fiche")||"").slice(0,300);f.addEventListener("submit",async e=>{e.preventDefault();const b=f.querySelector("button");b.disabled=true;s.textContent="Envoi…";try{const r=await fetch(f.action,{method:"POST",body:new URLSearchParams(new FormData(f))});if(!r.ok)throw Error();f.reset();s.textContent="Votre demande a été enregistrée."}catch{s.textContent="Envoi impossible. Votre message est conservé dans le formulaire ; réessayez."}finally{b.disabled=false}})})();</script></section>'));
const documented=Object.values(researchProfiles).reduce((a,p)=>a+(p.sections?.length||0),0);
const sourced=Object.values(researchProfiles).reduce((a,p)=>a+(p.events?.length||0),0);
hubWrite('intelligence','Intelligence Pro — dossiers et surveillance',
 'Explorer les réseaux économiques, documenter les événements et préparer la veille des entreprises et grandes fortunes.',
 hubHead('ACTUALITES.FR / INTELLIGENCE PRO','Quand une information change, votre analyse doit suivre','Consultez les faits aujourd’hui. Découvrez comment suivre demain leurs évolutions, sans refaire chaque jour les mêmes recherches.')+
 hubWrap('<div class="hub-metrics"><div><b>'+P.length+'</b><span>fiches de grandes fortunes</span></div><div><b>'+documented+'</b><span>chapitres documentaires rédigés</span></div><div><b>'+sourced+'</b><span>événements éditoriaux datés</span></div><div><b>'+influenceDashboard.stats.groupsCount+'</b><span>groupes associés à plusieurs fortunes</span></div></div>'+
 '<section class="hub-part"><div class="hub-heading"><p class="inf-overline">ACCÈS IMMÉDIAT</p><h2>Un poste d’observation déjà consultable</h2><p>Le tableau de bord Influence permet de filtrer les réseaux d’entreprises, conserver des sélections sur votre appareil, exporter leur graphique SVG et diffuser un lien direct vers un groupe.</p></div><div class="inf-pro-actions"><a class="inf-primary" href="'+link('intelligence','influence')+'">Ouvrir l’explorateur de réseaux</a><a href="'+link('intelligence','ma-veille')+'">Ma veille personnelle</a><a href="'+link('intelligence','recherche')+'">Rechercher parmi les '+P.length+' profils</a></div></section>'+
 '<section class="hub-part"><div class="hub-heading"><p class="inf-overline">CAS D’USAGE / APERÇUS CONCEPTUELS</p><h2>Une recherche ponctuelle ou un suivi dans la durée ?</h2><p>Voici les outils prévus pour transformer un dossier public en veille récurrente. Les exemples ci-dessous décrivent des fonctions en préparation ; aucune alerte n’est actuellement envoyée.</p></div><div class="grid hub-cards"><article class="card hub-research"><p class="tagline">JOURNALISTES</p><h3>Ne pas perdre le fil d’un dossier</h3><p>Une procédure ou un document réglementaire évolue après la publication de votre article. Retrouvez les nouvelles pièces et leurs dates sans reprendre toute la recherche.</p><details><summary>Voir un exemple de bulletin prévu</summary><p>Personnalité suivie · Nouveau document · Date de publication · Source originale · Résumé des changements.</p></details><a href="'+link('intelligence','risques')+'">Explorer les dossiers publics</a></article><article class="card hub-research"><p class="tagline">ANALYSTES ET INVESTISSEURS</p><h3>Observer les changements qui comptent</h3><p>Suivre un groupe, ses dirigeants et les fortunes associées depuis une liste unique, avec les évolutions documentées.</p><details><summary>Voir un exemple de suivi prévu</summary><p>Liste de sociétés suivies · Changements depuis la dernière consultation · Références · Historique.</p></details><a href="'+link('intelligence','influence')+'">Explorer les réseaux publics</a></article><article class="card hub-research"><p class="tagline">CONSEIL ET RECHERCHE</p><h3>Préparer un dossier réutilisable</h3><p>Rassembler les événements, les sources et les liens entre plusieurs personnalités dans un document exportable.</p><details><summary>Voir le contenu d’un rapport prévu</summary><p>Périmètre · Chronologie · Sources · Informations manquantes · Date de mise à jour.</p></details><a href="'+link('intelligence','recherche')+'">Rechercher une personnalité</a></article></div></section>'+
 '<section class="hub-part"><div class="hub-heading"><p class="inf-overline">OFFRES ET DISPONIBILITÉ</p><h2>Consulter librement. Suivre durablement.</h2><p>Les dossiers publics restent accessibles gratuitement. Les outils de surveillance personnalisée, d’historique et d’export professionnel seront proposés lorsque leur fonctionnement sera validé.</p></div><div class="inf-offers"><article><p class="inf-overline">GRATUIT / ACTIF</p><h3>Explorer</h3><p>Sans paiement, sans création de compte.</p><ul><li>'+P.length+' fiches et classements</li><li>Graphiques d’influence et réseaux</li><li>Liens vers les documents sources</li><li>Exports SVG et liens partageables</li><li>Suivis locaux, uniquement sur l’appareil</li></ul><a href="'+link('intelligence','influence')+'">Accéder gratuitement</a></article><article><p class="inf-overline">INTELLIGENCE PRO / EN PRÉPARATION</p><h3>Surveiller</h3><p>Pour les analystes, journalistes et professionnels.</p><ul><li>Listes de surveillance synchronisées</li><li>Alertes datées et attribuées par e-mail</li><li>Comparaison des changements et divergences</li><li>Rapports exportables et archives</li><li>Accès professionnel et facturation récurrente</li></ul><a href="'+link('intelligence','contact')+'?objet=professionnel">Contacter notre équipe</a></article></div></section>'+
 hubSection('Explorer le corpus et les sources','Ouvrez directement les modules réellement accessibles.',[
 ['Base des fortunes','Classement et biographies sourcées', 'milliardaires'],['Réseaux économiques','Statistiques, liens, logos, partage et graphiques','influence'],['Entreprises','Groupes et personnes associés','entreprises'],['Dossiers de gouvernance','Chronologies et événements documentés','risques'],['Next Billionaires','Jeunes fortunes et entrants hors Top 200','next-billionaires'],['Recherche avancée','Filtres sur les fiches publiques','recherche']
 ].map(([title,body,dir])=>'<a class="card" href="'+link('intelligence',dir)+'"><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p></a>').join(''))+
 '<section class="hub-part"><h2>Transparence de la couverture</h2><p>La veille documentaire est lancée, mais toutes les biographies ne disposent pas encore d’une enquête rédigée. Les données de couverture et les passages du moteur peuvent être examinés.</p><div class="inf-pro-actions"><a href="'+asset('intelligence','data/research-backlog.json')+'" target="_blank" rel="noopener noreferrer">Audit des 207 fiches</a><a href="https://actualites-biography-discovery.actualites-fr-next.workers.dev/status" target="_blank" rel="noopener noreferrer">État du moteur automatique</a></div></section>'));
 

// Internal editorial visual review: no indexation, no automated acceptance of photo identity or licensing.
const photoReviewQueue=photoAudit(PHOTOS).reviewQueue;
const photoReviewData=P.map(person=>{
 const current=PHOTOS[person.id]||[];
 const entries=portraitCandidates(current);
 const chosen=pickPortrait(current);
 return {
  slug:person.id,name:person.name,initials:photoInitials(person.name),
  candidates:entries.map(ph=>{
   const url=ph.fichier||ph.src||'';
   let publisher='Source non précisée';try{publisher=new URL(url).hostname.replace(/^www\./,'')}catch{}
   return {url,publisher,license:ph.licence||'Droits non documentés',source:ph.source||null,
     identityVerified:ph.identity_verified===true,authorized:ph.publication_autorisee===true};
  }),
  issues:photoReviewQueue.find(row=>row.slug===person.id)?.issues||[],
  google:'https://www.google.com/search?tbm=isch&q='+encodeURIComponent('"'+person.name+'" portrait'),
  linkedin:'https://www.google.com/search?q='+encodeURIComponent('"'+person.name+'" site:linkedin.com/in'),
  preferred:chosen?.src||chosen?.fichier||null
 };
});
const photoReviewJSON=JSON.stringify(photoReviewData).replace(/</g,'\\u003c').replace(/&/g,'\\u0026');
const photoReviewBody=hubHead('CONTRÔLE ÉDITORIAL / PHOTOGRAPHIES','Réviser les portraits du site','207 profils, photographies candidates et recherches de sources. Les décisions restent locales tant que leur export n’est pas appliqué après vérification.')+
 '<div class="band"><div class="in photo-review-page"><p class="photo-review-warning">Cet écran sert à l’évaluation éditoriale. Charger une image ou sélectionner un meilleur cadrage ne vérifie ni l’identité de la personne ni les droits de republication. L’export des choix n’actualise pas automatiquement la production.</p>'+
 '<div class="photo-review-controls"><label>Rechercher une personne<input id="photoQuery" type="search" placeholder="Nom, entreprise ou source"></label><label>État du contrôle<select id="photoStatusFilter"><option value="all">Toutes les fiches</option><option value="pending">À contrôler</option><option value="acceptable">Cadrage correct</option><option value="replace">Photo à remplacer</option><option value="wrong_identity">Identité douteuse</option></select></label><button id="photoReviewExport" type="button">Exporter les décisions JSON</button></div>'+
 '<p id="photoAutoStatus" role="status">Collecte automatique des photographies : vérification du service…</p><p id="photoReviewCount" role="status"></p><div id="photoReviewGrid" class="photo-review-grid"></div><button id="photoReviewMore" type="button">Afficher 24 fiches supplémentaires</button>'+
 '<script id="photoReviewData" type="application/json">'+photoReviewJSON+'</script><script src="'+asset('photos-a-verifier','assets/photo-review-console.js')+'" defer></script></div></div>';
const reviewHtml=page({from:'photos-a-verifier',title:'Contrôle éditorial des photographies — Actualites.fr',desc:'Contrôle technique des portraits des grandes fortunes : qualité, provenance et identité.',canonical:'photos-a-verifier/',body:photoReviewBody});
write('photos-a-verifier',reviewHtml.replace('<meta name="description"', '<meta name="robots" content="noindex,nofollow"><meta name="description"'));

// ---------- pages légales ----------
const LEGAL = JSON.parse(fs.readFileSync('data/legal.json', 'utf8'));
for (const [dir, L] of Object.entries(LEGAL)) {
  const body = `<section class="inkband"><div class="in band"><p class="tagline">Actualites.fr</p><h1 style="font-size:clamp(34px,5vw,54px)">${esc(L.title)}</h1><p class="lede" style="margin-top:12px">Dernière mise à jour : ${esc(L.date)}</p></div></section><div class="band"><div class="in legal">${L.html}</div></div>`;
  write(dir, page({ from: dir, title: L.title + ' · Actualites.fr', desc: L.desc, canonical: dir + '/', body }));
}

// ---------- accueil (SPA) ----------
const DATA = P.map(p => ({ id: p.id, name: fullName(p), g: p.g, age: p.age, born: p.born, country: p.country, co: p.co || SEC[p.sec], sec: p.sec, nw: p.nw, orig: p.orig || 'na', bio: p.bio || (p.rank ? `${p.rank}e fortune mondiale au classement Forbes 2026.` : ''), single: p.single, rank: p.rank }));
let homeHtml = fs.readFileSync('src/home.html', 'utf8')
  .replace('/*__DATA__*/', `window.__P=${JSON.stringify(DATA).replace(/</g, '\\u003c')};window.__SEC=${JSON.stringify(SEC)};window.__INK=${JSON.stringify(INK)};window.rosette=${rosette.toString()};window.__COL=${JSON.stringify(COL)};window.__PROFILE=${JSON.stringify(PREVIEW ? 'milliardaires/{id}/index.html' : '/milliardaires/{id}/')};window.__LINK=${JSON.stringify({ all: link('', 'milliardaires'), femmes: link('', 'milliardaires/femmes'), france: link('', 'milliardaires/france'), jeunes: link('', 'milliardaires/moins-de-40-ans') })};`)
  .replaceAll('__CSS__', asset('', 'assets/site.css'));
for (const [k, v] of Object.entries({ __L_ALL__: link('', 'milliardaires'), __L_FEMMES__: link('', 'milliardaires/femmes'), __L_FRANCE__: link('', 'milliardaires/france'), __L_JEUNES__: link('', 'milliardaires/moins-de-40-ans'), __L_ENTREPRISES__: link('', 'entreprises'), __L_INFLUENCE__: link('', 'influence'), __L_RISQUES__: link('', 'risques'), __L_NEXT__: link('', 'next-billionaires'), __L_RECHERCHE__: link('', 'recherche'), __L_INTELLIGENCE__: link('', 'intelligence'), __L_CONTACT__: link('', 'contact'), __L_ML__: link('', 'mentions-legales'), __L_CGU__: link('', 'cgu'), __L_CONF__: link('', 'confidentialite') })) homeHtml = homeHtml.replaceAll(k, v);
homeHtml = homeHtml.replace('<a href="'+link('', 'entreprises')+'">Entreprises</a>', '<a href="'+link('', 'fortunes-invisibles')+'">Fortunes invisibles</a><a href="'+link('', 'entreprises')+'">Entreprises</a>');
fs.writeFileSync(path.join(OUT, 'index.html'), homeHtml);
write('pendant-que-vous-lisez', page({from:'pendant-que-vous-lisez',title:'Actualites.fr — Recherche',desc:'Retrouvez les dossiers sur les grandes fortunes.',canonical:'pendant-que-vous-lisez/',body:`<div class="band"><div class="in"><h1>Cette rubrique a été retirée</h1><p>Retrouvez les dossiers et comparaisons économiques.</p><a class="btn" href="${home('pendant-que-vous-lisez','finder')}">Explorer les fortunes</a></div></div>`}));
if (fs.existsSync('src/_headers') && !PREVIEW) fs.copyFileSync('src/_headers', path.join(OUT, '_headers'));

// Public, machine-readable documentary data (no private or inferred traits).
fs.mkdirSync(path.join(OUT,'data'),{recursive:true});
const G=graph(P);
fs.writeFileSync(path.join(OUT,'data/knowledge-graph.json'),JSON.stringify(G));
fs.writeFileSync(path.join(OUT,'data/research-status.json'),JSON.stringify({sources:sources.length,people:P.length,companies:G.nodes.filter(n=>n.type==='company').length,associations:G.edges.length,events:G.events.length,observations:observations.length,candidates:candidates.length,collection:'manual',rankingGrowthAvailable:false}));
 fs.writeFileSync(path.join(OUT,'data/research-backlog.json'),JSON.stringify(researchBacklog));
fs.writeFileSync(path.join(OUT,'data/photo-audit.json'),JSON.stringify({...photoAudit(PHOTOS),generatedAt:new Date().toISOString()}));
 fs.writeFileSync(path.join(OUT,'data/biography-research-coverage.json'),JSON.stringify({totalProfiles:P.length,researchedProfiles:researchQuality.profiles,researchedSections:researchQuality.sections,researchedEvents:researchQuality.events,distinctSourceUrls:researchQuality.uniqueSourceUrls,updatedAt:researchData.updatedAt,method:'Editorial records with direct source links; not automatically corroborated'}));

 // ---------- Fortunes invisibles : catalogue documentaire distinct du classement Forbes ----------
 const hiddenCategories = [
  [
    "monarchies",
    "Monarchies et dynasties royales",
    [
      [
        "rama-x",
        "Maha Vajiralongkorn (Rama X)",
        "Thaïlande",
        "Patrimoine personnel et biens historiquement associés à la Couronne",
        "Distinguer propriété juridique, droits de contrôle, participations cotées et immobilier ; établir les changements de statut du Crown Property Bureau.",
        "https://www.set.or.th/en/home"
      ],
      [
        "al-nahyan",
        "Dynastie Al Nahyan",
        "Émirats arabes unis",
        "Patrimoine familial et actifs institutionnels distincts",
        "Identifier les holdings privées et séparer les fonds souverains d’Abou Dhabi.",
        "https://www.adia.ae/"
      ],
      [
        "al-saoud",
        "Dynastie Al Saoud",
        "Arabie saoudite",
        "Patrimoine familial",
        "Distinguer les actifs privés des recettes publiques et du PIF.",
        "https://www.pif.gov.sa/en/"
      ],
      [
        "al-thani",
        "Dynastie Al Thani",
        "Qatar",
        "Patrimoine familial",
        "Distinguer les sociétés privées et les investissements de la Qatar Investment Authority.",
        "https://www.qia.qa/"
      ],
      [
        "al-maktoum",
        "Dynastie Al Maktoum",
        "Émirats arabes unis",
        "Patrimoine familial",
        "Séparer les avoirs privés des actifs du gouvernement de Dubaï.",
        "https://icd.gov.ae/"
      ],
      [
        "bolkiah",
        "Dynastie Bolkiah",
        "Brunei",
        "Patrimoine royal",
        "Documenter les biens privés et distinguer les réserves publiques.",
        "https://www.mofe.gov.bn/"
      ],
      [
        "liechtenstein",
        "Maison de Liechtenstein",
        "Liechtenstein",
        "Patrimoine dynastique",
        "Étudier la propriété de LGT et distinguer ses actifs propres des capitaux de ses clients.",
        "https://www.lgt.com/"
      ],
      [
        "windsor",
        "Maison Windsor",
        "Royaume-Uni",
        "Biens privés, duchés et biens de la Couronne",
        "Ne pas assimiler le Crown Estate à une fortune personnelle du souverain.",
        "https://www.thecrownestate.co.uk/"
      ],
      [
        "alaouite",
        "Dynastie alaouite",
        "Maroc",
        "Patrimoine familial et participations",
        "Identifier les participations documentées et leurs bénéficiaires juridiques.",
        "https://www.almada.ma/"
      ],
      [
        "al-sabah",
        "Dynastie Al Sabah",
        "Koweït",
        "Patrimoine familial",
        "Distinguer les biens privés des actifs gérés par la Kuwait Investment Authority.",
        "https://www.kia.gov.kw/"
      ],
      [
        "al-khalifa",
        "Dynastie Al Khalifa",
        "Bahreïn",
        "Patrimoine familial",
        "Distinguer patrimoine privé et actifs publics ou souverains.",
        "https://www.mumtalakat.bh/"
      ],
      [
        "grimaldi",
        "Maison Grimaldi",
        "Monaco",
        "Patrimoine dynastique",
        "Identifier les titres de propriété et distinguer patrimoine princier et patrimoine de l’État.",
        "https://www.palais.mc/"
      ]
    ]
  ],
  [
    "familles",
    "Familles milliardaires",
    [
      [
        "rothschild",
        "Familles Rothschild",
        "International",
        "Patrimoines familiaux distincts",
        "Étudier les branches et sociétés séparément, sans leur attribuer une fortune mondiale agrégée non documentée.",
        "https://www.rothschildandco.com/"
      ],
      [
        "rockefeller",
        "Famille Rockefeller",
        "États-Unis",
        "Patrimoine familial",
        "Distinguer les véhicules privés des fondations indépendantes.",
        "https://www.rockefellerfoundation.org/"
      ],
      [
        "walton",
        "Famille Walton",
        "États-Unis",
        "Participations familiales",
        "Éviter le double comptage avec les membres du classement individuel.",
        "https://stock.walmart.com/"
      ]
    ]
  ],
  [
    "trusts",
    "Trusts et structures patrimoniales",
    [
      [
        "wellcome-trust",
        "Wellcome Trust",
        "Royaume-Uni",
        "Dotation et actifs de bienfaisance",
        "Examiner les comptes consolidés et les restrictions d’affectation.",
        "https://wellcome.org/"
      ],
      [
        "trusts-familiaux",
        "Trusts familiaux et dynastiques",
        "International",
        "Actifs détenus en fiducie",
        "Distinguer constituant, trustee, bénéficiaires et droits économiques ; aucun montant agrégé sans périmètre défini.",
        "https://www.fatf-gafi.org/"
      ]
    ]
  ],
  [
    "fonds-souverains",
    "Fonds souverains",
    [
      [
        "nbim",
        "Government Pension Fund Global",
        "Norvège",
        "Actifs publics sous gestion",
        "Retenir la valeur officielle du fonds à une date déterminée.",
        "https://www.nbim.no/"
      ],
      [
        "pif",
        "Public Investment Fund",
        "Arabie saoudite",
        "Actifs souverains sous gestion",
        "Examiner les rapports annuels et le périmètre consolidé.",
        "https://www.pif.gov.sa/en/"
      ],
      [
        "adia",
        "Abu Dhabi Investment Authority",
        "Émirats arabes unis",
        "Actifs souverains sous gestion",
        "Distinguer chiffres publiés et estimations externes.",
        "https://www.adia.ae/"
      ],
      [
        "qia",
        "Qatar Investment Authority",
        "Qatar",
        "Actifs souverains sous gestion",
        "Identifier les participations et les chiffres officiellement publiés.",
        "https://www.qia.qa/"
      ],
      [
        "mubadala",
        "Mubadala",
        "Émirats arabes unis",
        "Actifs et investissements souverains",
        "Examiner les comptes et les actifs sous gestion.",
        "https://www.mubadala.com/"
      ],
      [
        "kia",
        "Kuwait Investment Authority",
        "Koweït",
        "Actifs souverains sous gestion",
        "Identifier les fonds et leurs mandats distincts.",
        "https://www.kia.gov.kw/"
      ]
    ]
  ],
  [
    "etats",
    "États et patrimoines publics",
    [
      [
        "chine",
        "Chine",
        "Chine",
        "Actifs publics, réserves et passifs",
        "Séparer réserves de change, entreprises publiques, dette et patrimoine net.",
        "https://www.safe.gov.cn/en/"
      ],
      [
        "arabie-saoudite",
        "Arabie saoudite",
        "Arabie saoudite",
        "Patrimoine public et ressources naturelles",
        "Distinguer réserves, recettes budgétaires, dette et actifs souverains.",
        "https://www.mof.gov.sa/en/"
      ],
      [
        "qatar",
        "Qatar",
        "Qatar",
        "Patrimoine public et ressources naturelles",
        "Séparer actifs publics, recettes énergétiques et investissements souverains.",
        "https://www.mof.gov.qa/"
      ]
    ]
  ],
  [
    "fondations",
    "Fondations et institutions religieuses",
    [
      [
        "gates-foundation",
        "Gates Foundation",
        "États-Unis",
        "Actifs de bienfaisance",
        "Examiner les comptes publiés et distinguer les dons annuels des actifs.",
        "https://www.gatesfoundation.org/"
      ],
      [
        "saint-siege",
        "Saint-Siège",
        "Vatican",
        "Actifs et comptes institutionnels",
        "Ne pas confondre Saint-Siège, État de la Cité du Vatican, diocèses et ordres religieux.",
        "https://www.vatican.va/"
      ],
      [
        "eglise-saints-derniers-jours",
        "Église de Jésus-Christ des saints des derniers jours",
        "États-Unis",
        "Actifs institutionnels et fonds d’investissement",
        "Distinguer patrimoine institutionnel, dons et actifs des entités déclarantes.",
        "https://www.sec.gov/edgar/search/"
      ]
    ]
  ],
  [
    "empires-prives",
    "Empires financiers privés",
    [
      [
        "blackrock",
        "BlackRock",
        "États-Unis",
        "Capitaux sous gestion",
        "Les actifs des clients ne constituent pas le patrimoine propre de BlackRock.",
        "https://ir.blackrock.com/"
      ],
      [
        "vanguard",
        "Vanguard",
        "États-Unis",
        "Capitaux sous gestion",
        "Documenter les actifs des fonds et leur structure de propriété.",
        "https://corporate.vanguard.com/"
      ],
      [
        "state-street",
        "State Street",
        "États-Unis",
        "Capitaux sous gestion et conservation",
        "Ne pas additionner actifs sous gestion et actifs conservés.",
        "https://investors.statestreet.com/"
      ],
      [
        "cargill",
        "Cargill",
        "États-Unis",
        "Entreprise non cotée",
        "Distinguer chiffre d’affaires, valorisation estimée et patrimoine des actionnaires.",
        "https://www.cargill.com/"
      ],
      [
        "pontegadea",
        "Pontegadea",
        "Espagne",
        "Holding patrimoniale",
        "Étudier les comptes et participations sans les additionner à la fortune individuelle correspondante.",
        "https://www.pontegadea.com/"
      ]
    ]
  ],
  [
    "institutions-strategiques",
    "Organisations stratégiques et renseignement",
    [
      [
        "cia",
        "Central Intelligence Agency (CIA)",
        "États-Unis",
        "Budget public ; ventilation partiellement classifiée",
        "Ne publier que les crédits ou agrégats officiellement divulgués ; ne pas assimiler le budget national du renseignement au budget de la CIA.",
        "https://www.dni.gov/"
      ],
      [
        "fbi",
        "Federal Bureau of Investigation (FBI)",
        "États-Unis",
        "Crédits budgétaires publics",
        "Étudier les demandes et crédits votés, distincts du patrimoine.",
        "https://www.justice.gov/jmd/budget-and-performance"
      ],
      [
        "mi6",
        "Secret Intelligence Service (MI6)",
        "Royaume-Uni",
        "Ressources publiques ; détail limité",
        "Distinguer le budget agrégé des services de renseignement et les crédits propres au SIS.",
        "https://www.gov.uk/"
      ],
      [
        "dgse",
        "Direction générale de la sécurité extérieure (DGSE)",
        "France",
        "Crédits publics ; détail limité",
        "Étudier les documents budgétaires sans inférer de ressources classifiées.",
        "https://www.budget.gouv.fr/"
      ],
      [
        "fmi",
        "Fonds monétaire international",
        "International",
        "Ressources et capacité de prêt",
        "Distinguer quotes-parts, emprunts et capacité de financement.",
        "https://www.imf.org/"
      ],
      [
        "banque-mondiale",
        "Banque mondiale",
        "International",
        "Capital, actifs et engagements financiers",
        "Distinguer les institutions du groupe et leurs comptes respectifs.",
        "https://www.worldbank.org/"
      ]
    ]
  ]
];
 const hiddenRoot = 'fortunes-invisibles';
 const hiddenDossiers = {
  "rama-x": {
    "headline": "2018 : changement du régime de détention des actifs royaux",
    "paragraphs": [
      "En juillet 2017, une modification législative a placé le Crown Property Bureau sous le contrôle du roi. Reuters a documenté la présence d'actifs immobiliers et de participations dans Siam Commercial Bank et Siam Cement dans le périmètre alors administré par le bureau.",
      "En juin 2018, le bureau a annoncé que les actifs précédemment enregistrés à son nom seraient désormais détenus au nom du souverain. Ce changement est déterminant pour étudier la propriété juridique des biens royaux thaïlandais, mais ne fournit pas un bilan patrimonial consolidé.",
      "Une déclaration réglementaire de 2017 a documenté le transfert de titres de Siam Commercial Bank représentant alors plus de 500 millions USD. Cette transaction historique ne permet pas de déduire la valeur actuelle du patrimoine royal. Les participations doivent être réévaluées à partir des registres récents et les passifs doivent être identifiés."
    ],
    "figures": [
      [
        "Transfert de titres SCB",
        "Plus de 500 millions USD",
        "Octobre 2017 ; valeur historique de la transaction, non fortune nette"
      ]
    ],
    "sources": [
      [
        "Reuters, 16 juin 2018",
        "https://www.euronews.com/2018/06/16/assets-registered-to-thai-crown-property-bureau-to-be-held-under-kings-name"
      ],
      [
        "Reuters, transfert de titres SCB, 6 octobre 2017",
        "https://www.business-standard.com/article/reuters/over-500-million-in-thai-bank-shares-transferred-on-behalf-of-king-sec-117100600759_1.html"
      ],
      [
        "Reuters, réforme du Crown Property Bureau",
        "https://www.investing.com/news/world-news/thai-king%27s-aide-named-to-head-multi-billion-property-bureau-506625"
      ]
    ]
  },
  "windsor": {
    "headline": "Biens de la Couronne : une propriété institutionnelle distincte",
    "paragraphs": [
      "Le Crown Estate administre un portefeuille foncier et immobilier ainsi que des droits sur les fonds marins en Angleterre, au pays de Galles et en Irlande du Nord. Ses bénéfices sont versés au Trésor britannique. Il ne fait pas partie du patrimoine privé du monarque.",
      "Le financement des fonctions officielles de la monarchie, les revenus des duchés de Lancaster et de Cornouailles et les biens privés constituent des périmètres séparés. Le Sovereign Grant est un mécanisme budgétaire lié au résultat du Crown Estate et non un versement de la totalité de ses bénéfices au souverain.",
      "Le Crown Estate écossais relève d'un régime distinct ; ses bénéfices alimentent les finances publiques écossaises. Une estimation de la richesse privée des Windsor doit exclure les biens détenus au titre de la fonction monarchique."
    ],
    "figures": [
      [
        "Bénéfice net de revenu du Crown Estate",
        "500 millions GBP",
        "Exercice 2025/26 ; résultat institutionnel"
      ]
    ],
    "sources": [
      [
        "Crown Estate, rapport annuel 2025/26",
        "https://www.thecrownestate.co.uk/about-us/annual-report"
      ],
      [
        "Crown Estate, gouvernance",
        "https://www.thecrownestate.co.uk/about-us/governance"
      ],
      [
        "Crown Estate Scotland, informations essentielles",
        "https://crownestatescotland.com/media/key-information"
      ]
    ]
  },
  "liechtenstein": {
    "headline": "LGT : une banque détenue par la maison princière",
    "paragraphs": [
      "La maison princière possède le groupe LGT, spécialisé dans la banque privée et la gestion d'actifs. Cette participation constitue un actif économique distinct du volume des portefeuilles confiés au groupe par ses clients.",
      "Les résultats 2025 font état de 386,1 milliards CHF d'actifs sous gestion et d'un dividende exceptionnel de 703 millions CHF versé à la maison princière au titre de cet exercice. Le dividende est un flux de revenu ; il ne constitue pas une valorisation de la banque.",
      "Au premier semestre 2026, LGT a annoncé une progression de ses actifs sous gestion à 412,6 milliards CHF. Pour établir une valeur patrimoniale de la famille, il faudrait valoriser ses droits sur le capital du groupe, puis documenter ses autres actifs et passifs."
    ],
    "figures": [
      [
        "Actifs sous gestion LGT",
        "412,6 milliards CHF",
        "30 juin 2026 ; capitaux de clients"
      ],
      [
        "Dividende exceptionnel à la maison princière",
        "703 millions CHF",
        "Exercice 2025 ; flux de revenu"
      ]
    ],
    "sources": [
      [
        "LGT, résultats semestriels 2026",
        "https://www.lgt.com/li-en/about-lgt/lgt-news/lgt-reports-strong-net-new-asset-growth-368674"
      ],
      [
        "LGT, résultats annuels 2025",
        "https://www.lgt.com/global-en/about-lgt/lgt-news/lgt-significantly-increases-profit-and-continues-growth-trajectory-336770"
      ]
    ]
  },
  "nbim": {
    "headline": "21 268 milliards NOK à la clôture 2025",
    "paragraphs": [
      "Le Government Pension Fund Global investit les ressources publiques norvégiennes sur les marchés internationaux. Sa gestion opérationnelle relève de Norges Bank Investment Management ; le fonds ne représente pas une fortune privée.",
      "À la clôture de 2025, les actions constituaient 71,3 % de ses placements et les titres obligataires 26,5 %. Le solde était investi dans l'immobilier non coté et les infrastructures renouvelables non cotées, sous réserve des arrondis.",
      "Le rapport annuel distingue rendement des placements, apports et effets de change. Les variations de la valeur en couronnes ne doivent donc pas être interprétées comme des gains exclusivement imputables aux investissements."
    ],
    "figures": [
      [
        "Valeur du fonds",
        "21 268 milliards NOK",
        "31 décembre 2025"
      ],
      [
        "Rendement comptable annuel",
        "15,1 %",
        "2025"
      ]
    ],
    "sources": [
      [
        "NBIM, rapport annuel 2025",
        "https://www.nbim.no/en/news-and-insights/reports/2025/annual-report-2025/"
      ],
      [
        "NBIM, rapport détaillé",
        "https://www.nbim.no/en/news-and-insights/reports/2025/annual-report-2025/web-report-annual-report-2025/"
      ]
    ]
  },
  "pif": {
    "headline": "Plus de 900 milliards USD d'actifs sous gestion en 2025",
    "paragraphs": [
      "Le Public Investment Fund est un véhicule d'investissement souverain saoudien. Son rapport annuel 2025 présente les résultats du fonds et ses investissements dans les secteurs prioritaires de l'économie saoudienne.",
      "Le fonds indique avoir déployé cumulativement plus de 199 milliards USD d'investissements domestiques entre 2021 et 2025. Ce cumul d'investissements ne s'ajoute pas à l'encours d'actifs sous gestion : une partie des actifs financés peut déjà figurer dans cet encours.",
      "Les accords annoncés avec Goldman Sachs Asset Management et Macquarie Asset Management illustrent la mobilisation de capitaux et les partenariats financiers internationaux. La valeur des actifs du PIF ne doit pas être attribuée à titre personnel aux membres de la famille Al Saoud."
    ],
    "figures": [
      [
        "Actifs sous gestion",
        "Plus de 900 milliards USD",
        "2025 ; périmètre déclaré par le PIF"
      ],
      [
        "Investissements domestiques cumulés",
        "Plus de 199 milliards USD",
        "2021–2025 ; flux cumulés"
      ]
    ],
    "sources": [
      [
        "PIF, rapport annuel 2025",
        "https://annualreport.pif.gov.sa/en/annual-report-2025/"
      ],
      [
        "PIF, communiqué sur les résultats 2025",
        "https://www.pif.gov.sa/en/news-and-insights/press-releases/2026/pif-delivers-strong-revenue-and-profit-growth-in-2025/"
      ]
    ]
  }
};
 Object.assign(hiddenDossiers, {
  "blackrock": {
    "headline": "14 000 milliards de dollars confiés à un gestionnaire coté",
    "paragraphs": [
      "BlackRock est une société de gestion cotée à New York sous le symbole BLK. Elle administre des portefeuilles pour des investisseurs institutionnels et particuliers. Ses produits comprennent notamment les ETF iShares et des stratégies actives.",
      "Les résultats publiés le 15 janvier 2026 indiquent un encours de 14 000 milliards USD et des souscriptions nettes de 698 milliards USD en 2025. Les flux nets annuels mesurent les entrées moins les sorties de capitaux ; ils ne sont pas assimilables au bénéfice du gestionnaire.",
      "L'influence économique liée à la gestion des titres doit être distinguée de leur propriété économique. La valorisation boursière de BlackRock et le patrimoine de ses actionnaires constituent encore deux périmètres différents."
    ],
    "figures": [
      [
        "Actifs sous gestion",
        "14 000 Md USD",
        "31 décembre 2025"
      ],
      [
        "Flux nets entrants",
        "698 Md USD",
        "Exercice 2025"
      ]
    ],
    "sources": [
      [
        "BlackRock, résultats annuels 2025",
        "https://www.blackrock.com/corporate/newsroom/media/press-releases/blackrock-reports-fourth-quarter-2025"
      ],
      [
        "SEC, communiqué financier déposé",
        "https://www.sec.gov/Archives/edgar/data/2012383/000119312526013503/blk-ex99_1.htm"
      ]
    ]
  },
  "state-street": {
    "headline": "Conservation et gestion : deux métiers financiers distincts",
    "paragraphs": [
      "State Street fournit des services de conservation, d'administration et de gestion de placements aux investisseurs professionnels. La conservation comprend des fonctions opérationnelles liées aux titres de clients ; elle ne confère pas à la banque la propriété économique de ces titres.",
      "Les chiffres déclarés à la SEC à fin 2025 atteignent 53 800 milliards USD pour la conservation et l'administration et 5 670 milliards USD pour la gestion. Les deux ensembles peuvent se recouper et ne doivent pas être additionnés.",
      "La taille du bilan propre, les revenus de commissions et la capitalisation de la société doivent être étudiés séparément de ces encours."
    ],
    "figures": [
      [
        "Actifs conservés ou administrés",
        "53 800 Md USD",
        "31 décembre 2025"
      ],
      [
        "Actifs sous gestion",
        "5 670 Md USD",
        "31 décembre 2025"
      ]
    ],
    "sources": [
      [
        "SEC, déclaration de procuration 2026",
        "https://www.sec.gov/Archives/edgar/data/93751/000114036126013817/ny20058931x1_def14a.htm"
      ],
      [
        "State Street, rapport annuel 2025",
        "https://www.statestreet.com/us/en/about/our-story/2025-annual-report/investment-services"
      ]
    ]
  },
  "mubadala": {
    "headline": "385 milliards USD d'actifs souverains sous gestion",
    "paragraphs": [
      "Mubadala Investment Company investit pour le gouvernement d'Abou Dhabi, son actionnaire. Son portefeuille comprend des investissements aux Émirats arabes unis et à l'étranger, répartis entre plusieurs classes d'actifs.",
      "Le communiqué du 9 avril 2026 indique une croissance des actifs sous gestion de 17 % au cours de l'exercice 2025, jusqu'à environ 1 400 milliards AED. Les rendements annualisés sur cinq et dix ans dépassent 10 % selon le groupe.",
      "Le portefeuille doit être attribué à l'investisseur souverain et non au patrimoine personnel des membres de la dynastie Al Nahyan."
    ],
    "figures": [
      [
        "Actifs sous gestion",
        "385 Md USD",
        "2025 ; équivalent déclaré par Mubadala"
      ],
      [
        "Croissance annuelle des encours",
        "17 %",
        "2025"
      ]
    ],
    "sources": [
      [
        "Mubadala, résultats 2025",
        "https://www.mubadala.com/en/news/strong-performance-by-uae-portfolio-drives-mubadalas-growth-in-2025"
      ],
      [
        "Rapport annuel",
        "https://annual2025.mubadala.com/en"
      ],
      [
        "Actionnariat et mission",
        "https://www.mubadala.com/en/who-we-are/about-mubadala"
      ]
    ]
  },
  "gates-foundation": {
    "headline": "Une dotation philanthropique de 89 milliards USD",
    "paragraphs": [
      "La Gates Foundation finance des programmes philanthropiques tandis que le Gates Foundation Trust détient la dotation qui soutient ces activités. La fondation publie des comptes audités et ses déclarations fiscales.",
      "À fin 2025, la dotation du trust s'élevait à 89 milliards USD. La fondation rapporte un soutien caritatif de 8,47 milliards USD sur l'exercice, incluant subventions, contrats et dépenses opérationnelles selon sa définition.",
      "En mai 2025, Bill Gates a annoncé une fermeture prévue de la fondation au 31 décembre 2045 et son intention de consacrer presque tout son patrimoine restant à son financement. Il s'agit d'une annonce de dons futurs, distincte des actifs déjà transférés."
    ],
    "figures": [
      [
        "Dotation du trust",
        "89 Md USD",
        "31 décembre 2025"
      ],
      [
        "Soutien caritatif",
        "8,47 Md USD",
        "Exercice 2025"
      ]
    ],
    "sources": [
      [
        "Chiffres institutionnels",
        "https://www.gatesfoundation.org/about/foundation-fact-sheet"
      ],
      [
        "Rapport annuel 2025",
        "https://www.gatesfoundation.org/about/financials/annual-reports/annual-report-2025"
      ],
      [
        "Structure du trust",
        "https://www.gatesfoundation.org/about/financials/foundation-trust"
      ]
    ]
  },
  "wellcome-trust": {
    "headline": "39,9 milliards GBP investis pour financer la recherche",
    "paragraphs": [
      "Wellcome finance des recherches scientifiques et médicales grâce aux revenus et à la valeur de son portefeuille. Son histoire patrimoniale est liée à l'industrie pharmaceutique ; la diversification du portefeuille a commencé avec la cession progressive des actions de l'entreprise d'origine.",
      "Pour l'exercice clos le 30 septembre 2025, Wellcome rapporte une valeur de portefeuille de 39,9 milliards GBP et des fonds nets de 35,7 milliards GBP après prise en compte des passifs. Le rendement annuel annoncé est de 10,2 % en livres sterling.",
      "L'institution publie également une liste de ses participations directes dans des sociétés cotées. Cette liste constitue un relevé daté et non un inventaire de l'intégralité de ses actifs."
    ],
    "figures": [
      [
        "Portefeuille",
        "39,9 Md GBP",
        "30 septembre 2025"
      ],
      [
        "Fonds nets",
        "35,7 Md GBP",
        "30 septembre 2025"
      ],
      [
        "Rendement annuel",
        "10,2 %",
        "Exercice 2024/25"
      ]
    ],
    "sources": [
      [
        "Résultats financiers 2024/25",
        "https://wellcome.org/insights/articles/wellcome-annual-report-and-financial-statements-202425"
      ],
      [
        "Politique de financement",
        "https://wellcome.org/about-us/investments"
      ],
      [
        "Participations cotées directes",
        "https://wellcome.org/about-us/investments/direct-public-equity-holdings"
      ]
    ]
  },
  "adia": {
    "headline": "Un fonds souverain qui publie ses rendements de long terme",
    "paragraphs": [
      "ADIA investit un portefeuille diversifié pour Abou Dhabi, sur plusieurs marchés et classes d'actifs. Sa revue annuelle décrit notamment la stratégie de placement et les fourchettes de répartition géographique.",
      "Pour la période arrêtée au 31 décembre 2025, ADIA annonce des rendements annualisés de 6,6 % sur vingt ans et 7,2 % sur trente ans. Ces résultats historiques ne garantissent pas les rendements futurs.",
      "Le montant total des actifs n'est pas établi par les documents consultés ici. Une estimation externe devrait être identifiée comme telle et datée, plutôt que présentée comme une déclaration officielle."
    ],
    "figures": [
      [
        "Rendement annualisé sur 20 ans",
        "6,6 %",
        "31 décembre 2025"
      ],
      [
        "Rendement annualisé sur 30 ans",
        "7,2 %",
        "31 décembre 2025"
      ]
    ],
    "sources": [
      [
        "ADIA, revue annuelle 2025",
        "https://www.adia.ae/en/pr/2025a/index.html"
      ],
      [
        "Lettre du directeur général",
        "https://www.adia.ae/en/pr/2025a/letter-from-the-md.html"
      ],
      [
        "Stratégie de placement",
        "https://www.adia.ae/en/investments"
      ]
    ]
  },
  "qia": {
    "headline": "Un fonds public créé en 2005 pour diversifier l'économie qatarienne",
    "paragraphs": [
      "La Qatar Investment Authority a été constituée par la décision émirienne numéro 22 de 2005. Son mandat comprend la préservation et le développement des ressources financières du Qatar.",
      "La QIA indique être responsable devant le Conseil suprême des affaires économiques et des investissements, présidé par l'émir. Son cadre de gouvernance distingue cette supervision des décisions opérationnelles d'investissement.",
      "Les participations du fonds couvrent des marchés et secteurs internationaux. Aucun encours global vérifié n'est retenu dans cette fiche ; les actifs de QIA ne peuvent pas être attribués au patrimoine privé de la dynastie Al Thani."
    ],
    "figures": [
      [
        "Création juridique",
        "2005",
        "Décision émirienne n° 22"
      ]
    ],
    "sources": [
      [
        "QIA, présentation",
        "https://www.qia.qa/en/About/pages/default.aspx"
      ],
      [
        "Historique",
        "https://www.qia.qa/en/about/pages/History.aspx"
      ],
      [
        "Gouvernance",
        "https://www.qia.qa/en/About/Pages/Governance.aspx"
      ]
    ]
  },
  "cia": {
    "headline": "Un budget propre non isolé dans les chiffres publics du renseignement",
    "paragraphs": [
      "Le financement du renseignement américain est organisé notamment autour du National Intelligence Program et du Military Intelligence Program. Ces programmes couvrent des activités de plusieurs organismes et ne représentent pas le patrimoine d'une agence.",
      "L'Office of the Director of National Intelligence a annoncé une demande de crédits de 81,9 milliards USD pour le National Intelligence Program au titre de l'exercice 2026. Il s'agit d'une demande agrégée, non du budget voté de la CIA.",
      "La ventilation par agence n'est pas établie dans les documents consultés. Aucun montant de fortune ni aucune estimation d'actifs classifiés n'est attribué à la CIA."
    ],
    "figures": [
      [
        "Demande de crédits du NIP",
        "81,9 Md USD",
        "Exercice 2026 ; ensemble du programme, pas CIA"
      ]
    ],
    "sources": [
      [
        "ODNI, demande budgétaire FY2026",
        "https://www.odni.gov/1524/pr-12-25/"
      ],
      [
        "Congressional Research Service, cadre budgétaire",
        "https://www.everycrsreport.com/reports/IF10524.html"
      ]
    ]
  }
});
 const hiddenDocument = id => {const d=hiddenDossiers[id]; if(!d)return '<h2>État de la documentation</h2><p>Enquête documentaire à compléter. Aucun montant validé.</p>';return '<h2>'+esc(d.headline)+'</h2>'+d.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'<h2>Indicateurs documentés</h2><div class="grid">'+d.figures.map(([label,value,scope])=>'<div class="card"><h3>'+esc(label)+'</h3><p><strong>'+esc(value)+'</strong></p><p>'+esc(scope)+'</p></div>').join('')+'</div><h2>Documents de référence</h2><ul>'+d.sources.map(([label,url])=>'<li><a href="'+esc(url)+'" rel="noopener noreferrer">'+esc(label)+'</a></li>').join('')+'</ul>';};

 const hiddenPaths = [hiddenRoot];
 const hiddenIntro = 'Patrimoines dynastiques, actifs publics, fonds souverains, trusts, institutions et capitaux sous gestion : des grandeurs distinctes qui ne peuvent pas être additionnées ni classées comme des fortunes personnelles.';
 const hiddenHero = (label,title,desc) => `<section class="inkband"><div class="in band"><p class="tagline">${esc(label)}</p><h1>${esc(title)}</h1><p class="lede">${esc(desc)}</p></div></section>`;
 const hiddenBack = (from,to,label) => `<a href="${link(from,to)}">${esc(label)}</a>`;
 const hiddenCard = (from,to,title,desc) => `<a class="card" href="${link(from,to)}"><h3>${esc(title)}</h3><p>${esc(desc)}</p></a>`;
 const hiddenMethod = '<section class="band"><div class="in"><h2>Comment lire ces données</h2><p>Le patrimoine net, les actifs sous gestion, les actifs publics, les budgets annuels et la capacité de prêt constituent des indicateurs différents. Les chiffres ne sont publiés qu’avec date, devise, périmètre et source documentaire. Une valeur non établie n’est pas une valeur nulle. Les ressources classifiées ne sont pas estimées par extrapolation.</p></div></section>';
 const hiddenCount = hiddenCategories.reduce((n,c)=>n+c[2].length,0);
 write(hiddenRoot,page({from:hiddenRoot,title:'Fortunes invisibles : monarchies, trusts, fonds souverains et institutions | Actualites.fr',desc:hiddenIntro,canonical:hiddenRoot+'/',body:hiddenHero('Observatoire des patrimoines et capitaux','Fortunes invisibles',hiddenIntro)+`<section class="band"><div class="in"><h2>${hiddenCount} dossiers documentaires à constituer</h2><p>Catalogue initial de recherche. Les liens institutionnels sont des points de départ, pas des preuves d’une valorisation.</p><div class="grid">${hiddenCategories.map(([id,name,items])=>hiddenCard(hiddenRoot,hiddenRoot+'/'+id,name,items.length+' dossiers')).join('')}</div></div></section>`+hiddenMethod}));
 for (const [category,label,items] of hiddenCategories) {
   const dir=hiddenRoot+'/'+category; hiddenPaths.push(dir);
   write(dir,page({from:dir,title:label+' | Fortunes invisibles · Actualites.fr',desc:'Dossiers documentaires : '+label+'. Périmètres financiers, sources et limites.',canonical:dir+'/',body:hiddenHero('Fortunes invisibles',label,'Dossiers de recherche, sans classement financier artificiel.')+`<section class="band"><div class="in"><p>${hiddenBack(dir,hiddenRoot,'Toutes les catégories')}</p><div class="grid">${items.map(([id,name,country,metric])=>hiddenCard(dir,dir+'/'+id,name,country+' · '+metric)).join('')}</div></div></section>`+hiddenMethod}));
   for (const [id,name,country,metric,research,source] of items) {
     const profile=dir+'/'+id; hiddenPaths.push(profile);
     const related=items.filter(x=>x[0]!==id).slice(0,6);
     write(profile,page({from:profile,title:name+' : patrimoine, contrôle et sources | Actualites.fr',desc:name+' : '+metric+'. Dossier de recherche et limites documentaires.',canonical:profile+'/',body:hiddenHero(label,name,country+' · '+metric)+`<section class="band"><div class="in"><p>${hiddenBack(profile,hiddenRoot,'Fortunes invisibles')} / ${hiddenBack(profile,dir,label)}</p><h2>Périmètre financier étudié</h2><p>${esc(metric)}</p>${hiddenDocument(id)}<h2>Questions de recherche</h2><p>${esc(research)}</p><h2>Sources à examiner</h2><p><a href="${esc(source)}" rel="noopener noreferrer">${esc(source)}</a> — point de départ institutionnel, contenu et chiffres à vérifier.</p><h2>Photographies</h2><p>Aucune photographie documentaire validée pour ce dossier à ce stade.</p><p><a href="${link(profile,'contact')}?objet=correction">Proposer une source ou signaler une erreur</a></p><h2>Dossiers associés</h2><div class="grid">${related.map(([rid,rname,rcountry,rmetric])=>hiddenCard(profile,dir+'/'+rid,rname,rcountry+' · '+rmetric)).join('')}</div></div></section>`+hiddenMethod}));
   }
 }
 fs.writeFileSync(path.join(OUT,'data/fortunes-invisibles.json'),JSON.stringify({status:'research_catalogue',categories:hiddenCategories.map(([id,label,items])=>({id,label,entities:items.map(([id,name,country,metric,research,source])=>({id,name,country,metric,research,source,amount:null,verification:hiddenDossiers[id]?'documented_indicators':'pending',documentary:hiddenDossiers[id]||null}))}))}));

// ---------- sitemap, robots ----------
if (!PREVIEW) {
  
  const urls = ['', ...hiddenPaths.filter(p=>p.split('/').length<3||hiddenDossiers[p.split('/').at(-1)]).map(p=>p+'/'), ...influenceNetworkPages.map(p=>p+'/'), 'entreprises/', 'influence/', 'risques/', 'next-billionaires/', 'recherche/', 'ma-veille/', 'contact/', 'intelligence/', 'mentions-legales/', 'cgu/', 'confidentialite/', ...lists.map(l => l.dir + '/'), ...P.map(p => 'milliardaires/' + p.id + '/')];
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}/${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
}
console.log(`${OUT} : ${P.length} fiches, ${lists.length} listes`);
// liste des fiches pour la recherche de photos
fs.writeFileSync('data/fiches.csv', 'slug;nom;entreprises;pays;rang_forbes\n' + P.map(p => [p.id, fullName(p), p.co || '', p.country, p.rank || ''].map(v => String(v).replace(/;/g, ',')).join(';')).join('\n') + '\n');
