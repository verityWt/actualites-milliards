// Génère le site statique Actualites.fr (fiches, listes, sitemap) à partir de data/.
// Usage : node build.mjs            -> dist/ (production, URLs propres)
//         node build.mjs --preview  -> dist-preview/ (liens en index.html relatifs, pour l'aperçu)
import fs from 'node:fs';
import path from 'node:path';
import { rosette } from './src/guil.mjs';

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
const fr = (n, d) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d ?? (n % 1 ? 1 : 0), maximumFractionDigits: d ?? 1 });

const PHOTOS = JSON.parse(fs.readFileSync('data/photos.json', 'utf8'));
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
  id, name: c.name, fam: false, rank: null, nw: c.nw, age: c.age ?? null, born: c.born ?? null, country: c.country, sec: c.ind,
  g: c.g, co: c.co, orig: c.orig, bio: c.bio, single: c.single || null, srcNote: c.srcNote
});
// unicité des slugs
const seen = {}; for (const p of P) { if (seen[p.id]) p.id += '-' + (++seen[p.id]); else seen[p.id] = 1; }
P.sort((a, b) => (b.nw ?? -1) - (a.nw ?? -1));
const byId = Object.fromEntries(P.map(p => [p.id, p]));

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
const medal = (p, size = 64) => `<div class="g" data-r="${p.id}" data-i="${INK[p.sec] || '#5a1230'}" data-d="${size > 100 ? 200 : 80}"></div>`;
const serial = p => p.rank ? 'N° ' + String(p.rank).padStart(3, '0') : 'HORS CLASSEMENT';
const billet = (p, big) => `<div class="billet${big ? ' big' : ''}"><div class="guil" data-r="${p.id}" data-i="${INK[p.sec] || '#5a1230'}" data-d="220"></div><div><div class="bt"><span>${serial(p)}</span><span>${p.rank ? 'FORBES 2026' : 'ACTUALITES.FR'}</span></div><div class="bn">${esc(fullName(p))}</div><div class="bm">${esc([p.co || SEC[p.sec], p.country].filter(Boolean).join(' · '))}</div><div class="bv">${nwTxt(p)}</div></div><div class="micro">ACTUALITES.FR · LE MONDE DES MILLIARDS · ${esc(fullName(p).toUpperCase())} · ${serial(p)} · ACTUALITES.FR · LE MONDE DES MILLIARDS</div></div>`;
const nwTxt = p => p.nw == null ? 'Fortune liée' : fr(p.nw) + ' Md$';
const fullName = p => p.name + (p.fam ? ' et sa famille' : '');
const meta = p => [p.co || SEC[p.sec], p.country, p.age ? p.age + ' ans' : (p.born ? (p.g === 'f' ? 'née' : 'né') + ' en ' + p.born : '')].filter(Boolean).join(' · ');
const card = (from, p) => `<a class="card pcard" href="${link(from, 'milliardaires/' + p.id)}">${p.rank ? `<span class="rk">N° ${p.rank}</span>` : ''}${medal(p)}<div><div class="nm">${esc(fullName(p))}</div><div class="meta">${esc(meta(p))}</div><div class="nw" style="margin-top:6px">${nwTxt(p)}</div>${p.single ? '<span class="chip s" style="margin-top:8px">Séparation annoncée</span>' : ''}</div></a>`;

