// Génère le site statique Actualites.fr (fiches, listes, sitemap) à partir de data/.
// Usage : node build.mjs            -> dist/ (production, URLs propres)
//         node build.mjs --preview  -> dist-preview/ (liens en index.html relatifs, pour l'aperçu)
import fs from 'node:fs';
import path from 'node:path';
import { rosette } from './src/guil.mjs';
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
const fr = (n, d) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d ?? (n % 1 ? 1 : 0), maximumFractionDigits: d ?? 1 });

const PHOTOS = JSON.parse(fs.readFileSync('data/photos.json', 'utf8'));
const phSrc = (from, ph) => /^https?:/.test(ph.fichier || ph.src || '') ? (ph.fichier || ph.src) : asset(from, ph.fichier || ph.src);
const portrait = p => (PHOTOS[p.id] || []).find(x => x.type === 'portrait') || (PHOTOS[p.id] || [])[0];
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
const medal = (p, size = 64, from = '') => portrait(p) ? `<div class="g ph"><img src="${esc(phSrc(from, portrait(p)))}" alt="${esc(p.name)}" loading="lazy"></div>` : `<div class="g" data-r="${p.id}" data-i="${INK[p.sec] || '#5a1230'}" data-d="${size > 100 ? 200 : 80}"></div>`;
const serial = p => p.rank ? 'N° ' + String(p.rank).padStart(3, '0') : 'HORS CLASSEMENT';
const billet = (p, big, from = '') => `<div class="billet${big ? ' big' : ''}">${portrait(p) ? `<div class="guil ph"><img src="${esc(phSrc(from, portrait(p)))}" alt="Portrait de ${esc(p.name)}"></div>` : `<div class="guil" data-r="${p.id}" data-i="${INK[p.sec] || '#5a1230'}" data-d="220"></div>`}<div><div class="bt"><span>${serial(p)}</span><span>${p.rank ? 'FORBES 2026' : 'ACTUALITES.FR'}</span></div><div class="bn">${esc(fullName(p))}</div><div class="bm">${esc([p.co || SEC[p.sec], p.country].filter(Boolean).join(' · '))}</div><div class="bv">${nwTxt(p)}</div></div><div class="micro">ACTUALITES.FR · LE MONDE DES MILLIARDS · ${esc(fullName(p).toUpperCase())} · ${serial(p)} · ACTUALITES.FR · LE MONDE DES MILLIARDS</div></div>`;
const nwTxt = p => p.nw == null ? 'Fortune liée' : fr(p.nw) + ' Md$';
const fullName = p => p.name + (p.fam ? ' et sa famille' : '');
const meta = p => [p.co || SEC[p.sec], p.country, p.age ? p.age + ' ans' : (p.born ? (p.g === 'f' ? 'née' : 'né') + ' en ' + p.born : '')].filter(Boolean).join(' · ');
const card = (from, p) => `<a class="card pcard" href="${link(from, 'milliardaires/' + p.id)}">${p.rank ? `<span class="rk">N° ${p.rank}</span>` : ''}${medal(p, 64, from)}<div><div class="nm">${esc(fullName(p))}</div><div class="meta">${esc(meta(p))}</div><div class="nw" style="margin-top:6px">${nwTxt(p)}</div></div></a>`;

