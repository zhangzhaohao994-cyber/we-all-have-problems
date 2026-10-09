/* True eye patches from approved frames; the full-body base src and geometry never change. */
(function(root){
 'use strict';
 const SVG='http://www.w3.org/2000/svg',entries=new Map();
 let host=null,stage=null,scene=null,doc=null,win=null,media=null,observer=null,legacy=false,userReduced=false,serial=0;
 const catalog=()=>root.PROBLEMS_CHARACTER_MOTION?.characters||{};
 const paused=()=>userReduced||!!media?.matches||!!doc?.hidden;
 const source=img=>img.getAttribute('src');
 const plainClip=value=>!value||value==='none';
 function asset(who){
  const a=catalog()[who],p=a?.pixels;
  if(!a||!['base','blink','gaze'].every(k=>typeof a[k]==='string'&&a[k])||!Array.isArray(p)||p.length!==2||
   p.some(n=>!Number.isFinite(n)||n<=0)||!Array.isArray(a.eye_boxes)||a.eye_boxes.length!==2)return null;
  const boxes=a.eye_boxes.map(b=>Array.isArray(b)?{x:b[0],y:b[1],width:b[2],height:b[3]}:b);
  if(boxes.some(b=>!b||!['x','y','width','height'].every(k=>Number.isFinite(b[k]))||b.x<0||b.y<0||
   b.width<=0||b.height<=0||b.x+b.width>p[0]||b.y+b.height>p[1]||b.width>p[0]*.12||b.height>p[1]*.06))return null;
  const [a0,b0]=boxes;if(a0.x<b0.x+b0.width&&b0.x<a0.x+a0.width&&a0.y<b0.y+b0.height&&b0.y<a0.y+a0.height)return null;
  return {base:a.base,blink:a.blink,gaze:a.gaze,pixels:[...p],boxes};
 }
 function same(a,b){return a&&b&&['base','blink','gaze'].every(k=>a[k]===b[k])&&
  a.pixels[0]===b.pixels[0]&&a.pixels[1]===b.pixels[1]&&JSON.stringify(a.boxes)===JSON.stringify(b.boxes);}
 function allowed(img){return img?.tagName==='IMG'&&img.parentNode===host&&img.dataset?.pose==='stand'&&
  !stage?.dataset?.cg&&host?.style.visibility!=='hidden'&&!host?.hidden;}
 function current(e){return entries.get(e.img)===e&&allowed(e.img)&&e.img.dataset.person===e.who&&source(e.img)===e.asset.base;}
 function restore(e){
  e.backplate.svg.style.visibility='hidden';
  for(const f of Object.values(e.frames))f.svg.style.visibility='hidden';
  if(e.img.style.clipPath===e.clip)e.img.style.clipPath=e.previous.clipPath;
  if(e.img.style.webkitClipPath===e.clip)e.img.style.webkitClipPath=e.previous.webkitClipPath;
  if(e.img.dataset.eyeMotion===e.mode)delete e.img.dataset.eyeMotion;e.mode=null;
 }
 function cancel(e){if(e.timer!==null)win?.clearTimeout(e.timer);e.timer=null;restore(e);}
 function drop(e){
  cancel(e);e.img.removeEventListener('load',e.baseLoad);e.img.removeEventListener('error',e.baseError);
  e.backplate.svg.removeEventListener('load',e.backplate.load);e.backplate.svg.removeEventListener('error',e.backplate.error);
  for(const f of Object.values(e.frames)){
   f.preload.onload=null;f.preload.onerror=null;f.svg.removeEventListener('load',f.svgLoad);f.svg.removeEventListener('error',f.svgError);
  }
  observer?.unobserve?.(e.img);e.overlay.remove();entries.delete(e.img);
 }
 function clear(){for(const e of [...entries.values()])drop(e);observer?.disconnect();}
 function svg(tag,attrs={}){const n=doc.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
 function rectPath(x,y,w,h){return 'M'+x+','+y+'h'+w+'v'+h+'h'+(-w)+'Z';}
 // CSS object-position is read after transforms; current game uses contain / center bottom.
 function position(value){
  if(value==='center')return .5;if(value==='left'||value==='top')return 0;if(value==='right'||value==='bottom')return 1;
  if(typeof value==='string'&&/^-?\d+(?:\.\d+)?%$/.test(value))return parseFloat(value)/100;
  return null;
 }
 function layout(e){
  if(paused()||!current(e))return false;
  const css=win.getComputedStyle(e.img),rect=e.img.getBoundingClientRect(),box=stage.getBoundingClientRect();
  if(css.visibility==='hidden'||css.display==='none'||css.objectFit!=='contain'||rect.width<=0||rect.height<=0||box.width<=0||box.height<=0)return false;
  const tokens=(css.objectPosition||'50% 50%').trim().split(/\s+/);if(tokens.length!==2)return false;
  const px=position(tokens[0]),py=position(tokens[1]);if(px===null||py===null)return false;
  const [pw,ph]=e.asset.pixels;
  if(!e.img.complete||e.img.naturalWidth!==pw||e.img.naturalHeight!==ph)return false;
  const scale=Math.min(rect.width/pw,rect.height/ph),width=pw*scale,height=ph*scale;
  const left=rect.left+(rect.width-width)*px,top=rect.top+(rect.height-height)*py;
  if(!e.asset.boxes.some(b=>left+(b.x+b.width)*scale>box.left&&left+b.x*scale<box.right&&
   top+(b.y+b.height)*scale>box.top&&top+b.y*scale<box.bottom))return false;
  Object.assign(e.overlay.style,{left:(left-box.left-(stage.clientLeft||0))+'px',top:(top-box.top-(stage.clientTop||0))+'px',
   width:width+'px',height:height+'px',opacity:css.opacity,mixBlendMode:css.mixBlendMode||'normal'});
  // One evenodd clip keeps the base outside the two holes, with no multiply overlap inside them.
  let d=rectPath(0,0,1,1);
  for(const b of e.asset.boxes)d+=rectPath((left-rect.left+b.x*scale)/rect.width,(top-rect.top+b.y*scale)/rect.height,
   b.width*scale/rect.width,b.height*scale/rect.height);
  e.hole.setAttribute('d',d);return true;
 }
 function schedule(e){
  if(paused()||!current(e)||!e.backplate.ready||!e.frames.blink.ready||e.timer!==null||e.mode||!layout(e))return;
  const delay=4000+Math.floor((Math.random()*5000+e.phase*997+e.cycles*131)%5000);
  e.timer=win.setTimeout(()=>{
   e.timer=null;if(paused()||!current(e)||!e.backplate.ready||!e.frames.blink.ready||!layout(e)){restore(e);return;}
   show(e,'blink');
   e.timer=win.setTimeout(()=>{
    e.timer=null;restore(e);if(!current(e)||paused())return;e.cycles++;
    if(e.cycles%3===0&&e.backplate.ready&&e.frames.gaze.ready&&layout(e)){
     show(e,'gaze');e.timer=win.setTimeout(()=>{e.timer=null;restore(e);schedule(e);},720);
    }else schedule(e);
   },160);
  },delay);
 }
 function show(e,kind){
  // Original-color backplate and soft real patch compose inside one SVG, before its opacity/blend.
  e.backplate.svg.style.visibility='visible';
  e.mode=kind;e.img.style.clipPath=e.clip;e.img.style.webkitClipPath=e.clip;
  e.frames[kind].svg.style.visibility='visible';e.img.dataset.eyeMotion=kind;
 }
 function refresh(){
  for(const e of [...entries.values()]){
   if(!current(e)){drop(e);continue;}
   if(paused()||!layout(e)){cancel(e);continue;}
   if(e.timer===null&&!e.mode)schedule(e);
  }
 }
 function sync(){for(const e of entries.values())cancel(e);if(!paused())refresh();}
 function watch(){
  observer?.disconnect();if(!observer)return;observer.observe(host);observer.observe(stage);for(const e of entries.values())observer.observe(e.img);
 }
 function connect(next){
  const document=next.ownerDocument||root.document;if(doc===document)return true;
  destroy();doc=document;win=doc?.defaultView||root;
  if(!doc?.createElementNS||!win.CSS?.supports?.('clip-path','url("#problems-eye-support-check")')){doc=null;win=null;return false;}
  media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  if(media?.addEventListener)media.addEventListener('change',sync);else if(media?.addListener){media.addListener(sync);legacy=true;}
  doc.addEventListener('visibilitychange',sync);win.addEventListener?.('resize',refresh);
  if(typeof win.ResizeObserver==='function')observer=new win.ResizeObserver(refresh);return true;
 }
 function make(img,a){
  if(!plainClip(img.style.clipPath)||!plainClip(img.style.webkitClipPath))return null;
  const id='problems-eye-'+(++serial),overlay=svg('svg',{viewBox:'0 0 '+a.pixels[0]+' '+a.pixels[1],preserveAspectRatio:'none','aria-hidden':'true'});
  overlay.classList.add('problems-character-eye-layer');overlay.dataset.characterEyeMotion=img.dataset.person;
  Object.assign(overlay.style,{position:'absolute',pointerEvents:'none',overflow:'hidden',userSelect:'none',isolation:'isolate'});
  const defs=svg('defs'),patch=svg('clipPath',{id:id+'-patch',clipPathUnits:'userSpaceOnUse'}),base=svg('clipPath',{id:id+'-base',clipPathUnits:'objectBoundingBox'});
  for(const b of a.boxes)patch.append(svg('rect',{x:b.x,y:b.y,width:b.width,height:b.height}));
  const hole=svg('path',{'clip-rule':'evenodd','fill-rule':'evenodd'});base.append(hole);defs.append(patch,base);overlay.append(defs);
  const soft=svg('mask',{id:id+'-soft',maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',x:0,y:0,width:a.pixels[0],height:a.pixels[1]});
  soft.style.maskType='alpha';
  for(const [i,b] of a.boxes.entries()){
   const gradient=svg('radialGradient',{id:id+'-soft-'+i,gradientUnits:'objectBoundingBox',cx:'.5',cy:'.5',r:'.5'});
   gradient.append(svg('stop',{offset:'0%','stop-color':'white','stop-opacity':1}),
    svg('stop',{offset:'76%','stop-color':'white','stop-opacity':1}),svg('stop',{offset:'100%','stop-color':'white','stop-opacity':0}));
   defs.append(gradient);soft.append(svg('rect',{x:b.x,y:b.y,width:b.width,height:b.height,fill:'url(#'+id+'-soft-'+i+')'}));
  }
  defs.append(soft);
  // A nested group keeps the original backplate distinct from the two real frame images.
  const backGroup=svg('g',{'clip-path':'url(#'+id+'-patch)'}),backImage=svg('image',{
   x:0,y:0,width:a.pixels[0],height:a.pixels[1],preserveAspectRatio:'none'});
  backImage.dataset.eyeBackplate=img.dataset.person;backImage.style.visibility='hidden';backGroup.append(backImage);overlay.append(backGroup);
  const e={img,asset:a,who:img.dataset.person,phase:serial,cycles:0,timer:null,mode:null,overlay,hole,clip:'url("#'+id+'-base")',
   previous:{clipPath:img.style.clipPath,webkitClipPath:img.style.webkitClipPath},frames:{},baseLoad:refresh,baseError:null,
   backplate:{svg:backImage,ready:false,failed:false,load:null,error:null}};
  e.baseError=()=>{if(entries.get(img)===e)drop(e);};entries.set(img,e);
  img.addEventListener('load',e.baseLoad);img.addEventListener('error',e.baseError);
  e.backplate.load=()=>{if(entries.get(img)!==e||e.backplate.failed)return;e.backplate.ready=true;schedule(e);};
  e.backplate.error=()=>{if(entries.get(img)!==e)return;e.backplate.failed=true;e.backplate.ready=false;cancel(e);};
  backImage.addEventListener('load',e.backplate.load);backImage.addEventListener('error',e.backplate.error);backImage.setAttribute('href',a.base);
  for(const kind of ['blink','gaze']){
   const picture=svg('image',{x:0,y:0,width:a.pixels[0],height:a.pixels[1],preserveAspectRatio:'none',
    'clip-path':'url(#'+id+'-patch)',mask:'url(#'+id+'-soft)'});
   picture.style.visibility='hidden';overlay.append(picture);
   const preload=new win.Image(),f={svg:picture,preload,ready:false,decoded:false,svgReady:false,failed:false};e.frames[kind]=f;
   const ready=()=>{if(entries.get(img)!==e||f.failed)return;f.ready=f.decoded&&f.svgReady;if(f.ready)schedule(e);};
   const failure=()=>{
    if(entries.get(img)!==e)return;f.failed=true;f.ready=false;
    if(kind==='blink')cancel(e);else if(e.mode==='gaze'){cancel(e);schedule(e);}
   };
   f.svgLoad=()=>{f.svgReady=true;ready();};f.svgError=failure;picture.addEventListener('load',f.svgLoad);picture.addEventListener('error',f.svgError);
   preload.onerror=failure;
   preload.onload=()=>{
    if(entries.get(img)!==e||f.failed)return;
    if(Math.abs(preload.naturalWidth-a.pixels[0])>1||Math.abs(preload.naturalHeight-a.pixels[1])>1||preload.naturalWidth<=0||preload.naturalHeight<=0){failure();return;}
    if(typeof preload.decode==='function')preload.decode().then(()=>{f.decoded=true;ready();},failure);
    else{f.decoded=true;ready();}
   };
   preload.src=a[kind];picture.setAttribute('href',a[kind]);
  }
  stage.append(overlay);return e;
 }
 function update(next,node,state){
  if(!next||!node||!state||node.scene!==state.scene||state.finished||!next.parentElement||next.parentElement.dataset?.cg||next.style.visibility==='hidden'||next.hidden){clear();return 0;}
  if(!connect(next))return 0;
  if(host!==next||stage!==next.parentElement||scene!==node.scene){clear();host=next;stage=next.parentElement;scene=node.scene;}
  const wanted=new Map();for(const img of [...host.children]){
   if(!allowed(img))continue;const a=asset(img.dataset.person);if(a&&source(img)===a.base)wanted.set(img,a);
  }
  let changed=false;
  for(const e of [...entries.values()])if(!wanted.has(e.img)||!same(e.asset,wanted.get(e.img))){drop(e);changed=true;}
  for(const [img,a] of wanted)if(!entries.has(img)){if(make(img,a))changed=true;}
  if(changed||!entries.size)watch();refresh();return entries.size;
 }
 function setReduced(value=true){userReduced=!!value;sync();return paused();}
 function destroy(){
  clear();if(legacy)media?.removeListener?.(sync);else media?.removeEventListener?.('change',sync);
  doc?.removeEventListener('visibilitychange',sync);win?.removeEventListener?.('resize',refresh);
  host=null;stage=null;scene=null;doc=null;win=null;media=null;observer=null;legacy=false;
 }
 const api={update,setReduced,destroy};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemsCharacterMotion=api;
})(typeof window!=='undefined'?window:globalThis);
