/* Explicit visible staging; no inferred emotional scores or runtime keyword rules. */
(function(root){
 'use strict';
 function pose(cues,node,who,assets){
  const requested=cues.nodes?.[node.id]?.[who]||cues.scenes?.[node.scene]?.[who]||'stand';
  const a=assets[who];
  return a?.independent_states?.includes(requested)&&a.states[requested]?requested:'stand';
 }
 function present(cues,node,people){return people.filter(who=>!cues.hidden?.[node.id]?.includes(who));}
 const api={pose,present};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemsCharacters=api;
})(typeof window!=='undefined'?window:globalThis);
