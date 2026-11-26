/* Portrait URLs may be blocked by publishers. Try documented alternates, then show initials. */
(function(){
 'use strict';
 window.actualitesPhotoError=function(img){
   let sources=[];
   try{sources=JSON.parse(img.getAttribute('data-portrait-fallbacks')||'[]')}catch{}
   const seen=new Set([img.currentSrc,img.src]);
   while(sources.length){
     const next=sources.shift();
     try{
       const u=new URL(next,document.baseURI);
       if(u.protocol!=='https:'&&u.origin!==location.origin)continue;
       if(seen.has(u.href))continue;
       img.setAttribute('data-portrait-fallbacks',JSON.stringify(sources));
       img.src=u.href;
       return;
     }catch{}
   }
   img.remove();
 };
})();
