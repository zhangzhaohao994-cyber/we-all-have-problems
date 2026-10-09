(function(root){
 'use strict';
 const catalog=root.PROBLEMS_AUDIO||{},cache=new Map(),pending=new Map(),lastEvent=new Map();
 let ctx=null,buses=null,enabled=false,visible=true,desired={music:null,ambience:null},preferences={master:.7,music:.45,ambience:.55,sfx:.5,muted:false};
 const slots={music:null,ambience:null},loading={music:null,ambience:null},oneshots=new Set(),clipSources=new Set();
 let epoch=0,eventEpoch=0,nodeEpoch=0,nodeId=null,place=null,localTrack=null,localUrl=null,localRevision=0,importRequest=0;
 const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
 function status(){const out=document.getElementById('sound-status');if(out){out.textContent=preferences.muted?'声音已静音':enabled?'声音已开启':'点击开始后开启声音';out.dataset.context=ctx?.state||'uninitialized';out.dataset.music=slots.music?.key||'';out.dataset.ambience=slots.ambience?.key||'';out.dataset.events=oneshots.size;}}
 function prune(){let bytes=[...cache.values()].reduce((n,b)=>n+b.length*b.numberOfChannels*4,0);for(const [key,b] of cache){if(bytes<95*1024*1024)break;if(Object.values(slots).some(s=>s?.key===key))continue;cache.delete(key);bytes-=b.length*b.numberOfChannels*4;}}
 async function buffer(key){
  if(cache.has(key)){const b=cache.get(key);cache.delete(key);cache.set(key,b);return b;}
  if(pending.has(key))return pending.get(key);
  const revision=localRevision,file=key==='local_music'?localUrl:catalog[key]?.file;if(!file)throw new Error('声音素材尚未接入');
  const task=(async()=>{let raw;
   if(file.startsWith('data:')){const bytes=atob(file.split(',')[1]);raw=Uint8Array.from(bytes,c=>c.charCodeAt(0)).buffer;}
   else{const r=await fetch(file);if(!r.ok)throw new Error('声音文件无法读取');raw=await r.arrayBuffer();}
   const b=await ctx.decodeAudioData(raw);
   if(key!=='local_music'||revision===localRevision){cache.set(key,b);prune();}return b;})();
  pending.set(key,task);try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}
 }
 function create(){
  if(ctx)return;ctx=new (root.AudioContext||root.webkitAudioContext)();buses={};
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=4;limiter.ratio.value=20;limiter.attack.value=.005;limiter.release.value=.18;
  const output=ctx.createGain();output.gain.value=.8;limiter.connect(output).connect(ctx.destination);
  buses.master=ctx.createGain();buses.master.connect(limiter);
  for(const name of ['music','ambience','sfx']){buses[name]=ctx.createGain();buses[name].connect(buses.master);}apply();
 }
 function apply(){if(!ctx)return;for(const name of ['master','music','ambience','sfx']){const g=buses[name].gain;g.cancelScheduledValues(ctx.currentTime);g.setTargetAtTime(name==='master'&&preferences.muted?0:clamp(preferences[name]),ctx.currentTime,.04);}status();}
 async function unlock(){if(preferences.muted)return;try{create();await ctx.resume();enabled=true;epoch++;refresh();status();}catch{const out=document.getElementById('sound-status');if(out)out.textContent='浏览器暂未开启声音，静音也能游玩。';}}
 async function loop(bus,key){
  if((slots[bus]?.key===key&&(key!=='local_music'||slots[bus].revision===localRevision))||(loading[bus]?.key===key&&loading[bus]?.epoch===epoch))return;
  const old=slots[bus];slots[bus]=null;
  if(old){old.gain.gain.cancelScheduledValues(ctx.currentTime);old.gain.gain.setTargetAtTime(0,ctx.currentTime,.35);old.source.stop(ctx.currentTime+1.35);}
  if(!key||!enabled||preferences.muted||!visible)return;
  const token=epoch;loading[bus]={key,epoch:token};
  try{
   const data=await buffer(key);if(token!==epoch||desired[bus]!==key||preferences.muted||!visible)return;
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=data;source.loop=true;
   source.loopStart=0;source.loopEnd=data.duration;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(1,ctx.currentTime+1.1);
   source.connect(gain).connect(buses[bus]);source.start();slots[bus]={source,gain,key,revision:localRevision};status();prune();
  }catch(e){console.warn('Audio asset unavailable:',key,e.message);status();}
  finally{if(loading[bus]?.epoch===token)loading[bus]=null;}
 }
 function refresh(){if(!ctx||!enabled||preferences.muted||!visible)return;loop('music',desired.music);loop('ambience',desired.ambience);}
 function scene(background,route,currentNode){
  // Event boundaries follow the actual place, independently of shared loops.
  if(!place||place.background!==background||place.route!==route){place={background,route};eventEpoch++;}
  // Only delayed narrative cues follow a node. UI feedback can finish decoding
  // after its click advances to the next node in the same place.
  if(currentNode!==undefined&&currentNode!==nodeId){nodeId=currentNode;nodeEpoch++;}
  let ambience='amb_room_day';
  if(/car_interior|sea_transit|sea_return/.test(background))ambience='amb_car_interior';
  else if(/water_pickup|water_car/.test(background))ambience='amb_water_pickup';
  else if(/hu_home_/.test(background))ambience='amb_edit_room';
  else if(/hu_studio_snow/.test(background))ambience='amb_cycle_path';
  else if(/rain/.test(background))ambience='amb_rain_window';
  else if(/sea_|seaside|shore/.test(background))ambience='amb_sea';
  else if(/airport/.test(background))ambience='amb_airport';
  else if(/fruit_stall/.test(background))ambience='amb_fruit_stall';
  else if(/hotpot|snack|shop|teahouse|remote_food/.test(background))ambience='amb_restaurant';
  else if(/night|bedroom|phone_corner/.test(background))ambience='amb_room_night';
  else if(/cycle|river|gate|street|path|junction|bridge|road/.test(background))ambience='amb_cycle_path';
  else if(/publisher|writer/.test(background))ambience='amb_publisher';
  else if(/action_group|action_hands|cleanup/.test(background))ambience='amb_art_people';
  else if(/action_|festival/.test(background))ambience='amb_art_empty';
  else if(/preview|screen/.test(background))ambience='amb_preview';
  else if(/university|old_film/.test(background))ambience='amb_edit_room';
  else if(/liu_|ceramic|canvas/.test(background))ambience='amb_studio';
  let music={debbie:'music_depart',kelly:'music_shared',mia:'music_daily',s05:'music_pages',s06:'music_shore',s08:'music_working'}[route.replace(/-late$/,'')]||null;
  if(/airport/.test(background))music='music_farewell';
  if(/phone_corner|sea_shelter|liu_|action_|university_preview|kelly_balcony|company_gate/.test(background))music=null;
  if(localTrack&&route==='debbie'&&background==='songjiang_gate')music='local_music';
  if(desired.music===music&&desired.ambience===ambience)return;
  desired={music,ambience};epoch++;refresh();
 }
 async function playEvent(id,nodeToken=null){
  id={play:'film_play',pause:'film_pause'}[id]||id;const key='sfx_'+id;if(!catalog[key]||!ctx||!enabled||preferences.muted||!visible)return;
  const now=performance.now(),min=['page','select','mouse'].includes(id)?180:320;if(now-(lastEvent.get(id)||-10000)<min)return;lastEvent.set(id,now);
  const token=eventEpoch;
  try{const data=await buffer(key);if(token!==eventEpoch||(nodeToken!==null&&nodeToken!==nodeEpoch)||preferences.muted||!visible)return;
   if(oneshots.size>=3){const first=oneshots.values().next().value;first.stop();oneshots.delete(first);}
   const source=ctx.createBufferSource();source.buffer=data;source.connect(buses.sfx);oneshots.add(source);source.onended=()=>{oneshots.delete(source);status();};source.start();status();
  }catch(e){console.warn('Event sound unavailable:',key,e.message);}
 }
 function event(id){return playEvent(id);}
 function nodeEvent(id,currentNode){if(typeof currentNode!=='string'||currentNode!==nodeId)return;return playEvent(id,nodeEpoch);}
 function clipEvent(key,offset=0,volume=1){
  let cancelled=false,source=null;
  const handle={stop(){cancelled=true;if(source){try{source.stop();}catch{}clipSources.delete(handle);}}};
  if(!catalog[key]||!ctx||!enabled||preferences.muted||!visible)return handle;
  const token=eventEpoch;clipSources.add(handle);
  buffer(key).then(data=>{if(cancelled||token!==eventEpoch||preferences.muted||!visible||offset>=data.duration){clipSources.delete(handle);return;}
   source=ctx.createBufferSource();const gain=ctx.createGain();source.buffer=data;gain.gain.value=clamp(volume);source.connect(gain).connect(buses.sfx);source.onended=()=>clipSources.delete(handle);source.start(0,Math.max(0,offset));
  }).catch(e=>{clipSources.delete(handle);console.warn('Film sound unavailable:',key,e.message);});return handle;
 }
 function halt(){epoch++;eventEpoch++;for(const bus of ['music','ambience']){if(slots[bus]){try{slots[bus].source.stop();}catch{}slots[bus]=null;}}for(const source of oneshots){try{source.stop();}catch{}}oneshots.clear();for(const h of [...clipSources])h.stop();status();}
 function settings(p){const was=preferences.muted;preferences={...preferences,...p};apply();if(preferences.muted)halt();else if(was){epoch++;refresh();}}
 async function visibility(v){visible=v;if(!ctx)return;if(!v){halt();await ctx.suspend();}else if(enabled&&!preferences.muted){await ctx.resume();epoch++;refresh();}status();}
 async function importMusic(file){if(!file||file.size>30*1024*1024)throw new Error('请选择小于30MB的本地音频。');
  const request=++importRequest;create();const b=await ctx.decodeAudioData(await file.arrayBuffer());
  if(request!==importRequest)return '这次导入已被后一次操作替代，保留当前音乐。';
  const nextUrl=URL.createObjectURL(file),oldUrl=localUrl;
  localRevision++;epoch++;localUrl=nextUrl;localTrack=file.name;pending.delete('local_music');cache.set('local_music',b);
  if(oldUrl)URL.revokeObjectURL(oldUrl);refresh();
  return '已载入本地开场音乐，仅保存在本次浏览器窗口中。';
 }
 function removeMusic(){importRequest++;localRevision++;epoch++;if(localUrl)URL.revokeObjectURL(localUrl);localUrl=null;localTrack=null;cache.delete('local_music');pending.delete('local_music');if(desired.music!=='local_music')refresh();}
 root.ProblemsAudio={unlock,scene,event,nodeEvent,clipEvent,settings,visibility,importMusic,removeMusic};
})(window);
