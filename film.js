/* Original editing exercise: two concrete edits of the same finite source frames. */
(function(root){
 'use strict';
 const orders={voice:['voice','other','space'],other:['other','space','voice'],space:['space','other','voice']};
 function edit(cut='voice',alternate=false,sound='natural'){
  const chosen=orders[cut]?cut:'voice',alt=chosen==='other'?'voice':'other';
  const order=[...orders[alternate?alt:chosen]];
  const mode=alternate?'natural':sound;
  const segments=order.filter(x=>mode!=='none'||x!=='voice').map(key=>({key,seconds:key==='other'?(alternate||chosen==='other'?6:4.5):key==='voice'?3.2:4}));
  return {version:2,cut:chosen,alternate,sound:mode,lead:mode==='before'?2.8:0,segments};
 }
 function plans(node,selected,state){
  if(node.kind==='filmtrim'){
   const short=selected==='pause',main={version:2,cut:selected,alternate:false,sound:'none',lead:0,segments:[{key:'ranran_pause',seconds:4},...short?[]:[{key:'ranran_junction',seconds:4}]]};
   return [main,{...main,alternate:true,segments:short?[{key:'ranran_pause',seconds:4},{key:'ranran_junction',seconds:4}]:[{key:'ranran_pause',seconds:4}]}];
  }
  if(node.kind==='filmshots')return [{version:2,cut:selected,alternate:false,sound:'natural',lead:0,segments:[{key:selected,seconds:selected==='other'?6:4}] }];
  const cut=node.kind==='filmcompare'?selected:state.vars.u_cut||'voice';
  const sound=node.kind==='soundcut'?selected:state.vars.u_sound||'natural';
  // New saves retain both edits. Older v5 saves reconstruct them from their real choices.
  if(node.kind==='filmplay'){
   const output=state.artifacts.u_sound?.output;
   if(valid(output?.main_edit)&&valid(output?.alternate_edit))return [output.main_edit,output.alternate_edit];
  }
  return [edit(cut,false,sound),edit(cut,true,sound)];
 }
 function valid(p){return p?.version===2&&['voice','other','space','junction','pause'].includes(p.cut)&&typeof p.alternate==='boolean'&&['before','after','none','natural'].includes(p.sound)&&[0,2.8].includes(p.lead)&&Array.isArray(p.segments)&&p.segments.length>0&&p.segments.length<=3&&p.segments.every(s=>['voice','other','space','ranran_pause','ranran_junction'].includes(s.key)&&Number.isFinite(s.seconds)&&s.seconds>0&&s.seconds<=6);}
 const duration=p=>p.lead+p.segments.reduce((n,s)=>n+s.seconds,0);
 function position(p,t){
  if(t<p.lead)return {key:'lead',local:t,index:-1,frame:0};
  let passed=p.lead;
  for(let i=0;i<p.segments.length;i++){
   const s=p.segments[i];if(t<passed+s.seconds||i===p.segments.length-1){const local=Math.max(0,Math.min(s.seconds,t-passed));return {key:s.key,local,index:i,frame:s.key==='other'?Math.min(3,Math.floor(local/s.seconds*4)):0};}passed+=s.seconds;
  }
 }
 function cues(p){
  let passed=p.lead,clothEnd=0,voiceAt=null;const out=[];
  for(const s of p.segments){
   if(s.key==='other'){for(let i=0;i<3;i++)out.push({at:passed+i*s.seconds/4,key:'sfx_cloth',gain:.45});clothEnd=passed+s.seconds;}
   if(s.key==='space'||s.key==='ranran_junction'){out.push({at:passed+.4,key:'sfx_footstep',gain:.4});out.push({at:passed+2,key:'sfx_footstep',gain:.35});}
   if(s.key==='voice')voiceAt=passed+.15;
   if(s.key==='ranran_pause')out.push({at:passed+.3,key:'sfx_board_stop',gain:.35});
   passed+=s.seconds;
  }
  const at=p.sound==='before'?.1:p.sound==='after'?clothEnd+.1:p.sound==='natural'?voiceAt:null;
  if(at!==null&&at<duration(p))out.push({at,key:'film_voice_thought',gain:.9,caption:'我以为她会回来。',seconds:2.8});
  return out.sort((a,b)=>a.at-b.at);
 }
 const api={edit,plans,valid,duration,position,cues};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemsFilm=api;
})(typeof window!=='undefined'?window:globalThis);
