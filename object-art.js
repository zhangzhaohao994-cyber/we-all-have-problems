/* Independent object art shares the real choices and observation keys. */
(function(root){
 'use strict';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const plan=()=>root.PROBLEMS_VISUAL_PLAN||{},catalog=()=>root.PROBLEMS_OBJECTS||{};
 function imageFor(item,assets=catalog()){
  const base=assets[item.id],pose=item.state||'normal';
  const variant=base?.states?.[pose]||assets[item.id+'_'+pose];
  const asset=variant||(['normal','moved'].includes(pose)?base:null);
  return typeof asset==='string'?asset:asset?.image||asset?.runtime||null;
 }
 function taskFrame(node,value,p=plan()){
  const task=p.object_tasks?.[node.id];if(!task)return null;
  return task.options?.[value]||(!value?task.options?.idle:null)||null;
 }
 function resultFrame(node,state,p=plan()){
  const cue=p.object_results?.[node.id];if(!cue)return null;
  const value=cue.value||state.vars?.[cue.from_var];
  if(cue.require_var&&state.vars?.[cue.require_var.key]!==cue.require_var.value)return null;
  const chosen=state.artifacts?.[cue.require_var?.key||cue.from_var];
  if(!chosen||chosen.node!==cue.task||chosen.value!==value)return null;
  const task=p.object_tasks?.[cue.task];return task?.options?.[value]||null;
 }
 function available(frame,assets=catalog()){
  return !!frame?.items?.length&&frame.items.every(item=>imageFor(item,assets));
 }
 function artifact(node,value,state){
  const frame=taskFrame(node,value);if(!available(frame))return null;
  return {art_version:1,objects:frame.items.map(x=>({id:x.id,state:x.state||'normal',x:x.x,y:x.y,w:x.w,h:x.h,rotate:x.rotate||0,label:x.label||''})),
   drawing:frame.drawing||null,poster:frame.poster||null};
 }
 function drawing(paper,variant){
  const layer=document.createElementNS('http://www.w3.org/2000/svg','svg');
  // Match the generated paper's full source canvas. SVG meet and image
  // contain share the same letterboxing; turning the paper turns its marks.
  layer.setAttribute('viewBox','0 0 1254 1254');layer.classList.add('object-drawing');layer.setAttribute('aria-hidden','true');
  const stroke=(d,color='#282c2e')=>{const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width','11');path.setAttribute('stroke-linecap','round');layer.append(path);};
  if(variant==='feet'||variant==='both')for(const [x,y] of [[442,579],[493,594],[545,610],[720,674]])stroke(`M${x} ${y}l-18 77`);
  if(variant==='weight'||variant==='both'){stroke('M405 550h-64m486 127h78');stroke('M338 518v65m570 55v68','#a46a61');}
  if(variant==='feet')stroke('M590 815q100 13 199 73','#a46a61');
  paper.append(layer);
 }
 function poster(paper,variant){
  const layer=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.setAttribute('viewBox','0 0 1024 1536');layer.classList.add('object-poster-layer');layer.setAttribute('aria-hidden','true');
  const content=document.createElementNS('http://www.w3.org/2000/svg','foreignObject');content.setAttribute('x','155');content.setAttribute('y','155');content.setAttribute('width','720');content.setAttribute('height','1220');
  const sheet=el('div','object-poster-text '+(variant==='image'?'poster-image-first':'poster-information-first'));
  sheet.append(el('strong','poster-heading','试排海报'));
  const image=el('div','poster-picture');image.setAttribute('aria-hidden','true');
  // Reuse the sheet's actual small illustration as the movable layout block.
  image.style.backgroundImage='url("'+imageFor({id:'poster_sheet'})+'")';
  const information=el('div','poster-information');information.append(el('span','','开始时间'),el('span','','到达方式'));
  sheet.append(image,information);content.append(sheet);layer.append(content);paper.append(layer);
 }
 function observationKey(node,itemId,p=plan()){
  return Object.entries(p.observations?.[node.id]||{}).find(([,frame])=>frame.items?.some(x=>x.id===itemId))?.[0]||null;
 }
 function render(container,frame,node,{mode='preview',onSound,onObserve}={}){
  if(!available(frame))return false;
  const wrap=el('figure','object-art'),canvas=el('div','object-art-canvas'),note=el('figcaption','object-art-note','可以点物件看一处细节。');
  wrap.dataset.node=node.id;wrap.dataset.artMode=mode;canvas.setAttribute('aria-label',frame.label||'眼前的物件');
  for(const item of frame.items){
   const info=plan().objects?.find(x=>x.id===item.id),button=el('button','object-art-item');
   button.type='button';button.dataset.item=item.id;button.dataset.state=item.state||'normal';
   button.setAttribute('aria-label',item.label||info?.name||item.id);
   for(const [key,value] of Object.entries({left:item.x,top:item.y,width:item.w,height:item.h}))button.style[key]=value+'%';
   button.style.transform='rotate('+(item.rotate||0)+'deg)';
   const img=el('img');img.src=imageFor(item);img.alt='';img.draggable=false;button.append(img);
   if(item.id==='shrimp_sketch'&&frame.drawing)drawing(button,frame.drawing);
   if(item.id==='poster_sheet'&&frame.poster){canvas.classList.add('poster-canvas');poster(button,frame.poster);}
   button.addEventListener('click',()=>{const key=onObserve&&observationKey(node,item.id);if(key){onObserve(key);return;}note.textContent=item.description||info?.description||item.label||info?.name||'';if(onSound)onSound('object');});
   img.addEventListener('error',()=>{wrap.remove();},{once:true});canvas.append(button);
  }
  wrap.append(canvas,note);container.replaceChildren(wrap);return true;
 }
 function preview(container,node,value,state,callbacks){return render(container,taskFrame(node,value),node,callbacks);}
 function inspect(container,node,key,state,callbacks){const frame=plan().observations?.[node.id]?.[key];container.replaceChildren();return render(container,frame,node,{...callbacks,mode:'observation'});}
 function result(container,node,state,callbacks){return render(container,resultFrame(node,state),node,{...callbacks,mode:'result'});}
 function initial(container,node,state,callbacks){
  const p=plan(),seen=state.inspected?.[node.id]||[],last=seen.at(-1);
  const frame=node.type==='inspect'?(p.observations?.[node.id]?.[last]||p.observation_defaults?.[node.id]):taskFrame(node,null,p);
  return render(container,frame,node,{...callbacks,mode:node.type==='inspect'?'observation':'before-choice'});
 }
 const api={imageFor,taskFrame,resultFrame,available,artifact,observationKey,preview,inspect,result,initial};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemsObjectArt=api;
})(typeof window!=='undefined'?window:globalThis);
