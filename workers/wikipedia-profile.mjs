// Wikimedia reference retrieval. Content remains explicitly attributed to its publishers.
// Never treat an API search suggestion as verified identity.
const USER_AGENT='ActualitesFR-Research/0.2 (contact@actualites.fr; biographical reference research)';
export const normalizeName=name=>String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,' ').replace(/\b(jr|sr)\b/g,'').trim().replace(/\s+/g,' ');
const RELEVANT=/business|entrepreneur|industrial|investor|executive|founder|billionaire|wealth|philanthrop|author|heir|heiress|magnate|tycoon|singer|musician|actress|actor|fashion|banker|chair|software|technology|real estate|wealth|financier|company|companies|corporate/i;
const STRONG=/billionaire|businessman|businesswoman|businessperson|business magnate|entrepreneur|industrialist|investor|founder|heiress|heir|tycoon|banker|philanthropist|software developer|computer scientist|fashion designer|singer.songwriter/i;
const NON_PERSON=/disambiguation|fictional|family foundation|footballer|football player|basketball|athlete|sportsperson/i;
export function selectCandidate(person,suggestions){
 const wanted=normalizeName(person.name);
 const weighted=(suggestions||[]).filter(x=>/^Q\d+$/.test(x.wikidataId||'')&&
    normalizeName(x.label)===wanted).map(x=>{
      const description=x.description||'';
      const score=(STRONG.test(description)?3:0)+(RELEVANT.test(description)?1:0)-
        (NON_PERSON.test(description)?6:0);
      return {candidate:x,score};
    }).sort((a,b)=>b.score-a.score);
 if(!weighted.length||weighted[0].score<3)return null;
 // Require a meaningful margin from alternate exact-name identities.
 if(weighted[1]&&weighted[0].score-weighted[1].score<2)return null;
 return weighted[0].candidate;
}
export function safeWikiTitle(title){
 if(typeof title!=='string'||title.length<1||title.length>180||/[<>\r\n#?]/.test(title))return null;
 return title;
}
export async function fetchJson(url,fetcher=fetch){
 const result=await fetcher(url,{headers:{Accept:'application/json','User-Agent':USER_AGENT},signal:AbortSignal.timeout(13000)});
 if(!result.ok)throw Error('Provider HTTP '+result.status);
 return await result.json();
}
export function cleanSummary(raw){
 return String(raw||'').replace(/\s+/g,' ').trim().slice(0,1500);
}
export async function resolveWikipedia(person,suggestions,fetcher=fetch){
 const suggestion=selectCandidate(person,suggestions);
 if(!suggestion)return {status:'identity_ambiguous',reason:'No unique matching person from Wikidata',verified:false};
 const params=new URLSearchParams({action:'wbgetentities',format:'json',ids:suggestion.wikidataId,
   props:'sitelinks|claims|labels|descriptions',languages:'en|fr'});
 const entitySet=await fetchJson('https://www.wikidata.org/w/api.php?'+params.toString(),fetcher);
 const item=entitySet?.entities?.[suggestion.wikidataId];
 if(!item||item.missing!==undefined)return {status:'identity_unavailable',verified:false};
 const enTitle=safeWikiTitle(item.sitelinks?.enwiki?.title);
 const frTitle=safeWikiTitle(item.sitelinks?.frwiki?.title);
 // Match is anchored to one Wikidata QID shared by both Wikipedia pages.
 if(!enTitle&&!frTitle)return {status:'no_wikipedia_article',wikidataId:suggestion.wikidataId,verified:false};
 const pages=[];
 for(const [lang,title] of [['fr',frTitle],['en',enTitle]]){
  if(!title)continue;
  try{
   const url='https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replace(/ /g,'_'));
   const body=await fetchJson(url,fetcher);
   if(body.type!=='standard'||!body.extract||body.extract.length<70)continue;
   // A disambiguation page cannot become a biographical dossier.
   const source=body.content_urls?.desktop?.page || 'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(title.replace(/ /g,'_'));
   pages.push({language:lang,title:body.title||title,summary:cleanSummary(body.extract),
     url:source,revisionTimestamp:body.timestamp||null,source:'Wikipedia',license:'CC BY-SA 4.0'});
  }catch{/* one language can fail independently */}
 }
 if(!pages.length)return {status:'wikipedia_unavailable',wikidataId:suggestion.wikidataId,verified:false};
 const official=(item.claims?.P856||[]).map(x=>x.mainsnak?.datavalue?.value).filter(v=>{
  if(typeof v!=='string')return false;
  try{return new URL(v).protocol==='https:'}catch{return false}
 }).slice(0,3);
 return {status:'encyclopedic_sources_found',wikidataId:suggestion.wikidataId,
   wikidataUrl:'https://www.wikidata.org/wiki/'+suggestion.wikidataId,
   label:item.labels?.fr?.value||item.labels?.en?.value||suggestion.label,
   description:item.descriptions?.fr?.value||item.descriptions?.en?.value||suggestion.description,
   pages,officialWebsites:official,verified:false,
   disclaimer:'Articles encyclopédiques associés à une proposition d’identité ; les faits n’ont pas encore été recoupés par la rédaction.'};
}