const header = from => `<header class="top"><div class="in"><a class="logo" href="${home(from)}">Actualites<span>.fr</span></a><nav class="nav" aria-label="Rubriques"><a href="${link(from, 'milliardaires')}">Fortunes</a><a href="${link(from, 'entreprises')}">Entreprises</a><a href="${link(from, 'influence')}">Influence</a><a href="${link(from, 'risques')}">Risques</a><a href="${link(from, 'next-billionaires')}">Next Billionaires</a><a href="${link(from, 'recherche')}">Recherche</a><a class="hot" href="${link(from, 'intelligence')}">Intelligence Pro</a></nav></div></header>`;
const footer = from => `<footer class="band"><div class="in cols"><div><div class="logo" style="color:#f5ede3">Actualites<span>.fr</span></div><p style="margin-top:8px">Global Billionaire Intelligence — fortunes, pouvoir, influence et risques.</p></div><div><b style="color:#f5ede3">Classements</b><p><a href="${link(from, 'milliardaires')}">Les 200 plus grandes fortunes</a><br><a href="${link(from, 'milliardaires/femmes')}">Les femmes milliardaires</a><br><a href="${link(from, 'milliardaires/france')}">Les milliardaires français</a><br><a href="${link(from, 'milliardaires/moins-de-40-ans')}">Les milliardaires de moins de 40 ans</a></p></div><div><b style="color:#f5ede3">Méthode</b><p>Fortunes : ${esc(SRC_FORBES)} ; Challenges 2026 pour la France. <a href="${home(from, 'methode')}">Méthodologie et corrections</a>.</p></div><div><b style="color:#f5ede3">Éditeur</b><p>Édité par DeepSci Labs<br><a href="${link(from, 'mentions-legales')}">Mentions légales</a><br><a href="${link(from, 'cgu')}">Conditions d'utilisation</a><br><a href="${link(from, 'confidentialite')}">Confidentialité</a><br>Corrections : contact@actualites.fr</p></div></div></footer>`;
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
fs.copyFileSync('src/influence-live.js',path.join(OUT,'assets/influence-live.js'));

