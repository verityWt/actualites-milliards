/* Automatic photo repair. Only a licensed, source-attributed Wikimedia Commons candidate
   linked to an exact Wikidata human item may replace the legacy image.
   User-prioritized photos have no data-auto-portrait attribute and remain untouched. */
(()=>{
 'use strict';
 const API='https://actualites-biography-discovery.actualites-fr-next.workers.dev';
 const image=document.querySelector('img[data-auto-portrait]');
 if(!image)return;
 const slug=image.getAttribute('data-auto-portrait');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||''))return;
 const controller=new AbortController();
 const stop=setTimeout(()=>controller.abort(),6000);
 fetch(API+'/photos/'+encodeURIComponent(slug),{mode:'cors',signal:controller.signal,credentials:'omit'})
  .then(r=>r.ok?r.json():null).then(data=>{
   const candidate=data?.selected;
   if(data?.status!=='candidate_eligible'||candidate?.status!=='commons_eligible'||!candidate.autoEligible)return;
   if(candidate.width<640||candidate.height<640||!/^https:\/\/upload\.wikimedia\.org\//.test(candidate.url))return;
   if(!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(candidate.source))return;
   if(!/^(CC0|CC BY |CC BY-SA |Public domain|PD-)/i.test(candidate.license))return;
   const preload=new Image();
   preload.onload=()=>{
    if(preload.naturalWidth<160||preload.naturalHeight<160)return;
    const original=image.getAttribute('src');
    let alternatives=[];
    try{alternatives=JSON.parse(image.getAttribute('data-portrait-fallbacks')||'[]')}catch{}
    image.setAttribute('data-portrait-fallbacks',JSON.stringify([original,...alternatives].filter(Boolean)));
    image.src=candidate.url;
    image.setAttribute('data-photo-provenance','Wikidata P18 / Wikimedia Commons');
    const label=document.createElement('a');
    label.href=candidate.source;label.target='_blank';label.rel='noopener noreferrer';
    label.className='portrait-commons-credit';
    label.textContent='Photo : '+(candidate.artist||'Wikimedia Commons')+' · '+candidate.license;
    label.title='Métadonnées de la photo et conditions de licence sur Wikimedia Commons. Le lien Wikidata ne constitue pas une vérification d’identité indépendante.';
    const parent=image.closest('.guil.ph');if(parent&&!parent.querySelector('.portrait-commons-credit'))parent.append(label);
   };
   preload.src=candidate.url;
  }).catch(()=>{}).finally(()=>clearTimeout(stop));
})();
