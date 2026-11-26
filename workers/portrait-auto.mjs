// Public Wikimedia portrait ingestion: Wikimedia links + licence + dimensions.
// A Wikidata QID is matched by public encyclopedic identity; no face recognition.
import {PEOPLE,selection} from './biography-discovery.mjs';
const LICENSE=/^(?:CC0|CC BY (?:2\.0|2\.5|3\.0|4\.0)|CC BY-SA (?:2\.0|2\.5|3\.0|4\.0)|Public domain|PD-[\w .-]+)$/i;
const USER_AGENT='ActualitesFR-Research/0.5 (contact@actualites.fr; licensed-photo metadata)';
const fetchJSON=async(url,fetcher)=>{
 const resp=await fetcher(url,{headers:{Accept:'application/json','User-Agent':USER_AGENT},signal:AbortSignal.timeout(11000)});
 if(!resp.ok)throw Error('HTTP '+resp.status);
 return resp.json();
};
const q=(api,params)=>api+'?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',...params}).toString();
export function normName(name){
 return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/& family$/i,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();
}
export function identifyWikidata(person,record){
 const wiki=record?.wikipedia;
 if(wiki?.status!=='encyclopedic_sources_found'||!/^Q\d+$/.test(wiki.wikidataId||''))return null;
 const n=normName(person.name),label=normName(wiki.label);
 if(!n||!label||n!==label)return null;
 // The selected encyclopedia identity is subject to its own upstream matching; never claim human identity verification.
 return {id:wiki.wikidataId,label:wiki.label,status:'encyclopedic_exact_label'};
}
const plain=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,a=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[a.toLowerCase()]||a).slice(0,200).trim();
export function eligibleCommonsFile(page,qid,name){
 if(!page||page.missing||!page.title?.startsWith('File:'))return null;
 const info=page.imageinfo?.[0],meta=info?.extmetadata||{};
 const license=plain(meta.LicenseShortName?.value||'');
 const width=info?.width||0,height=info?.height||0;
 const source=info?.descriptionurl||'';
 const fileUrl=info?.thumburl||info?.url||'';
 const origin=info?.url||'';
 if(!LICENSE.test(license)||width<640||height<640||!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/i.test(source))return null;
 try{const u=new URL(fileUrl),u2=new URL(origin);if(u.protocol!=='https:'||u2.protocol!=='https:'||u.hostname!=='upload.wikimedia.org'||u2.hostname!=='upload.wikimedia.org')return null;}catch{return null;}
 const artist=plain(meta.Artist?.value||meta.Credit?.value||'')||'Wikimedia Commons — auteur non attribué dans les métadonnées';
 const licenseUrl=plain(meta.LicenseUrl?.value||'');
 return {status:'commons_eligible',person:name,wikidataId:qid,title:page.title,url:fileUrl,
  source,license,licenseUrl,artist,width,height,identityEvidence:'Wikidata P18 + identical encyclopedia item label',
  identityVerified:false,rightsMetadataVerified:true,reviewNeeded:true,autoEligible:true};
}
export async function researchPortrait(person,biography,fetcher=fetch){
 const checkedAt=new Date().toISOString();
 const identity=identifyWikidata(person,biography);
 if(!identity)return {slug:person.slug,status:'no_matching_encyclopedic_identity',checkedAt,selected:null};
 try{
  const entity=await fetchJSON('https://www.wikidata.org/w/api.php?'+new URLSearchParams({
    action:'wbgetentities',format:'json',ids:identity.id,props:'claims|labels',languages:'en|fr'
  }),fetcher);
  const item=entity.entities?.[identity.id];
  const human=(item?.claims?.P31||[]).some(s=>s.mainsnak?.datavalue?.value?.id==='Q5');
  const label=normName(item?.labels?.en?.value||item?.labels?.fr?.value||'');
  if(!human||label!==normName(person.name))return {slug:person.slug,status:'identity_validation_failed',checkedAt,selected:null};
  const image=item?.claims?.P18?.find(s=>s.rank!=='deprecated')?.mainsnak?.datavalue?.value;
  if(typeof image!=='string'||!image||image.length>210)return {slug:person.slug,status:'no_wikidata_photo',checkedAt,selected:null};
  const pageTitle='File:'+image.replace(/^File:/i,'');
  const commons=await fetchJSON(q('https://commons.wikimedia.org/w/api.php',{
   titles:pageTitle,prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'900'
  }),fetcher);
  const pages=commons.query?.pages||[];
  const selected=eligibleCommonsFile(pages[0],identity.id,person.name);
  return {slug:person.slug,status:selected?'candidate_eligible':'candidate_not_eligible',checkedAt,
     wikidataId:identity.id,commonsFile:pageTitle,selected};
 }catch(e){return {slug:person.slug,status:'provider_error',checkedAt,selected:null,error:String(e?.message||e).slice(0,150)}}
}
export async function runPortraitCycle(env,at=new Date(),fetcher=fetch){
 const person=selection(at);
 if(!env?.BIOGRAPHY)return {slug:person.slug,status:'missing_binding'};
 const cached=await env.BIOGRAPHY.get('photo:'+person.slug,{type:'json'});
 if(cached?.checkedAt&&Date.now()-Date.parse(cached.checkedAt)<7*86400000)return {slug:person.slug,status:'cached',candidate:!!cached.selected};
 const bio=await env.BIOGRAPHY.get('profile:'+person.slug,{type:'json'});
 const result=await researchPortrait(person,bio,fetcher);
 // Only a single KV write per 15 min, not one write per pageview.
 await env.BIOGRAPHY.put('photo:'+person.slug,JSON.stringify(result));
 return {slug:person.slug,status:result.status,candidate:!!result.selected};
}
export const isAllowedPhotoSlug=slug=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&PEOPLE.some(p=>p.slug===slug);