fs.copyFileSync('src/wiki-live.js', path.join(OUT, 'assets/wiki-live.js'));

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
 '<section class="bio-section" id="sources"><div class="bio-section-head"><p class="bio-eyebrow">Documentation</p><h2>Sources et corrections</h2></div><p>Les articles ci-dessus donnent accès aux documents cités et aux reportages consultés. Les données de fortune correspondent à l’édition 2026 du classement Forbes.</p><p class="bio-note"><a href="mailto:contact@actualites.fr?subject=Correction%20fiche%20'+encodeURIComponent(p.id)+'">Signaler une erreur</a> · <a href="'+home(from,'methode')+'">Méthodologie</a></p></section>';
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
    p.rank ? `${fullName(p)} ${p.fam ? 'occupent' : 'occupe'} le ${p.rank === 1 ? '1er' : p.rank + 'e'} rang mondial, avec une fortune estimée à ${fr(p.nw)} milliards de dollars au 1er mars 2026.` : (p.nw != null ? `Fortune estimée à ${fr(p.nw)} milliards de dollars (${p.srcNote}).` : '')
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
<nav class="bio-nav" aria-label="Sommaire de la fiche"><div class="in"><a href="#identite">Portrait</a><a href="#parcours">Biographie</a>${quality?.personal?.personality?.length?'<a href="#personnalite">Portrait public</a>':''}${quality?.personal?.preferences?.length?'<a href="#gouts">Loisirs</a>':''}${quality?.personal?.personalLife?.length?'<a href="#vie-personnelle">Famille</a>':''}${quality?.personal?.relationships?.length?'<a href="#sentimental">Vie sentimentale</a>':''}<a href="#entreprises">Entreprises</a>${p.id==='elon-musk'||p.id==='thomas-frist-jr'?'<a href="#relations">Relations</a>':''}<a href="#chronologie">Dates</a>${p.id==='elon-musk'?'<a href="#risques">Gouvernance</a>':''}${quality?.personal?.documentedRisks?.length?'<a href="#risques-personnels">Controverses</a>':''}<a href="#wikipedia">Wikipédia et sources</a><a href="#sources">Sources</a></div></nav>
<div class="band"><div class="in prof">
<div class="story"><div class="bio-intro"><p class="bio-eyebrow">Identity / Profile</p><h2>Profil et trajectoire</h2><p class="bio-intro-lede">Des origines de la fortune aux grandes décisions, avec des récits, des dates et des sources à explorer.</p></div>${story.map((t, j) => `<p${j ? '' : ' class="first"'}>${esc(t)}</p>`).join('')}
${dossierHtml(p,from)}
<section class="bio-section wiki-panel" id="wikipedia" data-wiki-profile="${esc(p.id)}" aria-live="polite"><div class="bio-section-head"><p class="bio-eyebrow">Wikimedia / Recherche documentaire</p></div><p data-wiki-status>Recherche des références encyclopédiques…</p></section>
<script src="${asset(from, 'assets/wiki-live.js')}" defer></script>\n${kpis.length ? `<h2 style="margin-top:30px">En perspective</h2><div class="kpis">${kpis.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>` : ''}${(PHOTOS[p.id] || []).length ? `<h2 style="margin-top:30px">En images</h2><div class="gal">${PHOTOS[p.id].map(ph => `<figure><img src="${esc(phSrc(from, ph))}" alt="${esc(p.name + (ph.legende ? ', ' + ph.legende : ''))}" loading="lazy"><figcaption>${esc(ph.legende || '')} <span>© ${esc(ph.auteur || ph.credit)}, ${esc(ph.licence)}${ph.source ? ` · <a href="${esc(ph.source)}" rel="noopener">source</a>` : ''}</span></figcaption></figure>`).join('')}</div>` : ''}</div>
<aside><h2>L'essentiel</h2><div class="rule-box" style="margin-bottom:16px"><p class="small" style="margin:0"><b>Documents disponibles.</b> ${esc(dossierStatus)}.</p><p class="small" style="margin:8px 0 0">${referencedChapters} chapitres documentaires · ${referencedEvents} événements datés · ${speechCount} extraits de discours enregistrés.</p></div><dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${k === 'Situation personnelle annoncée' ? v : esc(v)}</dd>`).join('')}</dl>
<div class="rule-box" style="margin-top:16px"><p class="small" style="margin:0"><b>Données financières.</b> ${p.rank ? 'Fortune, âge, rang, entreprises et faits : <a href="https://www.forbes.com.au/news/billionaires/the-forbes-billionaires-list-top-200/" rel="noopener">Forbes, World\'s Billionaires 2026</a> (données au 1er mars 2026), textes réécrits par la rédaction.' : esc(p.srcNote) + '.'} Une erreur ? contact@actualites.fr</p></div></aside>
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
<div class="row" style="margin:0 0 26px">${chips.slice(0, 4).map(([d, l]) => `<a class="btn${d === from ? ' pri' : ''}" href="${link(from, d)}">${esc(l)}</a>`).join('')}<a class="btn" href="${link(from, 'recherche')}">Recherche avancée</a></div>
${items.length >= 3 ? `<div class="grid podium" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:26px;margin:10px 0 34px">${items.slice(0, 3).map(p => `<a href="${link(from, 'milliardaires/' + p.id)}" style="text-decoration:none">${billet(p, false, from)}</a>`).join('')}</div>` : ''}<div class="bars">${items.map((p, i) => `<a class="bar${i ? '' : ' top1'}" href="${link(from, 'milliardaires/' + p.id)}"><span>${i + 1}. ${esc(fullName(p))}</span><div class="t"><div class="f" style="width:${p.nw ? (p.nw / max * 100).toFixed(1) : 0}%"></div></div><span class="v">${nwTxt(p)}</span></a>`).join('')}</div>
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