const header = from => `<header class="top"><div class="in"><a class="logo" href="${home(from)}">Actualites<span>.fr</span></a><nav class="nav" aria-label="Rubriques"><a href="${home(from)}">Accueil</a><a href="${link(from, 'milliardaires')}">Milliardaires</a><a href="${link(from, 'milliardaires/femmes')}">Femmes</a><a href="${link(from, 'milliardaires/france')}">France</a><a href="${link(from, 'milliardaires/moins-de-40-ans')}">Jeunes</a><a href="${home(from, 'singles')}">Billion Singles</a><a href="${home(from, 'dream')}">Billionaire Dream</a><a class="hot" href="${home(from, 'quiz')}">Le test</a></nav></div></header>`;
const footer = from => `<footer class="band"><div class="in cols"><div><div class="logo" style="color:#f5ede3">Actualites<span>.fr</span></div><p style="margin-top:8px">Le monde des milliards, chiffres sourcés.</p></div><div><b style="color:#f5ede3">Classements</b><p><a href="${link(from, 'milliardaires')}">Les 200 plus grandes fortunes</a><br><a href="${link(from, 'milliardaires/femmes')}">Les femmes milliardaires</a><br><a href="${link(from, 'milliardaires/france')}">Les milliardaires français</a><br><a href="${link(from, 'milliardaires/moins-de-40-ans')}">Les milliardaires de moins de 40 ans</a></p></div><div><b style="color:#f5ede3">Méthode</b><p>Fortunes : ${esc(SRC_FORBES)} ; Challenges 2026 pour la France. Situation sentimentale publiée seulement si annoncée publiquement.</p></div><div><b style="color:#f5ede3">Éditeur</b><p>Édité par DeepSci Labs<br><a href="${link(from, 'mentions-legales')}">Mentions légales</a><br><a href="${link(from, 'cgu')}">Conditions d'utilisation</a><br><a href="${link(from, 'confidentialite')}">Confidentialité</a><br>Corrections : contact@actualites.fr</p></div></div></footer>`;
const page = ({ from, title, desc, canonical, body, jsonld = [] }) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${canonical}">
<meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="Actualites.fr">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}/${canonical}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,700;1,6..96,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${asset(from, 'assets/site.css')}">
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head><body>${header(from)}<main>${body}</main>${footer(from)}<script src="${asset(from, 'assets/guil.js')}" defer></script></body></html>`;
const write = (dir, html) => { const d = path.join(OUT, dir); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), html); };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.copyFileSync('src/site.css', path.join(OUT, 'assets/site.css'));
fs.writeFileSync(path.join(OUT, 'assets/guil.js'), `${rosette.toString()}\nfor(const e of document.querySelectorAll('[data-r]'))e.innerHTML=rosette(e.dataset.r,'r'+Math.random().toString(36).slice(2,8),e.dataset.i,'#b8892d',+e.dataset.d);\nfor(const e of document.querySelectorAll('[data-p]'))e.innerHTML=rosette(e.dataset.p,'p'+Math.random().toString(36).slice(2,8),'#e2c27a','#e2c27a',260).replace(/^<svg[^>]*>|<\\/svg>$/g,'');`);

// ---------- fiches ----------
const YACHT = 300e6; // prix simulé d'un superyacht de 90 m, en dollars
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
    p.rank ? `${fullName(p)} ${p.fam ? 'occupent' : 'occupe'} le ${p.rank === 1 ? '1er' : p.rank + 'e'} rang mondial, avec une fortune estimée à ${fr(p.nw)} milliards de dollars au 1er mars 2026.` : (p.nw != null ? `Fortune estimée à ${fr(p.nw)} milliards de dollars (${p.srcNote}).` : '')
  ].filter(Boolean);
  const facts = [['Fortune', nwTxt(p)], p.rank && ['Rang mondial', 'N° ' + p.rank + ' (Forbes 2026)'], p.co && ['Entreprises', p.co], p.role && ['Rôle', p.role], ['Secteur', SEC[p.sec]], ['Pays', p.country],
    (p.age || p.born) && ['Âge', p.age ? p.age + ' ans' + (p.rank ? ' (au 1er mars 2026)' : '') : (p.g === 'f' ? 'Née' : 'Né') + ' en ' + p.born],
    p.orig && ['Origine', { self: 'Fortune bâtie', herit: 'Fortune héritée', mix: 'Fortune mixte' }[p.orig]],
    ['Vie privée', p.single ? `${esc(p.single.d)} : ${esc(p.single.t)} <span class="small">(source : <a href="${esc(p.single.u)}" rel="noopener">${esc(p.single.src)}</a>)</span>` : 'Rien d\'annoncé publiquement à ce jour sur Actualites.fr.']].filter(Boolean);
  const kpis = p.nw ? [[fr(Math.floor(p.nw * 1e9 / YACHT), 0), 'superyachts de 90 m (prix simulé : 300 M$)'], [fr(p.nw / TOTAL * 100, 2) + ' %', 'de la fortune de tous les milliardaires du monde'], [fr(p.nw / MUSK * 100, p.nw / MUSK < .1 ? 1 : 0) + ' %', 'de la fortune d\'Elon Musk']] : [];
  const body = `<section class="inkband">${pattern(p.id)}<div class="in band"><p class="small"><a href="${link(from, 'milliardaires')}">Milliardaires</a> · <a href="${link(from, 'milliardaires/secteur/' + SECSLUG[p.sec])}">${esc(SEC[p.sec])}</a> · <a href="${link(from, 'milliardaires/' + (p.country === 'France' ? 'france' : 'pays/' + slugify(p.country)))}">${esc(p.country)}</a></p>
