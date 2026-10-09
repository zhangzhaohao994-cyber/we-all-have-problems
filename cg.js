/* Narrative illustrations appear only at explicit beats already in the story. */
(function(root){
 'use strict';
 const previousVisibility=new WeakMap();
 function resolve(node,state,assets=root.PROBLEMS_CG||{},plan=root.PROBLEMS_VISUAL_PLAN||{}){
  const cue=plan.cg?.find(x=>x.node===node.id);
  if(!cue||Object.entries(cue.when||{}).some(([key,value])=>state.vars?.[key]!==value))return null;
  const asset=assets[cue.id];return asset?.image?{...cue,image:asset.image}:null;
 }
 function clear(stage,cast){
  stage.querySelector('[data-story-cg]')?.remove();delete stage.dataset.cg;
  if(previousVisibility.has(cast)){cast.style.visibility=previousVisibility.get(cast);previousVisibility.delete(cast);}
 }
 function apply(stage,cast,node,state){
  const cue=resolve(node,state);clear(stage,cast);if(!cue)return false;
  const frame=document.createElement('div'),image=document.createElement('img');
  frame.className='story-cg';frame.dataset.storyCg=cue.id;image.src=cue.image;image.alt=cue.description;image.loading='eager';
  image.addEventListener('error',()=>{if(stage.querySelector('[data-story-cg]')===frame)clear(stage,cast);},{once:true});
  frame.append(image);stage.append(frame);stage.dataset.cg=cue.id;
  previousVisibility.set(cast,cast.style.visibility);cast.style.visibility='hidden';return true;
 }
 const api={resolve,apply,clear};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemsCG=api;
})(typeof window!=='undefined'?window:globalThis);
