// Press discovery for public personalities absent from Wikidata/Wikipedia.
// Search candidates only: this crawler DOES NOT validate or paraphrase any article.
export const safeName=name=>String(name||'').trim().replace(/[\u0000-\u001f"'<>]/g,'').slice(0,100);
const decode=x=>String(x||'').replace(/&(?:amp|lt|gt|quot|apos|#39|#(\d+));/gi,(m,n)=>{
 if(n){const k=Number(n);return k>=32&&k<=0xffff?String.fromCharCode(k):''}
 return {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'" }[m.toLowerCase()]||m;
});
const strip=x=>decode(String(x||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
const tag=(item,name)=>item.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'';
const essentialWords=name=>safeName(name).toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\s+/).filter(w=>w.length>=3&&w!=='von'&&w!=='der');
export function parsePressRSS(xml,person,provider='Google News RSS'){
 const raw=String(xml||'').slice(0,1000000);
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
  if(u.protocol!=='https:'||(provider==='Google News RSS'&&u.hostname!=='news.google.com'))continue;
  used.add(canonical);
  const at=Date.parse(pub);
  const description=strip(decode(tag(item,'description'))).replace(/\s+/g,' ').trim();
  const excerpt=description && !canonical.includes(description.toLowerCase()) && !description.toLowerCase().startsWith(title.toLowerCase()) ? description.split(/\s+/).slice(0,25).join(' ') : '';
  output.push({title,url:u.href,...(excerpt?{description:excerpt}:{}),publisher:publisher||u.hostname,publishedAt:Number.isFinite(at)?new Date(at).toISOString().slice(0,10):null,reviewStatus:'candidate_unreviewed',origin:provider});
  if(output.length>=8)break;
 }
 return output;
}
const NEWS_LOCALES={
 'Allemagne':['de','DE'],'Autriche':['de','AT'],'Suisse':['de','CH'],
 'France':['fr','FR'],'Belgique':['fr','BE'],'États-Unis':['en','US'],'Royaume-Uni':['en','GB'],
 'Inde':['en','IN'],'Japon':['ja','JP'],'Chine':['zh-CN','CN'],'Italie':['it','IT'],
 'Espagne':['es','ES'],'Mexique':['es','MX'],'Brésil':['pt-BR','BR'],'Canada':['en','CA'],
 'Russie':['ru','RU'],'Australie':['en','AU'],'Corée du Sud':['ko','KR'],'Pays-Bas':['nl','NL']
};
export const pressLocale=country=>NEWS_LOCALES[country]||['en','US'];
export async function discoverPress(person,fetcher=fetch){
 const name=safeName(person.name),attemptedAt=new Date().toISOString();
 if(name.length<5)return {status:'invalid_name',items:[],attemptedAt};
 const query='"'+name+'" when:30d';
 const preferred=pressLocale(person.country);
 const attempts=[['fr','FR'],preferred].filter((x,i,a)=>a.findIndex(y=>y.join()===x.join())===i);
 if(!attempts.some(x=>x[0]==='en'))attempts.push(['en','US']);
 const all=[],tried=[],errors=[];
 for(const [language,country] of attempts){
  const request='https://news.google.com/rss/search?'+new URLSearchParams({
    q:query,hl:language,gl:country,ceid:country+':'+language
  }).toString();
  tried.push(language+'-'+country);
  try{
   const response=await fetcher(request,{
    headers:{Accept:'application/rss+xml, application/xml, text/xml','User-Agent':'ActualitesFR-Research/0.4 (contact@actualites.fr)'},
    signal:AbortSignal.timeout(9000)});
   if(!response.ok)throw Error('RSS HTTP '+response.status);
   const xml=(await response.text()).slice(0,160000);
   if(!xml.includes('<rss')&&!xml.includes('<item>'))throw Error('Unexpected feed response');
   const items=parsePressRSS(xml,person);
   all.push(...items);
   if(all.length>=16)break;
  }catch(error){errors.push(String(error?.message||error).slice(0,100))}
 }
 if(all.length<5){
  tried.push('Bing RSS');
  try{
   const response=await fetcher('https://www.bing.com/news/search?'+new URLSearchParams({q:'"'+name+'"',format:'rss',mkt:'fr-FR'}),{headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(7000)});
   if(!response.ok)throw Error('Bing RSS HTTP '+response.status);
   const xml=await response.text();
   if(!/<rss[\s>]/i.test(xml))throw Error('Bing unexpected feed');
   all.push(...parsePressRSS(xml,person,'Bing RSS'));
  }catch(error){errors.push(String(error?.message||error).slice(0,100))}
 }
 const uniq=[],seen=new Set();
 for(const x of all){
  const k=x.title.toLowerCase();
  if(!seen.has(k)){seen.add(k);uniq.push(x);}
  if(uniq.length>=12)break;
 }
 return {status:uniq.length?'candidates_found':errors.length===tried.length?'feed_unavailable':'no_matching_articles',
  items:uniq,source:'Google News RSS / Bing RSS',query,languagesTried:tried,
  ...(errors.length?{providerErrors:errors}:{}),attemptedAt};
}
