// Documentary intelligence: only observed, sourced facts; no individual psychological scoring.
export const sources=[{id:'forbes-2026',url:'https://www.forbes.com.au/news/billionaires/the-forbes-billionaires-list-top-200/',date:'2026-03-01',language:'en',kind:'ranking'},{id:'vanderbilt-frist',url:'https://news.vanderbilt.edu/2002/07/04/vanderbilt-names-frist-distinguished-alumni-60247/',language:'en',kind:'institution'},{id:'upi-frist',url:'https://www.upi.com/Archives/1997/07/25/UPI-Focus-Report-Columbia-gets-new-chief/6097869803200/',language:'en',kind:'press'},{id:'forbes-frist',url:'https://images.forbes.com/lists/2006/54/biz_06rich400_Thomas-F-Frist-Jr-family_XA34.html',language:'en',kind:'press'}];
export const events=[{person:'thomas-frist-jr',date:'1968',type:'company',title:'Cofondation de HCA',source:'vanderbilt-frist',status:'documented'},{person:'thomas-frist-jr',date:'1997-07-25',type:'governance',title:'Retour à la direction de Columbia/HCA après le départ de Richard Scott',source:'upi-frist',status:'documented',scope:'company'},{person:'thomas-frist-jr',date:'2006',type:'transaction',title:'Rachat de HCA avec des investisseurs financiers',source:'forbes-frist',status:'documented'}];
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
