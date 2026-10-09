/* The same deterministic engine runs in the browser and the acceptance harness. */
(function(root){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const fail=s=>{throw new Error(s);};
 const Film=typeof module!=='undefined'&&module.exports?require('./film.js'):root.ProblemsFilm;
 // The working draft kept stable IDs but moved this one line across seven lines.
 // Read history (not `seen`, which survives rewind) distinguishes both draft-2 graphs.
 const KELLY_REVISION='v5-story-draft-3-kelly-door';
 const KELLY_OLD_REVISION='v5-story-draft-2';
 const KELLY_CLOSE='k-door.k-door.stay.line.c218d0658b9b';
 const KELLY_COMMON=[
  'k-door.k-door.line.83d8bfb9bb39','k-door.k-door.line.dfd7ecebf4ac',
  'k-door.k-door.line.d1accd810675','k-door.k-door.line.58c603a32c31',
  'k-door.k-door.line.7c375d09aab5','k-door.k-door.line.87e386401f9f',
  'k-door.k-door.line.3438008b64cc'
 ];
 const KELLY_PENDING='kelly_door_closed_read';
 const rewindFields=['cursor','scene','background','vars','progress','stack','artifacts','inspected','page','finished','visited'];
 const validRewind=(f,nodes,max)=>f&&rewindFields.every(k=>own(f,k))&&
  ['choice','offer'].includes(nodes[f.cursor]?.type)&&Number.isInteger(f.history_length)&&f.history_length>=0&&f.history_length<=max;
 function migrateKellyBeat(s,nodes){
  if(s.vars.k_time!=='stay')return;
  const closes=s.history.map((h,i)=>h.node===KELLY_CLOSE?i:-1).filter(i=>i>=0);
  const common=s.history.filter(h=>KELLY_COMMON.includes(h.node));
  const closed=closes[0],first=s.history.findIndex(h=>h.node===KELLY_COMMON[0]);
  const last=s.history.findIndex(h=>h.node===KELLY_COMMON.at(-1));
  if(closes.length>1||common.some((h,i)=>h.node!==KELLY_COMMON[i])||common.length>KELLY_COMMON.length||
     (closed!==undefined&&s.history[closed].text!==nodes[KELLY_CLOSE].text))
   fail('Kelly门口这段旧进度的顺序无法识别，请保留原文件。');
  if(closed!==undefined&&common.length===KELLY_COMMON.length&&
     (KELLY_COMMON.includes(s.cursor)||s.cursor===KELLY_CLOSE))
   fail('Kelly门口这段旧进度的阅读位置无法识别，请保留原文件。');
  const alreadyCorrect=closes.length===1&&last>=0&&closed>last;
  if(alreadyCorrect){
   if(closed!==last+1)fail('Kelly门口这段旧进度的顺序无法识别，请保留原文件。');
   return;
  }
  if(closed!==undefined){
   // Only the authored old sequence is eligible; never repair arbitrary history.
   if(first>=0&&closed>first)
    fail('Kelly门口这段旧进度的顺序无法识别，请保留原文件。');
   const line=s.history.splice(closed,1)[0];
   if(common.length===KELLY_COMMON.length){
    const after=s.history.findIndex(h=>h.node===KELLY_COMMON.at(-1));
    s.history.splice(after+1,0,line);
   }else{
    if(s.scene!=='k-door'||s.cursor!==KELLY_COMMON[common.length])
     fail('Kelly门口这段旧进度的阅读位置无法识别，请保留原文件。');
    // Keep the unread cursor and page. Restore this already read closure to history
    // when the remaining exchange ends, without showing or sounding it twice.
    s.continuity[KELLY_PENDING]=true;
   }
  }else if(s.cursor===KELLY_CLOSE&&!common.length){
   // A line is committed to history only by advance; a partial page is unread.
   s.cursor=KELLY_COMMON[0];s.page=0;
  }
 }
 function migrateKellySave(s,nodes){
  const history=copy(s.history);
  migrateKellyBeat(s,nodes);
  for(const f of s.rewind){
   if(!validRewind(f,nodes,history.length))
    fail('重选位置损坏。');
   const candidate={...s,...f,history:history.slice(0,f.history_length),continuity:copy(f.continuity||{})};
   migrateKellyBeat(candidate,nodes);
   if(JSON.stringify(candidate.history)!==JSON.stringify(s.history.slice(0,candidate.history.length)))
    fail('Kelly门口这段旧进度的重选记录无法对应，请保留原文件。');
   f.cursor=candidate.cursor;f.page=candidate.page;
   f.continuity=candidate.continuity;f.history_length=candidate.history.length;
  }
  s.story_revision=KELLY_REVISION;
 }
 class Journey{
  constructor(story,saved){
   this.story=story;
   this.options=Object.create(null);
   Object.values(story.nodes).filter(n=>n.type==='choice').forEach(n=>this.options[n.key]=n.options.map(o=>o.value));
   this.state=saved?this.validate(saved):this.fresh();
   this.settle();
  }
  fresh(){return {schema_version:5,story_revision:this.story.story_revision,cursor:this.story.entry,
   scene:'d-gate',background:null,vars:{},progress:{},stack:[],artifacts:{},inspected:{},drafts:{},
   seen:[],visited:[],history:[],rewind:[],audio_events:[],continuity:{},page:0,finished:false,updated_at:new Date().toISOString()};}
  validate(raw){
   if(!raw||raw.schema_version!==5)fail('这份进度属于其他版本。旧版进度已保留，新版需要从头开始。');
   const s=copy(raw), nodes=this.story.nodes;
   const migrate=s.story_revision===KELLY_OLD_REVISION&&this.story.story_revision===KELLY_REVISION;
   if(s.story_revision!==this.story.story_revision&&!migrate)fail('游戏内容版本不同。请保留这份进度，使用原版本读取。');
   const presentable=new Set(['line','choice','inspect','offer','finish']);
   const backgrounds=new Set([...Object.values(this.story.scenes).map(n=>n.background),...Object.values(nodes).filter(n=>n.type==='background').map(n=>n.asset)]);
   const finiteData=(x,depth=0)=>{
    if(depth>8)return false;
    if(x===null||typeof x==='boolean')return true;
    if(typeof x==='number')return Number.isFinite(x);
    if(typeof x==='string')return x.length<=4000;
    if(Array.isArray(x))return x.length<=100&&x.every(v=>finiteData(v,depth+1));
    return x&&typeof x==='object'&&Object.keys(x).length<=100&&Object.entries(x).every(([k,v])=>!['__proto__','prototype','constructor'].includes(k)&&finiteData(v,depth+1));
   };
   s.drafts=s.drafts||{};
   s.audio_events=s.audio_events||[];
   s.continuity=s.continuity||{};
   if(typeof s.continuity!=='object'||Array.isArray(s.continuity)||
      Object.entries(s.continuity).some(([k,v])=>k!==KELLY_PENDING||v!==true)||
      (migrate&&Object.keys(s.continuity).length))fail('旧进度的连续阅读标记损坏。');
   if(!Array.isArray(s.audio_events)||s.audio_events.length>10000||s.audio_events.some(id=>typeof id!=='string'||!own(nodes,id)))fail('声音事件位置无法识别。');
   if(typeof s.cursor!=='string'||!own(nodes,s.cursor))fail('保存的位置无法识别，请使用同一版游戏导出的进度。');
   // Earlier v5 working saves could retain the side's scene at a parent offer.
   // Accept only that known return shape; other scene/cursor mismatches fail.
   if(nodes[s.cursor].type==='offer'&&s.scene!==nodes[s.cursor].scene){
    const route=this.story.scenes[s.scene]?.route?.replace(/-late$/,'');
    if(own(this.story.routes,route)&&[1,2].includes(s.progress?.[route])&&s.visited?.includes(nodes[s.cursor].scene)){
     s.scene=nodes[s.cursor].scene;s.background=null;
    }
   }
   if(!own(this.story.scenes,s.scene)||typeof s.finished!=='boolean'||nodes[s.cursor].scene!==s.scene||!presentable.has(nodes[s.cursor].type)||s.finished!==(nodes[s.cursor].type==='finish'))fail('进度中的场景不完整。');
   for(const name of ['vars','progress','artifacts','inspected','drafts'])
    if(!s[name]||typeof s[name]!=='object'||Array.isArray(s[name]))fail('进度缺少必要内容。');
   for(const [k,v] of Object.entries(s.vars))if(!own(this.options,k)||!this.options[k].includes(v))fail('进度含有无法识别的选择。');
   for(const [k,v] of Object.entries(s.progress))if(!own(this.story.routes,k)||![1,2].includes(v))fail('人物故事进度无法识别。');
   for(const [name,max] of [['stack',12],['seen',10000],['visited',200],['history',10000],['rewind',10]])
    if(!Array.isArray(s[name])||s[name].length>max)fail('进度格式或体积不正确。');
   for(const f of s.stack)if(!f||!own(this.story.routes,f.side)||!own(nodes,f.return_to)||typeof f.late_after!=='boolean')fail('人物故事返回位置损坏。');
   if(s.seen.some(id=>!own(nodes,id))||s.visited.some(id=>!own(this.story.scenes,id)))fail('进度中的已读位置无法识别。');
   if(s.history.some(h=>!h||typeof h.text!=='string'||h.text.length>4000||!own(nodes,h.node)||nodes[h.node].scene!==h.scene||!['line','action'].includes(h.kind)||nodes[h.node].type!==(h.kind==='line'?'line':'choice')||h.speaker!==(h.kind==='line'?nodes[h.node].speaker:'')))fail('回看记录无法读取。');
   if(!Number.isInteger(s.page)||s.page<0||s.page>100)fail('正文阅读位置无法识别。');
   if(s.background!==null&&!backgrounds.has(s.background))fail('场景状态无法识别。');
   for(const [key,a] of Object.entries(s.artifacts)){
    const n=nodes[a?.node];
    if(!n||n.type!=='choice'||n.key!==key||a.scene!==n.scene||a.kind!==n.kind||!n.options.some(o=>o.value===a.value)||s.vars[key]!==a.value||!a.output||Array.isArray(a.output)||typeof a.output!=='object'||!finiteData(a.output))fail('已经完成的操作结果损坏。');
    if(a.output.render_version===2&&['filmtrim','filmshots','filmcompare','soundcut','filmplay'].includes(n.kind)){
     if(!Film.valid(a.output.main_edit)||(n.kind!=='filmshots'&&!Film.valid(a.output.alternate_edit)))fail('已保存的剪辑版本损坏。');
    }
   }
   if(Object.keys(s.vars).some(k=>!own(s.artifacts,k)))fail('选择缺少已完成的操作结果。');
   for(const [id,keys] of Object.entries(s.inspected)){
    const n=nodes[id];if(!n||n.type!=='inspect'||!Array.isArray(keys)||keys.length>n.objects.length||new Set(keys).size!==keys.length||keys.some(k=>!n.objects.some(o=>o.key===k)))fail('查看过的内容无法识别。');
   }
   for(const [id,d] of Object.entries(s.drafts)){
    const n=nodes[id];
    if(!n||n.type!=='choice'||!d||!n.options.some(o=>o.value===d.value)||!Number.isInteger(d.round)||d.round<0||d.round>2||!Number.isFinite(d.elapsed)||d.elapsed<0||d.elapsed>20)fail('未完成操作的进度损坏。');
    if(d.clipOrder&&(!Array.isArray(d.clipOrder)||d.clipOrder.length>3||new Set(d.clipOrder).size!==d.clipOrder.length||d.clipOrder.some(x=>!['voice','other','space','group','hands','whole','pair','window','ranran_pause','ranran_junction'].includes(x))))fail('试片的播放顺序损坏。');
    if(d.variant!==undefined&&![0,1].includes(d.variant))fail('试片版本损坏。');
   }
   if(migrate)migrateKellySave(s,nodes);
   if(s.continuity[KELLY_PENDING]&&
      (this.story.story_revision!==KELLY_REVISION||s.vars.k_time!=='stay'||s.scene!=='k-door'||
       !KELLY_COMMON.includes(s.cursor)||!s.seen.includes(KELLY_CLOSE)||
       s.history.some(h=>h.node===KELLY_CLOSE)||
       JSON.stringify(s.history.filter(h=>KELLY_COMMON.includes(h.node)).map(h=>h.node))!==
        JSON.stringify(KELLY_COMMON.slice(0,KELLY_COMMON.indexOf(s.cursor)))))fail('旧进度的连续阅读位置损坏。');
   for(const f of s.rewind){
    if(!validRewind(f,nodes,s.history.length))fail('重选位置损坏。');
    const candidate={...s,...f,continuity:f.continuity||{},history:s.history.slice(0,f.history_length),rewind:[]};
    delete candidate.history_length;this.validate(candidate);
   }
   // Text edits are allowed to fall back only within the same semantic beat.
   if(s.story_revision!==this.story.story_revision)fail('游戏内容版本不同。请保留这份进度，使用原版本读取。');
   return s;
  }
  current(){return this.story.nodes[this.state.cursor];}
  touch(){this.state.updated_at=new Date().toISOString();}
  jump(id){if(!id||!own(this.story.nodes,id))fail('故事连接暂时无法继续。');this.state.cursor=id;this.state.page=0;}
  settle(){
   const s=this.state;
   for(let i=0;i<500;i++){
    const n=this.current();if(!n)fail('故事位置无法读取。');
    if(n.type!=='scene'&&s.scene!==n.scene){s.scene=n.scene;s.background=null;if(!s.visited.includes(n.scene))s.visited.push(n.scene);}
    switch(n.type){
     case 'scene':s.scene=n.scene;s.background=null;if(!s.visited.includes(n.scene))s.visited.push(n.scene);this.jump(n.next);break;
     case 'conditional':this.jump(n.branches[s.vars[n.key]]||n.next);break;
     case 'transition':this.jump(n.target);break;
     case 'background':s.background=n.asset;this.jump(n.next);break;
     case 'return':{
      const f=s.stack[s.stack.length-1];if(!f)fail('人物故事缺少返回位置。');
      const complete=n.stage==='complete';s.progress[f.side]=complete?2:1;
      if(!complete&&f.late_after){f.late_after=false;this.jump(this.story.routes[f.side].late);}
      else{s.stack.pop();this.jump(f.return_to);}break;
     }
     case 'offer':{
      const side=n.route.replace(/-late$/,'');const late=n.route.endsWith('-late');
      if(s.progress[side]===2||(!late&&s.progress[side]>=1)){this.jump(n.next);break;}
      return n;
     }
     case 'finish':s.finished=true;return n;
     case 'line':
      if(n.id===KELLY_CLOSE&&s.continuity[KELLY_PENDING]){
       s.history.push({scene:n.scene,speaker:n.speaker,text:n.text,kind:'line',node:n.id});
       delete s.continuity[KELLY_PENDING];this.jump(n.next);break;
      }
      return n;
     case 'choice':case 'inspect':return n;
     default:fail('这一段的操作暂时无法识别。');
    }
   }fail('故事连接需要检查，请保存当前进度。');
  }
  snapshot(){
   const s=this.state;
   return copy({cursor:s.cursor,scene:s.scene,background:s.background,vars:s.vars,progress:s.progress,
    stack:s.stack,artifacts:s.artifacts,inspected:s.inspected,drafts:s.drafts,page:s.page,finished:s.finished,
    history_length:s.history.length,visited:s.visited,audio_events:s.audio_events,continuity:s.continuity});
  }
  markDecision(){this.state.rewind.push(this.snapshot());if(this.state.rewind.length>10)this.state.rewind.shift();}
  choose(expected,value,artifact){
   const n=this.current();if(n.id!==expected||n.type!=='choice')return false;
   if(!n.options.some(o=>o.value===value))return false;
   this.markDecision();this.state.vars[n.key]=value;
   this.state.artifacts[n.key]=copy({kind:n.kind,value,scene:n.scene,node:n.id,output:artifact||{},at:new Date().toISOString()});
   this.state.history.push({scene:n.scene,speaker:'',text:n.options.find(o=>o.value===value).label,kind:'action',node:n.id});
   this.jump(n.next);this.settle();this.touch();return true;
  }
  offer(expected,take){
   const n=this.current();if(n.id!==expected||n.type!=='offer')return false;
   this.markDecision();const side=n.route.replace(/-late$/,'');const late=n.route.endsWith('-late');
   if(take){
    const status=this.state.progress[side]||0;
    this.state.stack.push({side,return_to:n.target,late_after:late&&status===0});
    this.jump(this.story.routes[side][late&&status>=1?'late':'early']);
   }else this.jump(n.next);
   this.settle();this.touch();return true;
  }
  observe(expected,key){
   const n=this.current();if(n.id!==expected||n.type!=='inspect')return null;
   const o=n.objects.find(o=>o.key===key);if(!o)return null;
   const a=this.state.inspected[n.id]||[];if(!a.includes(key))a.push(key);this.state.inspected[n.id]=a;this.touch();return o.text;
  }
  advance(expected){
   const n=this.current();if(n.id!==expected||!['line','inspect'].includes(n.type))return false;
   if(n.type==='line'){
    if(!this.state.seen.includes(n.id))this.state.seen.push(n.id);
    this.state.history.push({scene:n.scene,speaker:n.speaker,text:n.text,kind:'line',node:n.id});
   }
   this.jump(n.next);this.settle();this.touch();return true;
  }
  rewind(){
   const f=this.state.rewind[this.state.rewind.length-1];if(!f)return false;
   // Validate a reconstructed state before touching current progress.
   const reconstructed={...copy(this.state),...copy(f),continuity:copy(f.continuity||{}),history:this.state.history.slice(0,f.history_length),rewind:copy(this.state.rewind.slice(0,-1))};
   delete reconstructed.history_length;this.state=this.validate(reconstructed);this.touch();return true;
  }
  export(){return copy(this.state);}
 }
 const api={Journey,copy};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProblemsCore=api;
})(typeof window!=='undefined'?window:globalThis);
