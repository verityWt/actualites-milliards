(()=>{'use strict';
 const el=document.getElementById('infGraphData'),select=document.getElementById('infCompany'),host=document.getElementById('infNetwork');
 if(!el||!select||!host)return;
 let groups=[];try{groups=JSON.parse(el.textContent)}catch{return}
 const output=document.getElementById('infPersonLinks'),heading=document.getElementById('infSelectedName'),count=document.getElementById('infSelectedCount');
 const SVG='http://www.w3.org/2000/svg';
 function make(tag,attributes,text){
  const node=document.createElementNS(SVG,tag);
  for(const [key,value] of Object.entries(attributes||{}))node.setAttribute(key,String(value));
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function render(name,push=false){
  const group=groups.find(g=>g.name===name)||groups[0];if(!group)return;
  select.value=group.name;
  heading.textContent=group.name;
  count.textContent=group.people.length+' profils associés dans notre base';
  output.replaceChildren();
  const svg=make('svg',{viewBox:'0 0 960 520',role:'img','aria-label':'Réseau de '+group.name+' et '+group.people.length+' personnalités'});
  const defs=make('defs');const gradient=make('linearGradient',{id:'infGradient',x1:'0%',y1:'0%',x2:'100%',y2:'100%'});
  gradient.append(make('stop',{offset:'0%','stop-color':'#bd9461'}),make('stop',{offset:'100%','stop-color':'#ead09b'}));defs.append(gradient);svg.append(defs);
  const x1=270,y1=260,x2=625,n=group.people.length;
  for(let i=0;i<n;i++){
   const person=group.people[i],y2=n===1?260:72+i*376/(n-1);
   svg.append(make('path',{d:'M '+(x1+112)+' '+y1+' C 466 '+y1+', 480 '+y2+', '+(x2-38)+' '+y2,stroke:'#b4a1a1','stroke-width':1.4,opacity:.75,fill:'none'}));
  }
  svg.append(make('rect',{x:x1-120,y:y1-40,width:237,height:80,rx:14,fill:'url(#infGradient)'}));
  svg.append(make('text',{x:x1,y:y1+5,'font-size':24,'font-weight':700,'text-anchor':'middle',fill:'#231718'},group.name.length>22?group.name.slice(0,21)+'…':group.name));
  for(let i=0;i<n;i++){
   const person=group.people[i],y=n===1?260:72+i*376/(n-1);
   const a=make('a',{href:'/milliardaires/'+encodeURIComponent(person.id)+'/'});
   a.append(make('circle',{cx:x2,cy:y,r:12,fill:'#c8a05a',stroke:'#f9f2e7','stroke-width':3}));
   a.append(make('text',{x:x2+28,y:y+5,'font-size':18,fill:'currentColor','font-weight':'600'},person.name.length>27?person.name.slice(0,26)+'…':person.name));
   a.append(make('title',{},person.name+' — '+person.wealth+' Md$ selon le classement'));svg.append(a);
   const personLink=document.createElement('a');personLink.href='/milliardaires/'+encodeURIComponent(person.id)+'/';personLink.textContent=person.name+' · '+person.wealth+' Md$';
   output.append(personLink);
  }
  host.replaceChildren(svg);
  if(push){const u=new URL(location.href);u.searchParams.set('g',group.name);u.hash='reseaux';history.replaceState(null,'',u.toString());}
 }
 const initial=new URLSearchParams(location.search).get('g');
 render(groups.some(x=>x.name===initial)?initial:groups[0]?.name);
 select.addEventListener('change',()=>render(select.value,true));
 document.querySelectorAll('[data-graph-group]').forEach(button=>button.addEventListener('click',()=>{
  render(button.dataset.graphGroup,true);document.getElementById('reseaux')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 const share=document.getElementById('infShare'),status=document.getElementById('infShareStatus');
 if(share)share.addEventListener('click',async()=>{
  const slug=select.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const link=new URL('/influence/reseaux/'+slug+'/',location.origin);
  if(navigator.share){try{await navigator.share({title:'Influence économique – '+select.value,text:'Explorer les réseaux des grandes fortunes',url:link.href});return}catch{}}
  try{await navigator.clipboard.writeText(link.href);status.textContent='Lien copié';}catch{status.textContent=link.href;}
 });

 // Free local watchlist: persisted in the browser, never represented as a paid account or email alert.
 const watch=document.getElementById('infWatch'),key='actualites.influence.watch.v1';
 let watchlist=[];
 try{const parsed=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(parsed))watchlist=parsed.filter(x=>typeof x==='string').slice(0,40);}catch{}
 function watchStatus(){if(watch){const tracked=watchlist.includes(select.value);watch.textContent=tracked?'Réseau enregistré ✓':'Enregistrer ce réseau';watch.setAttribute('aria-pressed',String(tracked));}}
 watchStatus();
 select.addEventListener('change',watchStatus);
 if(watch)watch.addEventListener('click',()=>{
  const name=select.value;
  watchlist=watchlist.includes(name)?watchlist.filter(x=>x!==name):[name,...watchlist].slice(0,40);
  try{localStorage.setItem(key,JSON.stringify(watchlist));status.textContent=watchlist.includes(name)?'Réseau enregistré sur cet appareil':'Réseau retiré du suivi local';}
  catch{status.textContent='Enregistrement local indisponible';}
  watchStatus();
 });
 const download=document.getElementById('infDownload');
 if(download)download.addEventListener('click',()=>{
  const svg=host.querySelector('svg');
  if(!svg)return;
  const clone=svg.cloneNode(true);
  clone.setAttribute('xmlns',SVG);
  const title=make('title',{},'Actualites.fr — réseau de '+select.value+' — corpus Forbes 2026');
  clone.insertBefore(title,clone.firstChild);
  const footer=make('text',{x:480,y:510,'text-anchor':'middle','font-size':14,fill:'#856b50'},'Actualites.fr · Forbes 2026 · relations documentaires, non juridiques');
  clone.append(footer);
  const data=new XMLSerializer().serializeToString(clone);
  const blob=new Blob([data],{type:'image/svg+xml;charset=utf-8'});
  const src=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=src;a.download='actualites-reseau-'+select.value.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.svg';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(src),1000);
  status.textContent='Graphique exporté avec attribution';
 });
})();
