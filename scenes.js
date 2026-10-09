/* Location and cast rules apply equally to portraits, previews and scene variants. */
(function(root){
 'use strict';
 const allowedHome=new Set(['H','M','Q','S','C','L','U']);
 const homeIds=new Set(['mia_living_room','mia_dining','mia_dining_morning','mia_bedroom','mia_doorway','mia_talk_evening']);
 const routeCast={debbie:'D',kelly:'K',mia:'M',s01:'R',s02:'Y',s03:'Z',s04:'I',s05:'S',s06:'C',s07:'L',s08:'U',s09:'Q',ending:'M'};
 function isHome(id,catalog={}){return homeIds.has(id)||catalog[id]?.location_family==='mia_home';}
 function permitted(id,people,catalog={}){return !isHome(id,catalog)||people.every(p=>allowedHome.has(p));}
 function cast(state,story,catalog={}){
  const s=story.scenes[state.scene],n=story.nodes[state.cursor],bg=state.background||s.background;
  let people=['H',routeCast[s.route.replace(/-late$/,'')]].filter(Boolean);
  if(['d-marriage','d-refusal','m-cherry','m-later-entry','y-next','k-art-entry','k-art-exit','k-interlude-exit'].includes(s.id)||s.route==='bridge')people=['H'];
  if(s.id==='bridge-hu-preview')people=['H','U'];
  if(s.id==='k-interlude')people=['H','Z'];
  if(['s-read','s-rhythm','s-example','s-later'].includes(s.id))people=['H'];
  if(s.id==='s-dispute')people=['S'];
  if(s.id==='e-opening'&&bg==='publisher_proof')people=['H','C'];
  if(s.id==='d-gate'){
   const arrival=Object.values(story.nodes).find(x=>x.scene==='d-gate'&&x.type==='line'&&x.text.startsWith('她绕过路边的车'));
   if(arrival&&n.id!==arrival.id&&!state.seen.includes(arrival.id))people=['H'];
  }
  return people.filter(w=>!isHome(bg,catalog)||allowedHome.has(w));
 }
 const api={isHome,permitted,cast,homeIds:[...homeIds],allowedHome:[...allowedHome]};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemsScenes=api;
})(typeof window!=='undefined'?window:globalThis);
