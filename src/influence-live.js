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
  const link=new URL(location.href);link.searchParams.set('g',select.value);link.hash='reseaux';
  if(navigator.share){try{await navigator.share({title:'Influence économique – '+select.value,text:'Explorer les réseaux des grandes fortunes',url:link.href});return}catch{}}
  try{await navigator.clipboard.writeText(link.href);status.textContent='Lien copié';}catch{status.textContent=link.href;}
 });
})();
