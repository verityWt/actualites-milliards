import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
// GDELT discovery produces editorial leads only, never verified events.
export const canonicalUrl = raw => { const u=new URL(raw);if(!['https:','http:'].includes(u.protocol))throw Error('Invalid URL');u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();return u.href; };
export function normalizeArticle(a,query){
 const url=canonicalUrl(a.url),title=String(a.title||'').trim();
 if(!title)throw Error('Missing title');
 return {id:crypto.createHash('sha256').update(url).digest('hex'),url,title,language:a.language||null,domain:new URL(url).hostname,discoveredAt:new Date().toISOString(),sourceDate:a.seendate||null,queries:[query],status:'pending_review'};
}
export function mergeLeads(previous,incoming){
 const m=new Map(previous.map(a=>[a.id,a]));
 for(const a of incoming){const old=m.get(a.id);m.set(a.id,old?{...old,queries:[...new Set([...old.queries,...a.queries])]}:a);}
 return [...m.values()];
}
export async function discover(query,fetcher=fetch){
 const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');
 url.search=new URLSearchParams({query,mode:'artlist',format:'json',maxrecords:'50',timespan:'7d',sort:'datedesc'}).toString();
 const res=await fetcher(url,{signal:AbortSignal.timeout(25000),headers:{accept:'application/json'}});
 if(!res.ok)throw Error('GDELT HTTP '+res.status);
 const data=await res.json();if(!Array.isArray(data.articles))throw Error('Invalid response');
 return data.articles.flatMap(a=>{try{return [normalizeArticle(a,query)]}catch{return []}});
}
export async function run(queries,output='research-private/leads.json'){
 let previous=[];try{previous=JSON.parse(await fs.readFile(output,'utf8'));if(!Array.isArray(previous))throw Error('Invalid queue')}catch(e){if(e.code!=='ENOENT')throw e}
 let leads=previous;const runs=[];
 for(const query of queries){try{const found=await discover(query);leads=mergeLeads(leads,found);runs.push({query,status:'ok',found:found.length});}catch(e){runs.push({query,status:'error',error:String(e.message)});}
 if(query!==queries.at(-1))await new Promise(r=>setTimeout(r,5500));}
 await fs.mkdir(new URL('.',pathToFileURL(process.cwd()+'/'+output)),{recursive:true});
 await fs.writeFile(output+'.tmp',JSON.stringify(leads,null,2));await fs.rename(output+'.tmp',output);
 return {runs,total:leads.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const queries=process.argv.slice(2);if(!queries.length)queries.push('"billionaire" acquisition','"milliardaire" succession','"milliardaire" entreprise','"billionaire" IPO');
 const result=await run(queries);console.log(JSON.stringify(result,null,2));if(result.runs.some(r=>r.status==='error'))process.exitCode=1;
}
