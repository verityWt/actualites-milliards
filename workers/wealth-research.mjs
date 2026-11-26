import {discoverBatch} from './biography-discovery.mjs';
import {runPortraitCycle} from './portrait-auto.mjs';
const QUERIES=['"billionaire" acquisition','"milliardaire" succession','"billionaire" IPO','"billionaire" corporate governance'];
export async function collect(env,slot=Date.now(),fetcher=fetch){
 const query=QUERIES[Math.floor(slot/900000)%QUERIES.length], started=new Date().toISOString();
 let status={lastAttempt:started,query,state:'error',lastSuccess:null,leads:0};
 try{const prev=await env.RESEARCH.get('status',{type:'json'});status.lastSuccess=prev?.lastSuccess||null;status.leads=prev?.leads||0;
 const u=new URL('https://api.gdeltproject.org/api/v2/doc/doc');u.search=new URLSearchParams({query,mode:'artlist',format:'json',maxrecords:'50',timespan:'7d',sort:'datedesc'}).toString();
 const res=await fetcher(u,{signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('provider HTTP '+res.status);const data=await res.json();if(!Array.isArray(data.articles))throw Error('invalid response');
 const old=await env.RESEARCH.get('leads',{type:'json'})||[];const map=new Map(old.map(x=>[x.url,x]));let found=0;
 for(const a of data.articles){try{const url=new URL(a.url);if(!['http:','https:'].includes(url.protocol)||!String(a.title||'').trim())continue;url.hash='';for(const k of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))url.searchParams.delete(k);url.searchParams.sort();const key=url.href;if(!map.has(key)){map.set(key,{url:key,title:String(a.title).slice(0,500),sourceDate:a.seendate||null,language:a.language||null,discoveredAt:started,status:'pending_review'});found++;}}catch{}}
 const leads=[...map.values()].slice(-2000);await env.RESEARCH.put('leads',JSON.stringify(leads));status={...status,state:'ok',lastSuccess:started,leads:leads.length,newLeads:found};
 }catch(e){status.error=String(e.message).slice(0,160);}
 await env.RESEARCH.put('status',JSON.stringify(status));return status;
}
export default {async scheduled(event,env,ctx){ctx.waitUntil(Promise.allSettled([collect(env,event.scheduledTime),discoverBatch({RESEARCH:env.BIOGRAPHY},new Date(event.scheduledTime)),runPortraitCycle(env,new Date(event.scheduledTime))]));},async fetch(request,env){const u=new URL(request.url);if(request.method!=='GET'||u.pathname!=='/status')return new Response('Not found',{status:404});const s=await env.RESEARCH.get('status',{type:'json'});return Response.json(s?{state:s.state,lastAttempt:s.lastAttempt,lastSuccess:s.lastSuccess,leads:s.leads,newLeads:s.newLeads??null}:{state:'not_run',lastAttempt:null,lastSuccess:null,leads:0},{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});}};