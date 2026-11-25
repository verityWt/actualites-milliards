import {transformCandidate,mergeCandidates,retryDelayMs} from './research-intelligence.mjs';
const QUERIES=['"billionaire" acquisition','"milliardaire" succession','"billionaire" IPO','"billionaire" corporate governance'];
const HEADERS={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function safeStatus(s){
 return {state:s.state,lastAttempt:s.lastAttempt??null,lastSuccess:s.lastSuccess??null,leads:s.leads??0,
  newLeads:s.newLeads??null,lastError:s.error??null,failures:s.failures??0,retryAfter:s.retryAfter??null,
  lastQuery:s.query??null,classifiedCandidates:s.classifiedCandidates??0,matchedCandidates:s.matchedCandidates??0};
}
export async function collect(env,slot=Date.now(),fetcher=fetch){
 const now=new Date().toISOString(), query=QUERIES[Math.floor(slot/900000)%QUERIES.length];
 const prev=await env.RESEARCH.get('status',{type:'json'})||{};
 let status={...prev,lastAttempt:now,query,state:'error',newLeads:0};
 if(prev.retryAfter&&Date.parse(prev.retryAfter)>Date.parse(now)){
  status={...prev,state:'rate_limited',lastAttempt:now,query};
  await env.RESEARCH.put('status',JSON.stringify(status));return status;
 }
 try{
  const u=new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  u.search=new URLSearchParams({query,mode:'artlist',format:'json',maxrecords:'50',timespan:'7d',sort:'datedesc'}).toString();
  const response=await fetcher(u,{headers:{accept:'application/json'},signal:AbortSignal.timeout(25000)});
  if(!response.ok){const e=new Error('provider HTTP '+response.status);e.status=response.status;throw e;}
  const data=await response.json();if(!Array.isArray(data.articles))throw Error('invalid response');
  const items=data.articles.flatMap(a=>{try{return [transformCandidate(a,query,now)];}catch{return [];}});
  const old=await env.RESEARCH.get('leads',{type:'json'})||[];
  const merged=mergeCandidates(Array.isArray(old)?old:[],items);
  await env.RESEARCH.put('leads',JSON.stringify(merged.leads));
  status={...status,state:'ok',lastSuccess:now,leads:merged.leads.length,newLeads:merged.newLeads,
   classifiedCandidates:merged.leads.filter(x=>x.eventTypeCandidate&&x.eventTypeCandidate!=='unclassified').length,
   matchedCandidates:merged.leads.filter(x=>x.personMatches?.length).length,
   failures:0,retryAfter:null,error:null};
 }catch(e){
  const failures=(Number(prev.failures)||0)+1;
  status={...status,state:e.status===429?'rate_limited':'error',error:String(e.message).slice(0,160),
   failures,retryAfter:retryDelayMs(failures,Date.parse(now)),lastSuccess:prev.lastSuccess||null,
   leads:prev.leads||0,classifiedCandidates:prev.classifiedCandidates||0,matchedCandidates:prev.matchedCandidates||0};
 }
 await env.RESEARCH.put('status',JSON.stringify(status));return status;
}
export default {
 async scheduled(event,env,ctx){ctx.waitUntil(collect(env,event.scheduledTime));},
 async fetch(request,env){
  const u=new URL(request.url);
  if(request.method!=='GET'||u.pathname!=='/status')return new Response('Not found',{status:404});
  const status=await env.RESEARCH.get('status',{type:'json'});
  return Response.json(status?safeStatus(status):{state:'not_run',lastAttempt:null,lastSuccess:null,leads:0},{headers:HEADERS});
 }
};
