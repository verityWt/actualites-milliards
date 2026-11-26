/* Editorial photo review. Selections are local until exported and reviewed in source control. */
(()=>{
 'use strict';
 const dataTag=document.getElementById('photoReviewData');
 if(!dataTag)return;
 let entries;try{entries=JSON.parse(dataTag.textContent)}catch{return}
 const input=document.getElementById('photoQuery'),filter=document.getElementById('photoStatusFilter');
 const grid=document.getElementById('photoReviewGrid'),counts=document.getElementById('photoReviewCount');
 const more=document.getElementById('photoReviewMore'),exportBtn=document.getElementById('photoReviewExport');
 const key='actualites.photo.review.v1';let saved={};
 try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
 if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
 let visibleCount=24,visible=[];
 const esc=s=>String(s??'');
 function store(){try{localStorage.setItem(key,JSON.stringify(saved))}catch{}}
 function render(){
  const q=input.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(),f=filter.value;
  visible=entries.filter(item=>{
   const hay=(item.name+' '+item.slug+' '+item.candidates.map(c=>c.publisher||'').join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   if(q&&!hay.includes(q))return false;
   const state=saved[item.slug]?.decision;
   return f==='all'||(f==='pending'?!state:state===f);
  });
  const marked=Object.values(saved).filter(x=>x.decision).length;
  counts.textContent=visible.length+' fiches dans la sélection · '+marked+' décisions enregistrées sur cet appareil';
  grid.replaceChildren();
  for(const entry of visible.slice(0,visibleCount))renderCard(entry);
  more.hidden=visible.length<=visibleCount;
 }
 function text(tag,content,className){
  const el=document.createElement(tag);el.textContent=esc(content);
  if(className)el.className=className;return el;
 }
 function renderCard(entry){
  const card=document.createElement('article');card.className='photo-review-card';
  card.append(text('h2',entry.name));
  const lead=text('p',entry.candidates.length+' photo(s) candidate(s) · '+(entry.issues||[]).length+' contrôles manquants','photo-review-meta');card.append(lead);
  const photoBox=document.createElement('div');photoBox.className='photo-review-preview';
  const fallback=text('span',entry.initials,'photo-review-initials');photoBox.append(fallback);
  const photo=document.createElement('img');photo.alt='Photographie candidate de '+entry.name;photo.loading='lazy';photo.decoding='async';
  photoBox.append(photo);card.append(photoBox);
  const info=text('p','','photo-review-source');card.append(info);
  const pindex=document.createElement('select');pindex.setAttribute('aria-label','Photographie candidate pour '+entry.name);
  entry.candidates.forEach((c,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent='Photo '+(i+1)+' · '+(c.publisher||'Source non précisée');pindex.append(o)});
  card.append(pindex);
  const known=saved[entry.slug]||{};
  pindex.value=String(Math.min(entry.candidates.length-1,known.selectedIndex??0));
  const fill=()=>{
   const candidate=entry.candidates[Number(pindex.value)];
   photo.removeAttribute('src');photo.hidden=!candidate;
   if(candidate){photo.src=candidate.url;info.textContent=candidate.publisher+' · '+(candidate.license||'Droits non documentés');}
  };
  photo.addEventListener('error',()=>{photo.removeAttribute('src');photo.hidden=true;info.textContent+=' · image inaccessible';});
  photo.addEventListener('load',()=>{
   info.textContent=entry.candidates[Number(pindex.value)]?.publisher+' · '+photo.naturalWidth+'×'+photo.naturalHeight+' px · '+(entry.candidates[Number(pindex.value)]?.license||'Droits non documentés');
  });
  pindex.addEventListener('change',()=>{saved[entry.slug]={...saved[entry.slug],selectedIndex:Number(pindex.value)};store();fill()});fill();
  const actions=document.createElement('div');actions.className='photo-review-actions';
  [['acceptable','Cadrage correct'],['replace','Photo à remplacer'],['wrong_identity','Identité douteuse']].forEach(([value,label])=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.className=known.decision===value?'selected':'';
    button.addEventListener('click',()=>{saved[entry.slug]={...saved[entry.slug],decision:value,selectedIndex:Number(pindex.value),reviewedAt:new Date().toISOString()};
      store();render()});
    actions.append(button);
  });
  card.append(actions);
  const links=document.createElement('div');links.className='photo-review-links';
  [['Voir la fiche','/milliardaires/'+encodeURIComponent(entry.slug)+'/'],['Google Images',entry.google],['LinkedIn',entry.linkedin]].forEach(([label,url])=>{
   const a=document.createElement('a');a.textContent=label;a.href=url;
   if(url.startsWith('http')){a.target='_blank';a.rel='noopener noreferrer'}
   links.append(a);
  });card.append(links);grid.append(card);
 }
 input.addEventListener('input',()=>{visibleCount=24;render()});
 filter.addEventListener('change',()=>{visibleCount=24;render()});
 more.addEventListener('click',()=>{visibleCount+=24;render()});
 exportBtn.addEventListener('click',()=>{
  const output={schemaVersion:1,exportedAt:new Date().toISOString(),origin:'browser_manual_review',note:'Décisions éditoriales non appliquées automatiquement ; vérifier identité, droits et source avant publication.',decisions:[]};
  for(const [slug,decision] of Object.entries(saved)){
   const found=entries.find(x=>x.slug===slug);
   if(!found||!decision.decision)continue;
   output.decisions.push({slug,decision:decision.decision,selectedUrl:found.candidates[decision.selectedIndex||0]?.url||null,reviewedAt:decision.reviewedAt||null});
  }
  const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='actualites-revision-photos.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
 });
 render();
})();
