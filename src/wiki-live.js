// Read-only source-attributed Wikimedia enrichment on every published biography.
// Never present a Wikidata matching candidate as editorially verified.
(async()=>{
  const holder=document.querySelector('[data-wiki-profile]');
  if(!holder)return;
  const slug=holder.dataset.wikiProfile;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return;
  const endpoint='https://actualites-biography-discovery.actualites-fr-next.workers.dev/profiles/'+slug;
  const status=holder.querySelector('[data-wiki-status]');
  try{
    const response=await fetch(endpoint,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(17500)});
    if(!response.ok)throw Error('Unavailable');
    const data=await response.json();
    const article=data.wikipedia;
    if(!article||article.status!=='encyclopedic_sources_found'||!Array.isArray(article.pages)||!article.pages.length){
      status.textContent='Les références encyclopédiques de cette personne sont en cours de recherche.';
      return;
    }
    const main=article.pages.find(p=>p.language==='fr')||article.pages[0];
    if(!main?.summary||!main.url)return;
    status.remove();
    const sub=document.createElement('p');
    sub.className='wiki-kicker';
    sub.textContent='Documentation Wikipédia · '+(main.language==='fr'?'français':'anglais');
    holder.append(sub);
    const h=document.createElement('h2');h.textContent='Repères biographiques complémentaires';holder.append(h);
    if(article.description){
      const desc=document.createElement('p');desc.className='wiki-description';
      desc.textContent=article.description;holder.append(desc);
    }
    const p=document.createElement('p');p.className='wiki-extract';
    p.textContent=main.summary;holder.append(p);
    const links=document.createElement('div');links.className='wiki-links';
    const add=(label,url)=>{
      try{
        const u=new URL(url);
        if(u.protocol!=='https:'||!(u.hostname.endsWith('.wikipedia.org')||u.hostname==='www.wikidata.org'))return;
        const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;
        links.append(a);
      }catch{}
    };
    add('Lire l’article Wikipédia ('+main.language.toUpperCase()+')',main.url);
    for(const page of article.pages){if(page.url!==main.url)add('Autre version ('+page.language.toUpperCase()+')',page.url);}
    if(article.wikidataUrl)add('Fiche Wikidata',article.wikidataUrl);
    holder.append(links);
    const attribution=document.createElement('p');attribution.className='wiki-attribution';
    attribution.textContent='Extrait de Wikipédia — contributeurs de Wikipédia, licence CC BY-SA 4.0. Ce contenu encyclopédique complète les articles du site ; il peut comporter des erreurs et ne remplace pas la vérification des sources originales.';
    holder.append(attribution);
  }catch{
    if(status)status.textContent='Documentation encyclopédique temporairement indisponible.';
  }
})();