const riskEntries=[];
for(const p of P){const r=researchProfiles[p.id]?.personal?.documentedRisks||[];for(const e of r){if(e.heading&&e.body&&/^https:\/\//.test(e.source||''))riskEntries.push({person:p,item:e})}}
const governanceEvents=[...timeline('elon-musk'),...timeline('thomas-frist-jr')].filter(x=>x.type==='governance');
hubWrite('risques','Gouvernance, procédures et controverses',
 'Événements économiques, controverses et décisions de gouvernance documentés concernant les grandes fortunes.',
 hubHead('Billionaire Risk Monitor','Gouvernance et controverses','Des événements datés, des décisions d’entreprise et des enquêtes, avec accès aux documents cités.')+
 hubWrap(hubSection('Dossiers documentaires','Épisodes faisant déjà l’objet d’une section de recherche sourcée dans nos biographies.',riskEntries.map(({person:p,item})=>'<article class="card hub-research"><p class="tagline">'+esc(p.name)+'</p><h3>'+esc(item.heading)+'</h3><p>'+esc(item.body.slice(0,490))+'</p><div class="hub-company-links"><a href="'+link('risques','milliardaires/'+p.id)+'#risques-personnels">Voir la fiche</a><a target="_blank" rel="noopener noreferrer" href="'+esc(item.source)+'">Document source</a></div></article>').join(''))+
 hubSection('Chronologie de gouvernance','Une sélection de faits datés contenus dans le moteur documentaire.',governanceEvents.map(e=>'<article class="card hub-research"><p class="tagline">'+esc(e.date)+'</p><h3>'+esc(e.title)+'</h3><p>'+esc(e.person==='elon-musk'?'Elon Musk':'Thomas Frist Jr.')+'</p><a href="'+link('risques','milliardaires/'+e.person)+'">Ouvrir le dossier</a></article>').join(''))));

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
 'Moteur de recherche par nom, entreprise, pays et secteur sur les 207 biographies.',
 hubHead('Billionaire Finder','Rechercher dans 207 biographies','Parcourez les personnes, entreprises, pays et secteurs à partir des données publiées.')+
 hubWrap('<div class="hub-searchbar"><label for="hubQuery">Personne, entreprise ou pays</label><input id="hubQuery" type="search" autocomplete="off" placeholder="Ex. Microsoft, Arnault, France"><label for="hubSector">Secteur</label><select id="hubSector"><option value="">Tous les secteurs</option>'+activeSectors.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('')+'</select></div><p id="hubCount" class="small" role="status">'+P.length+' fiches</p><div class="grid hub-cards" id="hubResults">'+searchCards+'</div>'+
 '<script>const q=document.getElementById("hubQuery"),sector=document.getElementById("hubSector"),cards=[...document.querySelectorAll(".hub-search-card")],count=document.getElementById("hubCount");function filter(){const v=q.value.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase(),s=sector.value;let n=0;for(const c of cards){const yes=(!v||c.dataset.search.includes(v))&&(!s||c.dataset.sector===s);c.hidden=!yes;if(yes)n++}count.textContent=n+" fiche"+(n>1?"s":"")+" correspondante"+(n>1?"s":"")}q.addEventListener("input",filter);sector.addEventListener("change",filter);</script>'));

const documented=Object.values(researchProfiles).reduce((a,p)=>a+(p.sections?.length||0),0);
const sourced=Object.values(researchProfiles).reduce((a,p)=>a+(p.events?.length||0),0);
hubWrite('intelligence','Intelligence Pro — données et recherche',
 'Accès aux travaux documentaires, classements et outils de suivi des grandes fortunes.',
 hubHead('Intelligence Pro','Le centre de recherche des grandes fortunes','Consultez le corpus existant, les groupes économiques, les événements documentés et l’avancement de la collecte.')+
 hubWrap('<div class="hub-metrics"><div><b>'+P.length+'</b><span>fiches disponibles</span></div><div><b>'+documented+'</b><span>chapitres éditoriaux</span></div><div><b>'+sourced+'</b><span>événements enregistrés</span></div></div>'+
 hubSection('Explorer la base','Les fonctions réellement disponibles.',[
 ['Base de fortunes','Classement et biographies', 'milliardaires'],['Graphe d’entreprises','Groupes et personnes associés','entreprises'],['Réseaux et dynasties','Transmissions et groupes économiques','influence'],['Risques documentés','Enquêtes et chronologies','risques'],['Prochaine génération','Fortunes jeunes et hors Top 200','next-billionaires'],['Recherche','Filtre sur tous les dossiers','recherche']
 ].map(([title,body,dir])=>'<a class="card" href="'+link('intelligence',dir)+'"><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p></a>').join(''))+
 '<section class="hub-part"><h2>Suivi de la collecte</h2><p>Le moteur Cloudflare parcourt les personnalités répertoriées et récupère des références encyclopédiques et documentaires.</p><p><a href="https://actualites-biography-discovery.actualites-fr-next.workers.dev/status" target="_blank" rel="noopener noreferrer">État des traitements automatiques</a> · <a href="'+asset('intelligence','data/research-backlog.json')+'" target="_blank" rel="noopener noreferrer">Dossiers à documenter (JSON)</a></p><p>Les offres payantes ne sont pas ouvertes.</p></section>'));

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
for (const [k, v] of Object.entries({ __L_ALL__: link('', 'milliardaires'), __L_FEMMES__: link('', 'milliardaires/femmes'), __L_FRANCE__: link('', 'milliardaires/france'), __L_JEUNES__: link('', 'milliardaires/moins-de-40-ans'), __L_ENTREPRISES__: link('', 'entreprises'), __L_INFLUENCE__: link('', 'influence'), __L_RISQUES__: link('', 'risques'), __L_NEXT__: link('', 'next-billionaires'), __L_RECHERCHE__: link('', 'recherche'), __L_INTELLIGENCE__: link('', 'intelligence'), __L_ML__: link('', 'mentions-legales'), __L_CGU__: link('', 'cgu'), __L_CONF__: link('', 'confidentialite') })) homeHtml = homeHtml.replaceAll(k, v);
fs.writeFileSync(path.join(OUT, 'index.html'), homeHtml);
write('pendant-que-vous-lisez', page({from:'pendant-que-vous-lisez',title:'Actualites.fr — Recherche',desc:'Retrouvez les dossiers sur les grandes fortunes.',canonical:'pendant-que-vous-lisez/',body:`<div class="band"><div class="in"><h1>Cette rubrique a été retirée</h1><p>Retrouvez les dossiers et comparaisons économiques.</p><a class="btn" href="${home('pendant-que-vous-lisez','finder')}">Explorer les fortunes</a></div></div>`}));
if (fs.existsSync('src/_headers') && !PREVIEW) fs.copyFileSync('src/_headers', path.join(OUT, '_headers'));

// Public, machine-readable documentary data (no private or inferred traits).
fs.mkdirSync(path.join(OUT,'data'),{recursive:true});
const G=graph(P);
fs.writeFileSync(path.join(OUT,'data/knowledge-graph.json'),JSON.stringify(G));
fs.writeFileSync(path.join(OUT,'data/research-status.json'),JSON.stringify({sources:sources.length,people:P.length,companies:G.nodes.filter(n=>n.type==='company').length,associations:G.edges.length,events:G.events.length,observations:observations.length,candidates:candidates.length,collection:'manual',rankingGrowthAvailable:false}));
 fs.writeFileSync(path.join(OUT,'data/research-backlog.json'),JSON.stringify(researchBacklog));
 fs.writeFileSync(path.join(OUT,'data/biography-research-coverage.json'),JSON.stringify({totalProfiles:P.length,researchedProfiles:researchQuality.profiles,researchedSections:researchQuality.sections,researchedEvents:researchQuality.events,distinctSourceUrls:researchQuality.uniqueSourceUrls,updatedAt:researchData.updatedAt,method:'Editorial records with direct source links; not automatically corroborated'}));
// ---------- sitemap, robots ----------
if (!PREVIEW) {
  const today = '2026-11-26';
  const urls = ['', 'entreprises/', 'influence/', 'risques/', 'next-billionaires/', 'recherche/', 'intelligence/', 'mentions-legales/', 'cgu/', 'confidentialite/', ...lists.map(l => l.dir + '/'), ...P.map(p => 'milliardaires/' + p.id + '/')];
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
}
console.log(`${OUT} : ${P.length} fiches, ${lists.length} listes`);
// liste des fiches pour la recherche de photos
fs.writeFileSync('data/fiches.csv', 'slug;nom;entreprises;pays;rang_forbes\n' + P.map(p => [p.id, fullName(p), p.co || '', p.country, p.rank || ''].map(v => String(v).replace(/;/g, ',')).join(';')).join('\n') + '\n');
