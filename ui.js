(function(){
 'use strict';
 const story=window.PROBLEMS_STORY,assets=window.PROBLEMS_CHARACTERS,backgroundAssets=window.PROBLEMS_SCENES,{Journey}=window.ProblemsCore;
 const $=id=>document.getElementById(id),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const objectDetail=el('div');objectDetail.id='object-detail';$('reading').insertBefore(objectDetail,$('actions'));
 const SAVE='problems-v5-autosave',MANUAL='problems-v5-manual',SETTINGS='problems-v5-settings';
 let game=null,work=null,noticeTimer=null,storageWarned=false;
 let preferences={font:1,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,master:.7,music:.45,ambience:.55,sfx:.5,muted:false};
 const safeRead=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 function store(key,value){try{localStorage.setItem(key,value);return true;}catch{if(!storageWarned){notice('浏览器暂时无法保存。仍可继续，请用“导出进度”保留。');storageWarned=true;}return false;}}
 function notice(t){$('notice').textContent=t;$('notice').style.display='block';clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').style.display='none',5500);}
 try{const p=JSON.parse(safeRead(SETTINGS));if(p&&[1,1.25,1.5].includes(p.font))preferences={...preferences,...p};}catch{}
 function applyPreferences(){document.documentElement.style.setProperty('--font-scale',preferences.font);document.body.classList.toggle('reduce-motion',preferences.reduce);if(window.ProblemsAudio)window.ProblemsAudio.settings(preferences);window.ProblemsEnvironmentMotion?.setReduced(preferences.reduce);window.ProblemsCharacterMotion?.setReduced(preferences.reduce);}
 applyPreferences();
 function sound(id){if(window.ProblemsAudio)window.ProblemsAudio.event(id);}
 function autosave(){if(game)store(SAVE,JSON.stringify(game.export()));}
 function release(){if(work){work.destroy();work=null;}}
 function getRouteCast(route){return {debbie:'D',kelly:'K',mia:'M',s01:'R',s02:'Y',s03:'Z',s04:'I',s05:'S',s06:'C',s07:'L',s08:'U',s09:'Q',endings:'M'}[route.replace(/-late$/,'')]||null;}
 let effectWorld=null,effectPixels=[1672,941];
 function sizeEffects(){if(!effectWorld)return;const stage=$('stage'),[w,h]=effectPixels,scale=Math.max(stage.clientWidth/w,stage.clientHeight/h);effectWorld.style.width=w+'px';effectWorld.style.height=h+'px';effectWorld.style.left=(stage.clientWidth-w*scale)/2+'px';effectWorld.style.top=(stage.clientHeight-h*scale)/2+'px';effectWorld.style.transform='scale('+scale+')';}
 const effectResize=new ResizeObserver(sizeEffects);effectResize.observe($('stage'));
 function environment(id,asset){
  effectWorld=null;const key=asset.alias_of||id;let kind=null;
  if(key==='hu_home_editcorner')kind='screen';
  else if(key==='kelly_hotpot')kind='steam';
  else if(key==='sea_wide')kind='sea';
  if(!kind)return;effectPixels=asset.pixels;effectWorld=el('div','effect-world');effectWorld.dataset.effect=kind;effectWorld.setAttribute('aria-hidden','true');
  if(kind==='screen')effectWorld.append(el('div','environment-effect screen-light'));
  if(kind==='steam')for(let i=0;i<3;i++){const puff=el('div','environment-effect pot-steam');puff.style.setProperty('--puff',i);effectWorld.append(puff);}
  if(kind==='sea')effectWorld.append(el('div','environment-effect tide-lines'));
  $('background').append(effectWorld);sizeEffects();
 }
 // Every compiled background is mapped. Fallback is retained only for damaged editions.
 function background(id){
  const asset=backgroundAssets[id];
  if($('background').dataset.asset===id)return;
  $('background').dataset.asset=id;
  if(asset){const img=el('img');img.src=asset.image;img.alt='';$('background').replaceChildren(img);$('background').dataset.asset=id;environment(id,asset);return;}
  const ink='#282C2E',paper='#F2EDE4',wood='#9C806C',blue='#76828A';
  let b='';const outdoor=/gate|river|cycle|shore|seaside|sea_|road|path|corner|street|junction|pickup|fruit/.test(id);
  if(outdoor){
   b=`<rect width="1920" height="1080" fill="#b6c1bd"/><path d="M0 400Q500 200 980 450T1920 360V1080H0" fill="#7d947d"/><path d="M650 1080L890 415h170l500 665" fill="${paper}"/>`;
   if(/sea|shore/.test(id))b+=`<path d="M0 580Q700 555 1920 610v270H0" fill="${blue}"/><path d="M0 700q500 -20 1000 5t920 0" fill="none" stroke="${paper}" stroke-width="8"/>`;
   else for(let i=0;i<5;i++)b+=`<path d="M${180+i*345} 690v-300" stroke="${wood}" stroke-width="24"/><path d="M${90+i*345} 470q-65 -195 80 -225q165 -15 125 220" fill="#8ca27d" stroke="${ink}" stroke-width="3"/>`;
   if(/pickup|fruit/.test(id))b+=`<rect x="1090" y="470" width="650" height="270" fill="${wood}" stroke="${ink}" stroke-width="4"/><path d="M1060 475l110 -190h570l50 190" fill="#A46A61"/>`;
  }else{
   b=`<rect width="1920" height="1080" fill="${paper}"/><path d="M0 830H1920V1080H0" fill="${wood}"/><rect x="1210" y="125" width="390" height="475" fill="#c0ccca" stroke="${ink}" stroke-width="8"/><path d="M1405 125v475m-195 -220h390" stroke="${paper}" stroke-width="12"/>`;
   if(/airport/.test(id))b+=`<path d="M140 30V800m350 -770v770m350 -770v770" stroke="${blue}" stroke-width="18"/><rect x="910" y="200" width="360" height="170" fill="${blue}"/>`;
   else if(/bedroom|night|yuyao|room/.test(id))b+=`<rect x="235" y="580" width="800" height="260" fill="${blue}" stroke="${ink}" stroke-width="5"/><path d="M300 580v-100h710v100" fill="${wood}"/>`;
   else if(/gallery|painting|canvas|studio/.test(id))b+=`<rect x="320" y="160" width="520" height="535" fill="#d3cbc0" stroke="${wood}" stroke-width="22"/><path d="M430 645l140 -350l160 350" fill="${blue}"/>`;
   else b+=`<path d="M210 665h920v40H210m80 40v195m720 -195v195" fill="none" stroke="${wood}" stroke-width="28"/><rect x="480" y="380" width="320" height="230" fill="${blue}" stroke="${ink}" stroke-width="5"/>`;
  }
  $('background').innerHTML=`<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${b}</svg>`;
 }
 function scene(n){
  const s=story.scenes[game.state.scene];$('scene-time').textContent=s.time;$('scene-title').textContent=s.title;$('task').textContent=s.goal;
  background(game.state.background||s.background);
  const cast=$('cast'),people=window.ProblemsCharacters.present(window.PROBLEMS_CHARACTER_CUES,n,window.ProblemsScenes.cast(game.state,story,backgroundAssets));
  for(const img of [...cast.children])if(!people.includes(img.dataset.person))img.remove();
  for(const who of people){
   const a=assets[who];if(!a)continue;let img=[...cast.children].find(i=>i.dataset.person===who);
   if(!img){img=el('img');img.dataset.person=who;img.alt='';img.loading='eager';cast.append(img);}
   img.className='character '+(n.speaker===who?'active':'quiet')+(a.independent_states?.includes('stand')?' independent':'');
   const pose=window.ProblemsCharacters.pose(window.PROBLEMS_CHARACTER_CUES,n,who,assets);
   img.dataset.pose=pose;if(img.getAttribute('src')!==a.states[pose])img.src=a.states[pose];
  }
  if(window.ProblemsCG)window.ProblemsCG.apply($('stage'),cast,n,game.state);
  window.ProblemsEnvironmentMotion?.update($('background'),n,game.state);
  window.ProblemsCharacterMotion?.update(cast,n,game.state);
  if(window.ProblemsAudio)window.ProblemsAudio.scene(game.state.background||s.background,s.route,n.id);
 }
 function pages(text){
  const mobile=innerWidth<700;const capacity=Math.max(23,Math.floor((mobile?47:79)/preferences.font));
  const sentences=text.match(/[^。！？；]*[。！？；]?/gu)?.filter(Boolean)||[text];const result=[];let part='';
  const weight=x=>Array.from(x).reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.56),0);
  for(let s of sentences){
   if(part&&weight(part+s)>capacity){result.push(part);part='';}
   while(weight(s)>capacity){let len=0,w=0;for(const c of s){w+=weight(c);if(w>capacity)break;len+=c.length;}result.push(s.slice(0,len));s=s.slice(len);}
   part+=s;
  }if(part)result.push(part);return result;
 }
 function act(text,fn,cls){const b=el('button',cls,text);b.addEventListener('click',fn);$('actions').append(b);return b;}
 function render(){
  release();const n=game.current();scene(n);const reading=$('reading');const working=n.type==='choice'&&n.kind!=='dialogue'||n.type==='inspect';reading.classList.toggle('work-mode',working);$('game').classList.toggle('working',working);$('speaker').textContent=story.speakers[n.speaker]||'';$('content').replaceChildren();$('actions').replaceChildren();objectDetail.replaceChildren();
  const cue=window.PROBLEMS_CUES[n.id];if(cue&&!game.state.audio_events.includes(n.id)){window.ProblemsAudio?.nodeEvent(cue,n.id);game.state.audio_events.push(n.id);}
  if(n.type==='line'){
   const p=pages(n.text);game.state.page=Math.min(game.state.page,p.length-1);$('content').textContent=p[game.state.page];
   window.ProblemsObjectArt?.result(objectDetail,n,game.state,{onSound:sound});
   if(p.length>1)$('actions').append(el('span','reading-pages',(game.state.page+1)+' / '+p.length));
   act('继续',()=>{sound('page');if(game.state.page<p.length-1){game.state.page++;game.touch();render();autosave();}else{game.advance(n.id);render();autosave();}},'primary');
  }else if(n.type==='choice'){
   $('content').textContent=n.prompt;
   if(n.kind==='dialogue'){window.ProblemsObjectArt?.initial(objectDetail,n,game.state,{onSound:sound});n.options.forEach(o=>act(o.label,()=>{const art=window.ProblemsObjectArt?.artifact(n,o.value,game.state);if(game.choose(n.id,o.value,art?{object_art:art}:undefined)){sound('confirm');render();autosave();}},'choice'));}
   else work=window.ProblemsInteractions.mount($('actions'),n,game.state,(value,output)=>{if(game.choose(n.id,value,output)){sound('confirm');render();autosave();}},sound,autosave);
  }else if(n.type==='inspect'){
   $('content').textContent=n.prompt;const detail=el('p','inspect-text','可以看一处，也可以继续。');$('actions').append(detail);
   const observe=key=>{const t=game.observe(n.id,key);if(t){game.state.inspected[n.id]=game.state.inspected[n.id].filter(x=>x!==key).concat(key);detail.textContent=t;window.ProblemsObjectArt?.inspect(objectDetail,n,key,game.state,{onSound:sound,onObserve:observe});sound('object');autosave();}};
   window.ProblemsObjectArt?.initial(objectDetail,n,game.state,{onSound:sound,onObserve:observe});
   const last=(game.state.inspected[n.id]||[]).at(-1),remembered=n.objects.find(o=>o.key===last);if(remembered)detail.textContent=remembered.text;
   const labels={path:'前面的路',crowd:'经过的人',seat:'车座',action:'写出的动作',feeling:'谁的感觉',blank:'空着的地方',voice:'叙述',other:'独立动作',space:'空间',shared:'共同约定',hidden:'隐瞒',unknown:'还不知道',bag:'随身的包',board:'长板',box:'箱子',broken:'没接上的地方',car:'车边',clock:'时间',dishes:'碗筷',editable:'可改的副本',later:'后来',loose:'零散的东西',one:'第一处',two:'第二处',preview:'预览',return:'返程',route:'这一程'};
   for(const o of n.objects)act(labels[o.key]||'看看这一处',()=>observe(o.key));
   act('接着做',()=>{game.advance(n.id);render();autosave();},'primary');
  }else if(n.type==='offer'){
   $('content').textContent=n.prompt;act('接着这一段',()=>{game.offer(n.id,true);render();autosave();},'choice');act('先继续眼前的事',()=>{game.offer(n.id,false);render();autosave();},'choice');
  }else if(n.type==='finish'){
   $('content').append(el('p','ending-note','今天的这一段，到这里。'));act('回看这次走过的场景',openHistory);act('导出这次进度',exportSave);act('回到开场',()=>{$('welcome').hidden=false;});autosave();
  }
 }
 function start(saved){try{const candidate=new Journey(story,saved);game=candidate;$('welcome').hidden=true;render();autosave();if(window.ProblemsAudio)window.ProblemsAudio.unlock();}catch(e){notice(e.message);}}
 $('start').addEventListener('click',()=>{if(game||safeRead(SAVE)){openMenu('重新开始');$('menu-body').append(el('p','','当前进度可以先导出；旧版本进度不会被改动。'));const b=el('button','primary','开始新的旅程');b.onclick=()=>{closeMenu();start();};$('menu-body').append(b);}else start();});
 $('continue').disabled=!safeRead(SAVE);$('continue').addEventListener('click',()=>{try{start(JSON.parse(safeRead(SAVE)));}catch{notice('自动进度无法读取。可以导入备份，或开始新的旅程。');}});
 if(['problems-save-v3','lampshade-save-v2','problems-save-v4'].some(k=>safeRead(k)))$('legacy-note').textContent='旧版进度已保留，新版使用独立进度。';
 function openMenu(title){if(work)work.pause();sound('menu');$('menu-title').textContent=title;$('menu-body').replaceChildren();if(!$('menu').open)$('menu').showModal();}
 function closeMenu(){sound('back');$('menu').close();}
 $('menu-close').onclick=closeMenu;$('menu').addEventListener('cancel',()=>{if(work)work.pause();});
 function openHistory(){
  openMenu('回看');if(!game){$('menu-body').append(el('p','','开始以后，这里会留下已经走过的场景。'));return;}
  $('menu-body').append(el('p','small','回看只阅读已经发生的内容，不改变当前路线。'));
  for(const sid of game.state.visited){const b=el('button','history-scene',story.scenes[sid].title+' · '+story.scenes[sid].time);b.onclick=()=>showHistory(sid);$('menu-body').append(b);}
 }
 function showHistory(sid){$('menu-body').replaceChildren();const back=el('button','','返回场景列表');back.onclick=openHistory;$('menu-body').append(back);
  for(const h of game.state.history.filter(h=>h.scene===sid)){
   const p=el('p','history-line');if(h.speaker)p.append(el('strong','',story.speakers[h.speaker]));p.append(document.createTextNode(h.text));$('menu-body').append(p);
  }
 }
 $('history-open').onclick=openHistory;
 function exportSave(){if(!game){notice('还没有开始这次旅程。');return;}const blob=new Blob([JSON.stringify({format:'我们都有问题·v5',state:game.export(),settings:preferences},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='我们都有问题_v5_进度.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('save-open').onclick=()=>{openMenu('保存 / 读取');const row=el('div','menu-row');for(const [label,fn] of [
  ['保存',()=>{if(!game){notice('还没有开始。');return;}if(store(MANUAL,JSON.stringify(game.export())))notice('已保存这次进度。');else notice('这次没有保存成功。请用“导出进度”保留。');}],
  ['读取',()=>{try{const s=JSON.parse(safeRead(MANUAL));if(!s){notice('没有手动保存的进度。');return;}const checked=new Journey(story,s);closeMenu();start(checked.export());}catch(e){notice(e.message||'这份进度无法读取。');}}],
  ['导出进度',exportSave],['导入进度',()=>$('import-file').click()],
  ['重选上一处',()=>{if(!game||!game.state.rewind.length){notice('还没有可重选的位置。');return;}try{if(game.rewind()){closeMenu();render();autosave();notice('已回到上一处选择；后来的结果已撤回。');}}catch(e){notice(e.message);}}]
 ]){const b=el('button','',label);b.onclick=fn;row.append(b);}$('menu-body').append(row,el('p','small','自动进度在推进和完成操作时保存。重选会撤回上一处选择之后的结果；回看不改变进度。新版使用独立存档，旧版保持原样。'));};
 $('import-file').addEventListener('change',async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  if(f.size>5*1024*1024){notice('这份文件太大，请选择本游戏导出的进度。');return;}
  try{const d=JSON.parse(await f.text()),candidate=new Journey(story,d.state);game=candidate;closeMenu();$('welcome').hidden=true;render();autosave();notice('已导入进度。声音设置保留当前选择。');}catch(err){notice(err.message||'文件无法读取，当前进度没有改变。');}
 });
 $('settings-open').onclick=()=>{openMenu('声音 / 设置');
  const fontRow=el('div','menu-row'),label=el('label','','文字大小'),select=el('select');label.htmlFor='font-size';select.id='font-size';for(const [v,t] of [[1,'标准'],[1.25,'125%'],[1.5,'150%']]){const o=el('option','',t);o.value=v;select.append(o);}select.value=preferences.font;select.onchange=()=>{preferences.font=Number(select.value);applyPreferences();store(SETTINGS,JSON.stringify(preferences));if(game)render();};fontRow.append(label,select);$('menu-body').append(fontRow);
  const reduceRow=el('div','menu-row'),reduce=el('input');reduce.type='checkbox';reduce.id='reduce';reduce.checked=preferences.reduce;const reduceLabel=el('label','','减少动态');reduceLabel.htmlFor='reduce';reduce.onchange=()=>{preferences.reduce=reduce.checked;applyPreferences();store(SETTINGS,JSON.stringify(preferences));};reduceRow.append(reduce,reduceLabel);$('menu-body').append(reduceRow);
  for(const [key,title] of [['master','总音量'],['music','配乐'],['ambience','环境声'],['sfx','操作 / 事件声']]){const row=el('div','menu-row'),lab=el('label','',title),input=el('input');input.type='range';input.min=0;input.max=100;input.value=preferences[key]*100;input.id='volume-'+key;lab.htmlFor=input.id;input.oninput=()=>{preferences[key]=Number(input.value)/100;applyPreferences();store(SETTINGS,JSON.stringify(preferences));};row.append(lab,input);$('menu-body').append(row);}
  const mute=el('button','',preferences.muted?'开启声音':'静音');mute.onclick=()=>{preferences.muted=!preferences.muted;applyPreferences();store(SETTINGS,JSON.stringify(preferences));mute.textContent=preferences.muted?'开启声音':'静音';if(!preferences.muted&&window.ProblemsAudio)window.ProblemsAudio.unlock();};
  const status=el('p','small');status.id='sound-status';$('menu-body').append(mute,status);applyPreferences();
  const importRow=el('div','menu-row'),importButton=el('button','','选择本地开场音乐'),removeButton=el('button','','恢复游戏配乐');
  importButton.onclick=()=>$('music-file').click();removeButton.onclick=()=>{window.ProblemsAudio.removeMusic();if(game)scene(game.current());notice('已恢复游戏配乐。');};importRow.append(importButton,removeButton);
  $('menu-body').append(importRow,el('p','small','游戏配有原创器乐与环境声。可以载入你自己的《我们都有问题》音频作为开场音乐；本地音乐只在当前窗口使用。静音也能完成所有操作。'));
 };
 $('music-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{notice(await window.ProblemsAudio.importMusic(file));if(game)scene(game.current());await window.ProblemsAudio.unlock();}catch{notice('音频无法读取，请换一份 MP3、M4A 或 WAV。');}});
 document.addEventListener('keydown',e=>{if($('menu').open||!$('welcome').hidden||e.repeat||e.target.matches('button,input,select,textarea'))return;if(e.key===' '||e.key==='Enter'){const n=game.current();if(n.type==='line'){e.preventDefault();$('actions button').click();}}});
 document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('window-hidden',document.hidden);if(document.hidden&&work)work.pause();if(window.ProblemsAudio)window.ProblemsAudio.visibility(!document.hidden);});
 window.addEventListener('pagehide',()=>{window.ProblemsEnvironmentMotion?.destroy();window.ProblemsCharacterMotion?.destroy();});
 window.addEventListener('pageshow',e=>{if(e.persisted&&game&&$('welcome').hidden)scene(game.current());});
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(game)render();},160);});
})();