<div class="hero" style="margin-top:6px"><div class="in" style="padding:10px 0 20px"><div><p class="tagline">${esc(rankTxt || 'Billion Index')}</p><h1 style="font-size:clamp(38px,5.6vw,64px)">${esc(fullName(p))}</h1>${p.role || p.co ? `<p class="lede" style="margin-top:14px">${esc([p.role, p.co].filter(Boolean).join(' · '))}</p>` : ''}<div class="row">${p.single ? '<span class="chip s">Séparation annoncée</span>' : ''}${p.orig ? `<span class="chip">${{ self: 'Fortune bâtie', herit: 'Fortune héritée', mix: 'Fortune mixte' }[p.orig]}</span>` : ''}<span class="chip">${esc(SEC[p.sec])}</span></div></div>${billet(p, true)}</div></div></div></section>
<div class="band"><div class="in prof">
<div class="story"><h2>Son histoire</h2>${story.map((t, j) => `<p${j ? '' : ' class="first"'}>${esc(t)}</p>`).join('')}
${kpis.length ? `<h2 style="margin-top:30px">En perspective</h2><div class="kpis">${kpis.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div><p class="small"><a href="${home(from, 'dream')}">Et vous, que feriez-vous d'un milliard ?</a> · <a href="${home(from, 'quiz')}">De quel milliardaire êtes-vous le plus proche ?</a></p>` : ''}${(PHOTOS[p.id] || []).length ? `<h2 style="margin-top:30px">En images</h2><div class="gal">${PHOTOS[p.id].map(ph => `<figure><img src="${esc(ph.src)}" alt="${esc(p.name + (ph.legende ? ', ' + ph.legende : ''))}" loading="lazy"><figcaption>${esc(ph.legende || '')} <span>© ${esc(ph.credit)}, ${esc(ph.licence)}${ph.source ? ` · <a href="${esc(ph.source)}" rel="noopener">source</a>` : ''}</span></figcaption></figure>`).join('')}</div>` : ''}</div>
<aside><h2>L'essentiel</h2><dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${k === 'Vie privée' ? v : esc(v)}</dd>`).join('')}</dl>
<div class="rule-box" style="margin-top:16px"><p class="small" style="margin:0"><b>Sources.</b> ${p.rank ? 'Fortune, âge, rang, entreprises et faits : <a href="https://www.forbes.com.au/news/billionaires/the-forbes-billionaires-list-top-200/" rel="noopener">Forbes, World\'s Billionaires 2026</a> (données au 1er mars 2026), textes réécrits par la rédaction.' : esc(p.srcNote) + '.'} Une erreur ? contact@actualites.fr</p></div></aside>
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
      { '@context': 'https://schema.org', '@type': 'Person', name: p.name, nationality: p.country, ...(p.co && { worksFor: p.co.split(', ').map(n => ({ '@type': 'Organization', name: n })) }), ...(p.nw != null && { netWorth: { '@type': 'MonetaryAmount', currency: 'USD', value: p.nw * 1e9 } }), url: `${SITE}/${from}/` },
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
const secs = [...new Set(P.map(p => p.sec))];
for (const s of secs) lists.push({ dir: 'milliardaires/secteur/' + SECSLUG[s], h: 'Milliardaires : ' + SEC[s], t: `Les milliardaires de la catégorie ${SEC[s].toLowerCase()} en 2026`, d: `Les plus grandes fortunes du secteur ${SEC[s].toLowerCase()} en 2026, avec fiche détaillée pour chacune.`, f: p => p.sec === s });
const countries = Object.entries(P.reduce((a, p) => (a[p.country] = (a[p.country] || 0) + 1, a), {})).filter(([, n]) => n >= 3).map(([c]) => c);
const cslug = c => slugify(c);
for (const c of countries) if (c !== 'France') lists.push({ dir: 'milliardaires/pays/' + cslug(c), h: 'Milliardaires : ' + c, t: `Les milliardaires les plus riches : ${c} (2026)`, d: `Les plus grandes fortunes de ce pays en 2026 (${c}), avec fiche détaillée pour chacune. Source Forbes.`, f: p => p.country === c });

