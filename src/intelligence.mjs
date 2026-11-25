// Documentary intelligence: only observed, sourced facts; no individual psychological scoring.
export const sources=[{id:'tesla-musk-bio',url:'https://ir.tesla.com/corporate/elon-musk',language:'en',kind:'company',date:'2026-11-25'},{id:'spacex-nasa',url:'https://www.nasa.gov/wp-content/uploads/2018/07/spacex_nasa_crs-4_presskit.pdf',language:'en',kind:'institution',date:'2014'},{id:'spacex-leadership',url:'https://ir.spacex.com/leadership/',language:'en',kind:'company',date:'2026-11-25'},{id:'twitter-sec-2022',url:'https://www.sec.gov/Archives/edgar/data/1418091/000119312522117720/d319190dex991.htm',language:'en',kind:'regulatory',date:'2022-04-25'},{id:'twitter-completion-2022',url:'https://www.stblaw.com/elon-musk-completes-twitter-acquisition/',language:'en',kind:'legal',date:'2022-10-28'},{id:'tesla-sec-q3-2026',url:'https://www.sec.gov/Archives/edgar/data/1318605/000162828026066775/tsla-20260930.htm',language:'en',kind:'regulatory',date:'2026-09-30'},{id:'tesla-proxy-2026',url:'https://www.sec.gov/Archives/edgar/data/1318605/000110465926116700/tm267596-1_def14a.htm',language:'en',kind:'regulatory',date:'2026-10'},{id:'forbes-2026',url:'https://www.forbes.com.au/news/billionaires/the-forbes-billionaires-list-top-200/',date:'2026-03-01',language:'en',kind:'ranking'},{id:'vanderbilt-frist',url:'https://news.vanderbilt.edu/2002/07/04/vanderbilt-names-frist-distinguished-alumni-60247/',language:'en',kind:'institution'},{id:'upi-frist',url:'https://www.upi.com/Archives/1997/07/25/UPI-Focus-Report-Columbia-gets-new-chief/6097869803200/',language:'en',kind:'press'},{id:'forbes-frist',url:'https://images.forbes.com/lists/2006/54/biz_06rich400_Thomas-F-Frist-Jr-family_XA34.html',language:'en',kind:'press'}];
export const events=[
{person:'elon-musk',date:'1999-03',type:'transaction',title:'Vente de Zip2 à Compaq (acquisition indiquée dans la biographie officielle Tesla)',source:'tesla-musk-bio',status:'documented'},
{person:'elon-musk',date:'2002',type:'company',title:'Création de SpaceX',source:'spacex-nasa',status:'documented'},
{person:'elon-musk',date:'2002-10',type:'transaction',title:'Acquisition de PayPal par eBay, après la participation de Musk à sa création',source:'tesla-musk-bio',status:'documented'},
{person:'elon-musk',date:'2022-04-25',type:'transaction',title:'Annonce du projet d’acquisition de Twitter pour environ 44 milliards de dollars',source:'twitter-sec-2022',status:'documented'},
{person:'elon-musk',date:'2022-10-28',type:'transaction',title:'Finalisation de l’acquisition de Twitter et retrait de la Bourse',source:'twitter-completion-2022',status:'documented'},
{person:'elon-musk',date:'2026-04-21',type:'governance',title:'Tesla annonce la déchéance de l’attribution intérimaire de 96 millions d’actions de 2025, liée à la décision concernant le plan de 2018',source:'tesla-sec-q3-2026',status:'documented'},
{person:'thomas-frist-jr',date:'1968',type:'company',title:'Cofondation de HCA',source:'vanderbilt-frist',status:'documented'},{person:'thomas-frist-jr',date:'1997-07-25',type:'governance',title:'Retour à la direction de Columbia/HCA après le départ de Richard Scott',source:'upi-frist',status:'documented',scope:'company'},{person:'thomas-frist-jr',date:'2006',type:'transaction',title:'Rachat de HCA avec des investisseurs financiers',source:'forbes-frist',status:'documented'}];
export const observations=[]; // Only dated public statements or actions with source and context.
export const candidates=[]; // No invented estimates or rankings.
export const normalize=s=>String(s).normalize('NFKC').trim().toLowerCase();
export function graph(people){
 const nodes=people.map(p=>({id:'person:'+p.id,type:'person',label:p.name}));
 const companies=new Map(),edges=[];
 for(const p of people) for(const name of new Set(String(p.co||'').split(',').map(x=>x.trim()).filter(Boolean))){
  const id='company:'+normalize(name);
  if(!companies.has(id)) companies.set(id,{id,type:'company',label:name});
  if(!edges.some(e=>e.from==='person:'+p.id&&e.to===id))edges.push({from:'person:'+p.id,to:id,type:'listed_association',source:'existing_profile_corpus',status:'unverified_relationship'});
 }
 const known=new Set(people.map(p=>p.id));
 return {nodes:[...nodes,...companies.values()],edges,events:events.filter(e=>known.has(e.person)),sources};
}
export function projection(value,growth,threshold=1000){
 if(![value,growth,threshold].every(Number.isFinite)||value<=0||threshold<=0)return null;
 if(value>=threshold)return 0;
 if(growth<=0)return null;
 return Math.log(threshold/value)/Math.log1p(growth/100);
}
export function timeline(id){return events.filter(e=>e.person===id).sort((a,b)=>a.date.localeCompare(b.date));}
export function validate(){
 const ids=new Set(sources.map(s=>s.id));
 for(const e of [...events,...observations])if(!ids.has(e.source)||!e.date||!e.person)throw Error('Invalid evidence record');
 if(projection(500,100)!==1||projection(1000,0)!==0||projection(500,0)!==null)throw Error('Projection regression');
}
