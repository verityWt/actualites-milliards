// News and institution source previews from publisher metadata, not an original article.
// Every preview is optional; publication is attributed to the named domain.
const ACCEPTED=/(^|\.)((reuters|apnews|forbes|ft|wsj|bloomberg|cnbc|nytimes|theguardian|washingtonpost|lemonde|lesechos|lefigaro|france24|rfi|bbc)\.(com|fr|co\.uk)|sec\.gov|justice\.gov|europa\.eu)$/i;
export function acceptedPublisher(url){
 try{const u=new URL(url);return u.protocol==='https:'&&ACCEPTED.test(u.hostname)&&!u.username&&!u.password;}catch{return false;}
}
export function decodeEntities(s){
 return String(s||'').replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|rsquo|lsquo|ldquo|rdquo);/gi,(_,k)=>{
  const map={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”'};
  const v=k.toLowerCase();if(v.startsWith('#')){const n=v[1]==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10);return n>=32&&n<=0x10ffff?String.fromCodePoint(n):''}
  return map[v]||'';
 }).replace(/\s+/g,' ').trim();
}
export function extractPublisherMetadata(html,url){
 const page=String(html||'').slice(0,160000);
 const tags=[...page.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
 const props={};
 for(const tag of tags){
  const attrs={};
  for(const a of tag.matchAll(/([-\w:]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)){
   attrs[a[1].toLowerCase()]=a[2]??a[3]??a[4]??'';
  }
  const key=(attrs.property||attrs.name||'').toLowerCase();
  if(key&&attrs.content&&!props[key])props[key]=attrs.content;
 }
 const rawTitle=props['og:title']||props['twitter:title']||page.match(/<title[^>]*>([\s\S]{0,600}?)<\/title>/i)?.[1]||'';
 const title=decodeEntities(rawTitle.replace(/<[^>]+>/g,'')).slice(0,180);
 const summary=decodeEntities(props['og:description']||props.description||props['twitter:description']||'').slice(0,280);
 const pub=(props['article:published_time']||props['datepublished']||props['dc.date']||'').slice(0,32);
 const isoDate=/^\d{4}-\d{2}-\d{2}/.test(pub)?pub.slice(0,10):null;
 const valid=title.length>=14 && !/access denied|just a moment|please enable javascript|403 forbidden|robot check|subscribe to continue/i.test(title);
 if(!valid)return null;
 return {url,title,description:summary,publishedAt:isoDate,
   publisher:new URL(url).hostname.replace(/^www\./,''),state:'publisher_metadata_unreviewed'};
}
export async function fetchPublisherMetadata(source,fetcher=fetch){
 if(!acceptedPublisher(source?.url))return null;
 const url=source.url;
 try{
  const response=await fetcher(url,{
    headers:{Accept:'text/html',Range:'bytes=0-140000','User-Agent':'ActualitesFR-Research/0.3 (contact@actualites.fr)'},
    redirect:'error',signal:AbortSignal.timeout(6500)
  });
  if(!response.ok)return null;
  const type=response.headers?.get?.('content-type')||'';
  if(type&&!/text\/html/i.test(type))return null;
  const reader=response.body?.getReader?.();
  let html='';
  if(reader){
    const decoder=new TextDecoder();let received=0;
    try{
      while(received<140000){
       const {done,value}=await reader.read();if(done)break;
       const remaining=Math.min(value.byteLength,140000-received);
       html+=decoder.decode(value.subarray(0,remaining),{stream:true});received+=remaining;
       if(remaining<value.byteLength)break;
      }
    }finally{try{await reader.cancel()}catch{}}
  }else html=(await response.text()).slice(0,140000);
  return extractPublisherMetadata(html,url);
 }catch{return null}
}
export async function sourcePreviews(links,fetcher=fetch){
 const urls=[],seen=new Set();
 for(const link of (links||[])){
  if(!acceptedPublisher(link.url)||seen.has(link.url))continue;
  seen.add(link.url);urls.push(link);
  if(urls.length===5)break;
 }
 const result=await Promise.allSettled(urls.map(link=>fetchPublisherMetadata(link,fetcher)));
 return result.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value).slice(0,4);
}
