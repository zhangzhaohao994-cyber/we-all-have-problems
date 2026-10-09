/* Optional local ambient motion. Story state and the base background remain untouched. */
(function(root){
 'use strict';
 const STYLE_ID='problems-environment-local-style';
 const TYPES=new Set(['leaf-sway','cloth-sway','paper-corner','leaf-shadow','daylight','lamp-glow']);
 const CSS=`
 .problems-env-local-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;user-select:none;z-index:0}
 .problems-env-local-layer[hidden]{display:none!important}
 .problems-env-local-world{position:absolute;pointer-events:none;overflow:hidden}
 .problems-env-local-region{position:absolute;pointer-events:none;overflow:hidden;contain:paint;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
 .problems-env-local-region img{position:absolute;display:block;max-width:none!important;max-height:none!important;object-fit:fill!important;pointer-events:none}
 .problems-env-local-texture{mask-image:radial-gradient(ellipse,black 68%,transparent 100%);-webkit-mask-image:radial-gradient(ellipse,black 68%,transparent 100%)}
 .problems-env-local-leaf-sway{animation-name:problems-env-leaf;transform-origin:50% 90%}
 .problems-env-local-cloth-sway{animation-name:problems-env-cloth;transform-origin:50% 0}
 .problems-env-local-paper-corner{animation-name:problems-env-paper;transform-origin:0 0;mask-image:linear-gradient(125deg,transparent,black 35%,black 80%,transparent);-webkit-mask-image:linear-gradient(125deg,transparent,black 35%,black 80%,transparent)}
 .problems-env-local-shade-texture{position:absolute;inset:-3px;background:radial-gradient(ellipse at 17% 40%,rgba(24,34,24,var(--env-alpha)),transparent 32%),radial-gradient(ellipse at 58% 22%,rgba(24,34,24,var(--env-alpha)),transparent 30%),radial-gradient(ellipse at 82% 70%,rgba(24,34,24,var(--env-alpha)),transparent 29%),radial-gradient(ellipse at 37% 86%,rgba(24,34,24,var(--env-alpha)),transparent 26%);animation:problems-env-shadow var(--env-seconds) ease-in-out infinite;animation-delay:var(--env-delay)}
 .problems-env-local-leaf-shadow{animation-name:problems-env-soft}
 .problems-env-local-daylight{background:radial-gradient(ellipse,rgba(var(--env-daylight-rgb),var(--env-alpha)),transparent 72%);animation-name:problems-env-soft}
 .problems-env-local-lamp-glow{background:radial-gradient(ellipse,rgba(255,226,169,var(--env-alpha)),transparent 73%);animation-name:problems-env-soft}
 @keyframes problems-env-leaf{0%,100%{transform:translate(0,0) rotate(0)}43%{transform:translate(var(--env-dx),var(--env-dy)) rotate(var(--env-angle))}76%{transform:translate(calc(var(--env-dx)*-.35),0) rotate(calc(var(--env-angle)*-.3))}}
 @keyframes problems-env-cloth{0%,100%{transform:translateX(0) skewX(0)}47%{transform:translateX(var(--env-dx)) skewX(var(--env-angle))}74%{transform:translateX(calc(var(--env-dx)*.25)) skewX(calc(var(--env-angle)*-.4))}}
 @keyframes problems-env-paper{0%,100%{transform:translateY(0) rotate(0)}52%{transform:translateY(var(--env-dy)) rotate(var(--env-angle))}77%{transform:translateY(calc(var(--env-dy)*.25)) rotate(calc(var(--env-angle)*.2))}}
 @keyframes problems-env-soft{0%,100%{opacity:.18}39%{opacity:1}73%{opacity:.48}}
 @keyframes problems-env-shadow{0%,100%{transform:translate(0,0)}44%{transform:translate(var(--env-dx),var(--env-dy))}79%{transform:translate(calc(var(--env-dx)*-.25),calc(var(--env-dy)*.2))}}
 body.reduce-motion .problems-env-local-layer{display:none!important}
 body.window-hidden .problems-env-local-region,body.window-hidden .problems-env-local-shade-texture{animation-play-state:paused!important}
 @media(prefers-reduced-motion:reduce){.problems-env-local-layer{display:none!important}}
 `;
 let current=null,doc=null,win=null,media=null,style=null,observer=null;
 let userReduced=false,mediaLegacy=false;
 const config=()=>root.PROBLEMS_ENVIRONMENT_MOTION||{};
 const reduced=()=>userReduced||!!media?.matches;
 function dimensions(host){
  const box=host.getBoundingClientRect();return [box.width,box.height];
 }
 function validEffect(e){
  const bounded=(key,max)=>e?.[key]===undefined||(Number.isFinite(e[key])&&Math.abs(e[key])<=max);
  if(!(e&&TYPES.has(e.kind)&&Array.isArray(e.polygon)&&e.polygon.length>=3&&e.polygon.length<=12&&
   e.polygon.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1))&&
   Number.isFinite(e.seconds)&&e.seconds>=8&&e.seconds<=30&&
   bounded('dx',1.5)&&bounded('dy',1.5)&&bounded('angle',.25)&&bounded('delay',30)&&
   Number.isFinite(e.alpha)&&e.alpha>0&&e.alpha<=.14&&
   (e.tone===undefined||['shade','warm'].includes(e.tone))))return false;
  let twiceArea=0;
  for(let i=0;i<e.polygon.length;i++){
   const a=e.polygon[i],b=e.polygon[(i+1)%e.polygon.length];twiceArea+=a[0]*b[1]-b[0]*a[1];
  }
  return Math.abs(twiceArea)>1e-8;
 }
 function resolve(host,node,state){
  if(!host||typeof host.append!=='function'||typeof host.getBoundingClientRect!=='function'||!node||!state||
     state.scene!==node.scene||state.finished||host.parentElement?.dataset?.cg)return null;
  const background=state.background||root.PROBLEMS_STORY?.scenes?.[state.scene]?.background||host.dataset?.asset;
  if(host.dataset?.asset&&host.dataset.asset!==background)return null;
  const place=config().places?.find(p=>p.scenes?.includes(state.scene)&&p.backgrounds?.includes(background));
  const pixels=place?.pixels;
  if(!place||!Array.isArray(pixels)||pixels.length!==2||pixels.some(n=>!Number.isFinite(n)||n<=0)||
     !place.effects?.length||place.effects.length>2||place.effects.some(e=>!validEffect(e)))return null;
  const actual=root.PROBLEMS_SCENES?.[background];
  if(actual?.pixels&&(actual.pixels[0]!==pixels[0]||actual.pixels[1]!==pixels[1]))return null;
  const image=actual?.image||place.image;
  if(typeof image!=='string'||!image)return null;
  return {place,background,image,scene:state.scene};
 }
 function el(tag,className){const n=doc.createElement(tag);n.className=className;return n;}
 function size(){
  if(!current||doc.hidden||reduced())return;
  const [width,height]=dimensions(current.host);if(width<=0||height<=0){current.layer.hidden=true;return;}
  const [pw,ph]=current.place.pixels,scale=Math.max(width/pw,height/ph),rw=pw*scale,rh=ph*scale;
  Object.assign(current.world.style,{width:rw+'px',height:rh+'px',left:(width-rw)/2+'px',top:(height-rh)/2+'px'});
  for(const item of current.regions){
   const xs=item.effect.polygon.map(p=>p[0]),ys=item.effect.polygon.map(p=>p[1]);
   const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
   Object.assign(item.element.style,{left:x*rw+'px',top:y*rh+'px',width:w*rw+'px',height:h*rh+'px'});
   const polygon='polygon('+item.effect.polygon.map(p=>((p[0]-x)/w*100)+'% '+((p[1]-y)/h*100)+'%').join(',')+')';
   item.element.style.clipPath=polygon;
   if(item.image)Object.assign(item.image.style,{width:rw+'px',height:rh+'px',left:-x*rw+'px',top:-y*rh+'px'});
  }
  current.layer.hidden=reduced()||!!doc.hidden;
 }
 function sync(){
  if(!current)return;
  const pause=reduced()||!!doc.hidden;
  current.layer.hidden=pause;current.layer.dataset.paused=String(pause);
  for(const item of current.regions){item.element.style.animationPlayState=pause?'paused':'running';
   if(item.shade)item.shade.style.animationPlayState=pause?'paused':'running';}
  if(!pause)size();
 }
 function clearLayer(){
  if(observer){observer.disconnect();observer=null;}
  current?.layer.remove();current=null;
 }
 function connect(document){
  if(doc===document)return;
  disconnect();doc=document;win=doc.defaultView||root;
  style=el('style','');style.id=STYLE_ID;style.textContent=CSS;doc.head.append(style);
  if(typeof win.matchMedia==='function'){
   media=win.matchMedia('(prefers-reduced-motion: reduce)');
   if(media.addEventListener)media.addEventListener('change',sync);
   else if(media.addListener){media.addListener(sync);mediaLegacy=true;}
  }
  doc.addEventListener('visibilitychange',sync);win.addEventListener?.('resize',size);
 }
 function disconnect(){
  clearLayer();
  doc?.removeEventListener('visibilitychange',sync);win?.removeEventListener?.('resize',size);
  if(mediaLegacy)media?.removeListener?.(sync);else media?.removeEventListener?.('change',sync);
  style?.remove();doc=null;win=null;media=null;style=null;mediaLegacy=false;
 }
 function update(host,node,state){
  const next=resolve(host,node,state);if(!next){clearLayer();return false;}
  const document=host.ownerDocument||root.document;
  if(!document?.head||typeof document.createElement!=='function'){clearLayer();return false;}
  connect(document);
  if(current&&current.host===host&&current.layer.parentNode===host&&current.place===next.place&&
     current.scene===next.scene&&current.background===next.background&&current.image===next.image){sync();return true;}
  clearLayer();
  const layer=el('div','problems-env-local-layer'),world=el('div','problems-env-local-world');
  layer.setAttribute('aria-hidden','true');layer.dataset.environmentMotion=next.place.id;
  layer.append(world);
  const context={...next,host,layer,world,regions:[]};current=context;
  for(const effect of next.place.effects){
   const region=el('div','problems-env-local-region problems-env-local-'+effect.kind);
   region.dataset.environmentEffect=effect.id;
   for(const [key,value] of Object.entries({'--env-seconds':effect.seconds+'s','--env-delay':(effect.delay||0)+'s',
    '--env-dx':(effect.dx||0)+'px','--env-dy':(effect.dy||0)+'px','--env-angle':(effect.angle||0)+'deg','--env-alpha':String(effect.alpha),
    '--env-daylight-rgb':effect.tone==='shade'?'83,77,58':'250,244,219'}))region.style.setProperty(key,value);
   region.style.animationDuration=effect.seconds+'s';region.style.animationDelay=(effect.delay||0)+'s';
   const record={effect,element:region,image:null,shade:null};
   if(['leaf-sway','cloth-sway','paper-corner'].includes(effect.kind)){
    const picture=el('img','problems-env-local-source');picture.src=next.image;picture.alt='';picture.draggable=false;
    picture.addEventListener('error',()=>{if(current===context)clearLayer();},{once:true});
    record.image=picture;region.append(picture);region.classList.add('problems-env-local-texture');
   }else if(effect.kind==='leaf-shadow'){
    record.shade=el('div','problems-env-local-shade-texture');region.append(record.shade);
   }
   context.regions.push(record);world.append(region);
  }
  host.append(layer);
  if(typeof win.ResizeObserver==='function'){observer=new win.ResizeObserver(size);observer.observe(host);}
  size();sync();return true;
 }
 function setReduced(value=true){userReduced=!!value;sync();return reduced();}
 function destroy(){disconnect();}
 const api={update,setReduced,destroy};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemsEnvironmentMotion=api;
})(typeof window!=='undefined'?window:globalThis);