const FRCH = [['Famille Arnault', 'LVMH', 116.7, 121.2], ['Héritiers Hermès', 'Hermès', 163.4, 114], ['Alain et Gérard Wertheimer', 'Chanel', 95, 95], ['Françoise Bettencourt Meyers', 'L\'Oréal', 73.8, 69.7], ['Rodolphe Saadé', 'CMA CGM', 35, 31.5], ['Emmanuel Besnier', 'Lactalis', null, 14.2]];
for (const L of lists) {
  const items = P.filter(L.f), from = L.dir, max = Math.max(...items.map(p => p.nw || 0));
  const chips = [['milliardaires', 'Monde'], ['milliardaires/femmes', 'Femmes'], ['milliardaires/france', 'France'], ['milliardaires/moins-de-40-ans', 'Moins de 40 ans'], ...countries.filter(c => c !== 'France').map(c => ['milliardaires/pays/' + cslug(c), c])];
  const frBlock = L.extra === 'france' ? `<h2 style="margin-top:40px">Le classement Challenges 2026</h2><p class="small">Fortunes professionnelles en milliards d'euros, publiées le 8 juillet 2026. Challenges compte par famille et en euros, Forbes par personne et en dollars : les chiffres diffèrent.</p><div class="scroll"><table><thead><tr><th>Fortune</th><th>Groupe</th><th class="n">2025</th><th class="n">2026</th></tr></thead><tbody>${FRCH.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="n">${r[2] == null ? 'n.d.' : fr(r[2], 1)}</td><td class="n">${fr(r[3], 1)}</td></tr>`).join('')}</tbody></table></div><p class="small">Bernard Arnault est devenu l'unique propriétaire de Challenges fin 2025.</p>` : '';
  const body = `<section class="inkband">${pattern(L.dir.replace(/\//g, '-'))}<div class="in band"><p class="tagline">Billion Index</p><h1 style="font-size:clamp(36px,5.4vw,60px);max-width:18ch">${esc(L.h)}</h1>
<p class="lede" style="margin-top:12px">${items.length} fortunes. ${esc(SRC_FORBES)}.</p></div></section><div class="band"><div class="in">
<div class="row" style="margin:0 0 26px">${chips.slice(0, 4).map(([d, l]) => `<a class="btn${d === from ? ' pri' : ''}" href="${link(from, d)}">${esc(l)}</a>`).join('')}<a class="btn" href="${home(from, 'finder')}">Recherche avancée</a></div>
${items.length >= 3 ? `<div class="grid podium" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:26px;margin:10px 0 34px">${items.slice(0, 3).map(p => `<a href="${link(from, 'milliardaires/' + p.id)}" style="text-decoration:none">${billet(p)}</a>`).join('')}</div>` : ''}<div class="bars">${items.map((p, i) => `<a class="bar${i ? '' : ' top1'}" href="${link(from, 'milliardaires/' + p.id)}"><span>${i + 1}. ${esc(fullName(p))}</span><div class="t"><div class="f" style="width:${p.nw ? (p.nw / max * 100).toFixed(1) : 0}%"></div></div><span class="v">${nwTxt(p)}</span></a>`).join('')}</div>
${frBlock}
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
for (const [k, v] of Object.entries({ __L_ALL__: link('', 'milliardaires'), __L_FEMMES__: link('', 'milliardaires/femmes'), __L_FRANCE__: link('', 'milliardaires/france'), __L_JEUNES__: link('', 'milliardaires/moins-de-40-ans'), __L_ML__: link('', 'mentions-legales'), __L_CGU__: link('', 'cgu'), __L_CONF__: link('', 'confidentialite') })) homeHtml = homeHtml.replaceAll(k, v);
fs.writeFileSync(path.join(OUT, 'index.html'), homeHtml);
fs.mkdirSync(path.join(OUT, 'pendant-que-vous-lisez'), { recursive: true });
fs.copyFileSync('src/calculateur.html', path.join(OUT, 'pendant-que-vous-lisez/index.html'));
if (fs.existsSync('src/_headers') && !PREVIEW) fs.copyFileSync('src/_headers', path.join(OUT, '_headers'));

// ---------- sitemap, robots ----------
if (!PREVIEW) {
  const today = '2026-11-24';
  const urls = ['', 'pendant-que-vous-lisez/', 'mentions-legales/', 'cgu/', 'confidentialite/', ...lists.map(l => l.dir + '/'), ...P.map(p => 'milliardaires/' + p.id + '/')];
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
}
console.log(`${OUT} : ${P.length} fiches, ${lists.length} listes`);
