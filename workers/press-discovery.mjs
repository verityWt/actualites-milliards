// Press discovery for public personalities absent from Wikidata/Wikipedia.
// Search candidates only: this crawler DOES NOT validate or paraphrase any article.
export const safeName=name=>String(name||'').trim().replace(/[\u0000-\u001f"'<>]/g,'').slice(0,100);
const decode=x=>String(x||'').replace(/&(?:amp|lt|gt|quot|apos|#39|#(\d+));/gi,(m,n)=>{
 if(n){const k=Number(n);return k>=32&&k<=0xffff?String.fromCharCode(k):''}
 return {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'" }[m.toLowerCase()]||m;
});
const strip=x=>decode(String(x||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
const tag=(item,name)=>item.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'';
const essentialWords=name=>safeName(name).toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\s+/).filter(w=>w.length>=4&&w!=='von'&&w!=='der');
export function parsePressRSS(xml,person){
 const raw=String(xml||'').slice(0,160000);
 const output=[],used=new Set();
 const words=essentialWords(person.name);
 for(const match of raw.matchAll(/<item>([\s\S]*?)<\/item>/gi)){
  const item=match[1],title=strip(tag(item,'title')).slice(0,190);
  const publisher=strip(tag(item,'source')).slice(0,90);
  const url=strip(tag(item,'link')).slice(0,1400);
  const pub=strip(tag(item,'pubDate')).slice(0,80);
  const canonical=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(!title||!words.every(w=>canonical.includes(w))||used.has(canonical))continue;
  let u;try{u=new URL(url)}catch{continue}
  if(u.protocol!=='https:'||u.hostname!=='news.google.com')continue;
  used.add(canonical);
  const at=Date.parse(pub);
  output.push({title,url:u.href,publisher:publisher||'Google News',publishedAt:Number.isFinite(at)?new Date(at).toISOString().slice(0,10):null,reviewStatus:'candidate_unreviewed',origin:'Google News RSS'});
  if(output.length>=8)break;
 }
 return output;
}
export async function discoverPress(person,fetcher=fetch){
 const name=safeName(person.name);
 if(name.length<5)return {status:'invalid_name',items:[],attemptedAt:new Date().toISOString()};
 const query='"'+name+'"';
 const request='https://news.google.com/rss/search?'+new URLSearchParams({q:query,hl:'de',gl:'DE',ceid:'DE:de'}).toString();
 try{
  const response=await fetcher(request,{headers:{Accept:'application/rss+xml, application/xml, text/xml','User-Agent':'ActualitesFR-Research/0.4 (contact@actualites.fr)'},signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Error('RSS HTTP '+response.status);
  const xml=(await response.text()).slice(0,160000);
  if(!xml.includes('<rss')&&!xml.includes('<item>'))throw Error('Unexpected feed response');
  const items=parsePressRSS(xml,person);
  return {status:items.length?'candidates_found':'no_matching_articles',items,source:'https://news.google.com/',query,attemptedAt:new Date().toISOString()};
 }catch(error){return {status:'feed_unavailable',items:[],error:String(error?.message||error).slice(0,120),attemptedAt:new Date().toISOString()}}
}
