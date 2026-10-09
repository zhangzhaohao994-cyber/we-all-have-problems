(function(root){
 'use strict';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const svg=body=>'<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="640" height="300" fill="#F2EDE4"/>'+body+'</svg>';
 const line=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#282C2E" stroke-width="3" fill="none"/>`;
 const paper=(x=80,y=20,w=480,h=260)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fffaf0" stroke="#9C806C" stroke-width="2"/>`;
 const letters=(s,x,y,size=20)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#282C2E" font-family="sans-serif">${s}</text>`;
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const routeShape=(v)=>svg(`<path d="M80 245Q270 105 560 90" stroke="#9C806C" stroke-width="50" fill="none"/><path d="M80 245Q270 105 560 90" stroke="#F2EDE4" stroke-width="43" fill="none"/><path d="M80 245Q${v===0?'150 10':'400 210'} 560 90" stroke="#A46A61" stroke-width="4" stroke-dasharray="10 6" fill="none"/><circle cx="80" cy="245" r="12" fill="#282C2E"/><circle cx="560" cy="90" r="12" fill="#76828A"/>${letters('会合处',42,280)}${letters('路口',536,60)}`);
 function preview(kind,value,opt,index,state){
  if(['route','soundwalk'].includes(kind))return routeShape(index);
  if(['place','placement','packing','quantity'].includes(kind)){
   const table=value==='dishes'||value==='table'||value==='dry';
   const count=value==='small'?3:value==='split'?6:value==='two'?2:1;
   let objects='';for(let i=0;i<count;i++)objects+=`<rect x="${(table?340:100)+i*37}" y="${table?98:175-i*7}" width="33" height="60" rx="3" fill="${index===1?'#76828A':'#A46A61'}" stroke="#282C2E" stroke-width="2"/>`;
   return svg(`<path d="M35 245H600M350 180H580" stroke="#9C806C" stroke-width="6"/>${objects}<rect x="${index===1?470:140}" y="75" width="100" height="80" fill="none" stroke="#D0AE73" stroke-width="4" stroke-dasharray="5 4"/>${letters('留下通路',385,265)}`);
  }
  if(kind==='drawing'){
   let legs='';if(value!=='weight')for(let i=0;i<6;i++)legs+=line(230+i*25,150,217+i*25,196);
   return svg(`${paper()}<path d="M190 144Q320 85 450 146Q320 176 190 144" fill="none" stroke="#282C2E" stroke-width="4"/>${legs}${value!=='feet'?line(155,140,485,140)+'<rect x="135" y="115" width="22" height="50" fill="#76828A"/><rect x="485" y="115" width="22" height="50" fill="#76828A"/>':''}<path d="M425 150Q500 185 528 237" fill="none" stroke="#A46A61" stroke-width="3"/>`);
  }
  if(['textedit','notecard','filename','proof'].includes(kind)){
   return svg(`${paper()}${letters(kind==='filename'?'另存副本':kind==='proof'?'样页检查':'留在这一页',105,57,18)}${line(105,73,535,73)}${letters(safe(opt.label.slice(0,21)),105,120,19)}${letters(safe(opt.label.slice(21,43)),105,158,19)}${line(110,218,510,218)}${kind==='textedit'?'<path d="M110 230Q250 180 480 230" stroke="#A46A61" fill="none" stroke-width="3"/>':''}`);
  }
  if(kind==='files'){
   const layers=value==='layers';return svg(`${paper(25,35,275,225)}${paper(340,35,275,225)}${letters('原件 · 保留',44,69)}${letters('工作副本',361,69)}<rect x="60" y="105" width="205" height="30" fill="#76828A"/><rect x="60" y="150" width="205" height="30" fill="#D0AE73"/><rect x="370" y="105" width="210" height="${layers?30:105}" fill="#76828A"/>${layers?'<rect x="370" y="150" width="210" height="30" fill="#D0AE73"/>':''}${letters(layers?'能改，仍缺末次改动':'外观图，不含图层',362,240,18)}`);
  }
  if(['pagecompare','composition','canvas'].includes(kind)){
   const wide=['image','pair','window','wide','passage','structure','flow'].includes(value);
   return svg(`${paper()}<rect x="${wide?160:260}" y="55" width="${wide?315:140}" height="160" fill="#76828A"/><rect x="${wide?370:305}" y="80" width="35" height="120" fill="#9C806C"/><path d="M${wide?185:278} 160Q280 90 420 170" fill="none" stroke="#282C2E" stroke-width="4"/>${line(105,244,wide?270:520,244)}${wide?line(330,244,520,244):''}${kind==='pagecompare'?letters(wide?'画面与必要信息分区':'必要信息放在一起',110,277,16):''}`);
  }
  if(['framing','recording'].includes(kind)){
   const wide=['group','whole','pair','window'].includes(value),none=value==='none';
   return svg(`<rect x="50" y="40" width="540" height="220" fill="#9C806C" opacity=".12"/>${[150,280,410].map(x=>`<circle cx="${x}" cy="95" r="20" fill="#76828A"/><path d="M${x} 115v85" stroke="#282C2E" stroke-width="5"/>`).join('')}<rect x="${wide?75:220}" y="${wide?55:120}" width="${wide?480:145}" height="${wide?195:105}" fill="none" stroke="${none?'#76828A':'#A46A61'}" stroke-width="4" ${none?'stroke-dasharray="6 6"':''}/>${none?line(75,55,555,250):''}${letters(none?'镜头收起':wide?'全景与未拍到的地方':'桌沿或手上的细节',105,283,18)}`);
  }
  if(kind==='sequence'){
   const labels=value==='before'?['她先开口','我后来讲很多','再谈以后']:['期待没接上','回到当晚说话','再看具体回答'];
   return svg(labels.map((s,i)=>`${paper(35+i*200,78,175,135)}${letters(s,49+i*200,140,17)}${i<2?line(210+i*200,146,230+i*200,146):''}`).join(''));
  }
  if(kind==='actionchain')return svg(`${paper()}<path d="M220 210Q165 132 260 104L375 105Q440 100 425 143L340 165Q288 165 280 211" fill="#D0AE73" stroke="#282C2E" stroke-width="3"/><path d="M${index===0?230:index===1?290:390} 103q24 -35 53 -5" stroke="#A46A61" stroke-width="4" fill="none"/>${letters(index===0?'袖口：理平 → 折角':index===1?'掌心：合拢 → 摊开':'镜头边：示意 → 停手',125,270,20)}`);
  return svg(`${paper()}${letters(safe(opt.label.slice(0,23)),102,140,19)}`);
 }
 const filmKinds=new Set(['filmtrim','filmshots','filmcompare','soundcut','filmplay']);
 function mount(parent,node,state,onConfirm,onSound,onDraftSave){
  const prior=state.drafts[node.id];
  let selected=node.options.find(o=>o.value===prior?.value)||node.options[0],index=node.options.indexOf(selected),playing=false,frame=null,elapsed=prior?.elapsed||0,round=prior?.round||0;
  const wrap=el('section','workbench');wrap.setAttribute('aria-label',node.prompt);
  const display=el('div','work-preview');const caption=el('p','preview-caption');
  const controls=el('div','work-options');const commit=el('button','primary','留下这一版');
  const player=el('div','clip-controls');const status=el('p','small','');status.setAttribute('aria-live','polite');
  let clipOrder=['voice','other','space'],edits=[],variant=prior?.variant||0,audioHandles=[];
  const Film=root.ProblemsFilm,catalog=root.PROBLEMS_FILM||{};
  const clipImage=el('img','clip-image'),subtitle=el('p','clip-subtitle');clipImage.alt='';
  function remember(){state.drafts[node.id]={value:selected.value,round,elapsed,clipOrder,variant};if(onDraftSave)onDraftSave();}
  function setClipOrder(){edits=Film.plans(node,selected.value,state);variant=Math.min(variant,edits.length-1);clipOrder=edits[variant].segments.map(x=>x.key);}
  function playCue(c,t){if(root.ProblemsAudio)audioHandles.push(root.ProblemsAudio.clipEvent(c.key,Math.max(0,t-c.at),c.gain));}
  function fireCues(from,to){for(const c of Film.cues(edits[variant]))if(c.at>from&&c.at<=to)playCue(c,to);}
  function filmFrame(t){
   const plan=edits[variant],duration=Film.duration(plan),pos=Film.position(plan,t),source=catalog[pos.key==='other'?'cloth':pos.key];
   const picture=source?.frames[pos.frame]?.image;
   if(picture&&clipImage.getAttribute('src')!==picture)clipImage.src=picture;
   clipImage.hidden=!picture;display.dataset.phase=pos.key;display.dataset.frame=pos.frame;display.dataset.variant=variant;
   const voice=Film.cues(plan).find(c=>c.caption&&t>=c.at&&t<c.at+c.seconds);
   subtitle.textContent=voice?.caption||'';subtitle.hidden=!voice;
   const names={lead:'声音先进入',voice:'叙述者',other:'折布的动作',space:'空走廊',ranran_pause:'共同让行',ranran_junction:'路口分别'};
   status.textContent=(variant?'另一版':'主版')+' · '+Math.min(duration,t).toFixed(1)+' / '+duration.toFixed(1)+' 秒 · '+names[pos.key];
   return duration;
  }
  function stop(){playing=false;if(frame)cancelAnimationFrame(frame);frame=null;for(const handle of audioHandles)handle?.stop();audioHandles=[];remember();}
  function draw(){
   stop();caption.textContent=selected.label;
   const compareButton=player.querySelector('[data-role=alternate]');if(compareButton)compareButton.textContent=variant?'回到主版':'对照另一版';
   if(filmKinds.has(node.kind)){setClipOrder();elapsed=0;display.classList.add('clip-preview');display.replaceChildren(clipImage,subtitle);filmFrame(0);}
   else {if(!root.ProblemsObjectArt?.preview(display,node,selected.value,state,{onSound}))display.innerHTML=preview(node.kind,selected.value,selected,index,state);status.textContent='';}
  }
  node.options.forEach((opt,i)=>{
   const b=el('button','work-select',opt.label);b.setAttribute('aria-pressed',String(i===0));
   b.addEventListener('click',()=>{selected=opt;index=i;variant=0;controls.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();remember();onSound('select');});b.setAttribute('aria-pressed',String(i===index));controls.append(b);
  });
  if(filmKinds.has(node.kind)){
   const play=el('button','','播放'),pause=el('button','','暂停'),alternate=el('button','','对照另一版');
   alternate.dataset.role='alternate';
   let last=0;
   function tick(now){if(!playing)return;const before=elapsed;if(last)elapsed+=(now-last)/1000;last=now;const duration=filmFrame(elapsed);fireCues(before,elapsed);if(elapsed>=duration){elapsed=duration;stop();return;}frame=requestAnimationFrame(tick);}
   play.addEventListener('click',()=>{stop();if(elapsed>=Film.duration(edits[variant]))elapsed=0;playing=true;last=0;for(const c of Film.cues(edits[variant]))if(elapsed>=c.at&&elapsed<c.at+(c.seconds||.9))playCue(c,elapsed);frame=requestAnimationFrame(tick);onSound('play');});
   pause.addEventListener('click',()=>{stop();onSound('pause');});
   alternate.addEventListener('click',()=>{stop();variant=variant?0:1;clipOrder=edits[variant].segments.map(x=>x.key);elapsed=0;filmFrame(0);alternate.textContent=variant?'回到主版':'对照另一版';remember();onSound('preview_switch');});
   player.append(play,pause);if(node.kind!=='filmshots')player.append(alternate);
  }
  if(node.kind==='actionchain'){
   commit.textContent=round===0?'示范这一轮':round===1?'看下一人的动作':'保存这三轮的差异';
   commit.addEventListener('click',()=>{round++;if(round<3){status.textContent=round===1?'第二个人把动作缩短了一点。':'第三个人停下，没有重复完。';display.style.transform=round===1?'scale(.98)':'none';commit.textContent=round===1?'看下一人的动作':'保存这三轮的差异';remember();onSound('cloth');return;}round=2;stop();onConfirm(selected.value,{rounds:[selected.value,'changed','stopped'],completed_rounds:3});});
  }else commit.addEventListener('click',()=>{stop();const objectArt=root.ProblemsObjectArt?.artifact(node,selected.value,state);onConfirm(selected.value,{selection:selected.label,clip_order:filmKinds.has(node.kind)?edits[0].segments.map(x=>x.key):undefined,main_edit:filmKinds.has(node.kind)?edits[0]:undefined,alternate_edit:filmKinds.has(node.kind)?edits[1]:undefined,preview_kind:node.kind,render_version:filmKinds.has(node.kind)?2:1,...(objectArt?{object_art:objectArt}:{})});});
  wrap.append(display,caption,controls,player,status,commit);parent.append(wrap);draw();
  if(prior){elapsed=prior.elapsed;if(filmKinds.has(node.kind)){variant=Math.min(prior.variant||0,edits.length-1);clipOrder=edits[variant].segments.map(x=>x.key);elapsed=Math.min(elapsed,Film.duration(edits[variant]));filmFrame(elapsed);}else clipOrder=prior.clipOrder||clipOrder;}
  remember();
  // Called by the owning UI before a new node, a menu, or a hidden window.
  return {destroy:stop,pause:stop};
 }
 root.ProblemsInteractions={mount};
})(window);
