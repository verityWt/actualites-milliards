// Discovery classification only. A match is NOT a verified biographical or economic fact.
export const ENTITY_REGISTRY = Object.freeze([
  {id:'elon-musk',name:'Elon Musk',aliases:['Elon Musk']},
  {id:'jeff-bezos',name:'Jeff Bezos',aliases:['Jeff Bezos']},
  {id:'bernard-arnault',name:'Bernard Arnault',aliases:['Bernard Arnault']},
  {id:'mark-zuckerberg',name:'Mark Zuckerberg',aliases:['Mark Zuckerberg']},
  {id:'larry-ellison',name:'Larry Ellison',aliases:['Larry Ellison']},
  {id:'larry-page',name:'Larry Page',aliases:['Larry Page']},
  {id:'sergey-brin',name:'Sergey Brin',aliases:['Sergey Brin']},
  {id:'jensen-huang',name:'Jensen Huang',aliases:['Jensen Huang']},
  {id:'warren-buffett',name:'Warren Buffett',aliases:['Warren Buffett']},
  {id:'bill-gates',name:'Bill Gates',aliases:['Bill Gates']},
  {id:'xavier-niel',name:'Xavier Niel',aliases:['Xavier Niel']},
  {id:'amancio-ortega',name:'Amancio Ortega',aliases:['Amancio Ortega']},
  {id:'francoise-bettencourt-meyers',name:'Françoise Bettencourt Meyers',aliases:['Françoise Bettencourt Meyers','Francoise Bettencourt Meyers']},
  {id:'peter-thiel',name:'Peter Thiel',aliases:['Peter Thiel']},
  {id:'john-collison',name:'John Collison',aliases:['John Collison']},
  {id:'patrick-collison',name:'Patrick Collison',aliases:['Patrick Collison']},
  {id:'zhang-yiming',name:'Zhang Yiming',aliases:['Zhang Yiming']},
  {id:'joe-tsai',name:'Joe Tsai',aliases:['Joe Tsai']}
]);
export const EVENT_TYPES = Object.freeze([
  {id:'acquisition',signals:['acquisition','acquires','acquired','takeover','rachat','rachète','acquiert','fusion','merger']},
  {id:'succession',signals:['succession','inheritance','héritage','heir','estate','trust','transmission']},
  {id:'ipo',signals:['initial public offering','ipo','introduction en bourse','listing','prospectus']},
  {id:'governance',signals:['governance','board','directeur général','chief executive','ceo','resigns','démission','conseil d’administration','conseil d\u0027administration']}
]);
export function fold(s){return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
export function matchEntities(title,registry=ENTITY_REGISTRY){
 const norm=' '+fold(title).replace(/[^a-z0-9]+/g,' ')+' ';
 return registry.filter(e=>e.aliases.some(a=>norm.includes(' '+fold(a).replace(/[^a-z0-9]+/g,' ').trim()+' '))).map(e=>({id:e.id,name:e.name,match:'title_alias',verified:false}));
}
export function classifyEvent(title){
 const t=fold(title);
 const matches=EVENT_TYPES.filter(x=>x.signals.some(s=>t.includes(fold(s))));
 return matches.length===1?matches[0].id:'unclassified';
}
export function canonicalUrl(raw){
 const u=new URL(raw);
 if(!['https:','http:'].includes(u.protocol))throw Error('Unsupported protocol');
 u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);
 u.searchParams.sort();return u.href;
}
export function transformCandidate(a,query,observedAt){
 const url=canonicalUrl(a.url),title=String(a.title||'').trim().slice(0,500);
 if(!title)throw Error('Empty title');
 return {url,title,sourceDate:a.seendate||null,language:a.language||null,sourceDomain:new URL(url).hostname,
  discoveredAt:observedAt,queries:[query],personMatches:matchEntities(title),eventTypeCandidate:classifyEvent(title),
  evidenceStatus:'discovery_only',status:'pending_review'};
}
export function mergeCandidates(previous,incoming,capacity=2000){
 const map=new Map(previous.map(x=>[x.url,x]));
 let newLeads=0;
 for(const candidate of incoming){
  const old=map.get(candidate.url);
  if(!old){map.set(candidate.url,candidate);newLeads++;}
  else map.set(candidate.url,{...old,queries:[...new Set([...(old.queries||[]),...candidate.queries])]});
 }
 const entries=[...map.values()].sort((a,b)=>String(a.discoveredAt).localeCompare(String(b.discoveredAt)));
 return {leads:entries.slice(-capacity),newLeads};
}
export function retryDelayMs(failures,now=Date.now()){
 const exp=Math.min(Math.max(1,failures),7);
 return new Date(now+Math.min(15*60*1000*2**(exp-1),6*60*60*1000)).toISOString();
}

/** Fingerprints group only very similar headlines; shared wording is not independent corroboration. */
export function headlineFingerprint(title){
 return fold(title).replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
export function reviewMetrics(leads){
 const fingerprints=new Map();
 let matched=0,classified=0,actionable=0;
 for(const lead of leads){
  const people=Array.isArray(lead.personMatches)?lead.personMatches:matchEntities(lead.title);
  const type=lead.eventTypeCandidate||classifyEvent(lead.title);
  if(people.length)matched++;
  if(type!=='unclassified')classified++;
  if(people.length && type!=='unclassified')actionable++;
  const key=headlineFingerprint(lead.title);
  if(key)fingerprints.set(key,(fingerprints.get(key)||0)+1);
 }
 return {matchedCandidates:matched,classifiedCandidates:classified,highPriorityReview:actionable,
  repeatedHeadlineGroups:[...fingerprints.values()].filter(n=>n>1).length,
  verifiedEvents:0};
}
