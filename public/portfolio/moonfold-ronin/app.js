"use strict";
const scenes=[
{jp:"初折",kr:"첫 접음",act:"ACT I",actName:"THE ECLIPSE",title:"The First Fold",line:"Moonfold Valley — the morning before the eclipse.",accent:"#d15a45",side:"left"},
{jp:"千羽",kr:"천 마리",act:"ACT I",actName:"THE ECLIPSE",title:"A Thousand Folds",line:"The Festival of a Thousand Folds.",accent:"#dc8f58",side:"right"},
{jp:"黒蝕",kr:"검은 식",act:"ACT I",actName:"THE ECLIPSE",title:"The Black Eclipse",line:"The sky tore open.",accent:"#d13f35",side:"left"},
{jp:"盗月",kr:"훔친 달",act:"ACT I",actName:"THE ECLIPSE",title:"The Stolen Moon",line:"The moon was taken.",accent:"#b7463d",side:"right"},
{jp:"赤紐",kr:"붉은 끈",act:"ACT I",actName:"THE ECLIPSE",title:"The Red Cord",line:"Ren: “I will bring back the dawn.”",accent:"#c95543",side:"left"},
{jp:"鵲",kr:"까치",act:"ACT II",actName:"THE ROAD",title:"The Magpie Thief",line:"A thief with wings.",accent:"#5b9f8d",side:"right"},
{jp:"墨川",kr:"먹물 강",act:"ACT II",actName:"THE ROAD",title:"The River Remembers",line:"The river remembers every path.",accent:"#5f899f",side:"left"},
{jp:"白虎",kr:"백호",act:"ACT II",actName:"THE ROAD",title:"The White Tiger",line:"Strength is not the same as force.",accent:"#d8b269",side:"right"},
{jp:"北峠",kr:"북쪽 고개",act:"ACT II",actName:"THE ROAD",title:"Wolves of the North Pass",line:"The North Pass.",accent:"#8aa3b7",side:"left"},
{jp:"紙海",kr:"종이 바다",act:"ACT II",actName:"THE ROAD",title:"The Sea of Paper",line:"The East Sea.",accent:"#4f85ad",side:"right"},
{jp:"灯都",kr:"등불 도시",act:"ACT III",actName:"THE SHADOW",title:"Lantern City",line:"Beneath the Regent’s palace.",accent:"#d4854f",side:"left"},
{jp:"墨王",kr:"먹의 군주",act:"ACT III",actName:"THE SHADOW",title:"The Ink Regent",line:"The one who stole the moon.",accent:"#c9a66a",side:"right"},
{jp:"地下都",kr:"지하 도시",act:"ACT III",actName:"THE SHADOW",title:"The City Beneath",line:"He stole the moon to hold up a dying city.",accent:"#c98b5f",side:"left"},
{jp:"影宮",kr:"그림자 궁",act:"ACT III",actName:"THE SHADOW",title:"Folded Shadows",line:"One chance.",accent:"#7191a8",side:"right"},
{jp:"月橋",kr:"달의 다리",act:"ACT IV",actName:"THE BROTHERS",title:"The Moon Bridge",line:"Neither brother would yield.",accent:"#a8b3ca",side:"left"},
{jp:"仮面",kr:"가면 아래",act:"ACT IV",actName:"THE BROTHERS",title:"Beneath the Mask",line:"Ren: “Jin…”",accent:"#d5bf91",side:"right"},
{jp:"裂龍",kr:"균열의 용",act:"ACT IV",actName:"THE BROTHERS",title:"The Dragon in the Crack",line:"The seal breaks.",accent:"#da493b",side:"left"},
{jp:"最終折",kr:"마지막 접기",act:"ACT IV",actName:"THE BROTHERS",title:"The Last Fold",line:"One final fold.",accent:"#db9c55",side:"right"},
{jp:"暁鶴",kr:"새벽의 학",act:"ACT V",actName:"DAWN",title:"The Crane of Dawn",line:"Dawn takes wing.",accent:"#e6bc6c",side:"left"},
{jp:"帰郷",kr:"귀향",act:"ACT V",actName:"DAWN",title:"Home Through the Gate",line:"Home, remade.",accent:"#d97658",side:"right"}
].map((scene,index)=>({...scene,image:`assets/scene-${String(index+1).padStart(2,"0")}.jpg`,video:`assets/scene-${String(index+1).padStart(2,"0")}.mp4`}));
const $=selector=>document.querySelector(selector),clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
const smooth=(from,to,value)=>{const t=clamp((value-from)/(to-from));return t*t*(3-2*t)};
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const stage=$("#stage"),stack=$("#mediaStack"),story=$("#story"),rail=$("#chapterRail"),copy=$("#sceneCopy"),intro=$("#intro"),ending=$("#ending"),hint=$("#scrollHint"),boot=$("#boot"),foldFx=$("#foldFx"),pageProgress=$("#pageProgress"),sceneBar=$("#sceneBar");
const fields={number:$("#sceneNumber"),act:$("#sceneAct"),jp:$("#sceneJp"),kr:$("#sceneKr"),title:$("#sceneTitle"),line:$("#sceneLine"),time:$("#sceneTime"),topAct:$("#topAct"),topCount:$("#topCount")};
let sections=[],states=[],buttons=[],geometry=[],active=-1,dirty=true,bootHidden=false,lastY=scrollY,lastRender=performance.now(),unloadTimer=0;
function hideBoot(){if(bootHidden)return;bootHidden=true;boot.classList.add("is-hidden")}
function formatTime(seconds){const whole=Math.max(0,Math.min(8,Math.floor(seconds)));return `00:${String(whole).padStart(2,"0")}`}
scenes.forEach((scene,index)=>{
  const layer=document.createElement("div");layer.className="media-layer";layer.setAttribute("aria-hidden","true");
  const image=document.createElement("img");image.className="poster";image.src=scene.image;image.alt="";image.decoding="async";image.loading=index<3?"eager":"lazy";
  const video=document.createElement("video");video.dataset.src=scene.video;video.poster=scene.image;video.preload="none";video.muted=true;video.defaultMuted=true;video.playsInline=true;video.disablePictureInPicture=true;video.tabIndex=-1;video.setAttribute("muted","");video.setAttribute("playsinline","");
  layer.append(image,video);stack.append(layer);
  const state={layer,image,video,loaded:false,ready:false,duration:8,target:.001,lastSeek:0};states.push(state);
  video.addEventListener("loadedmetadata",()=>{state.duration=Number.isFinite(video.duration)?video.duration:8;dirty=true});
  video.addEventListener("loadeddata",()=>{state.ready=true;layer.classList.add("is-ready");dirty=true});
  video.addEventListener("seeked",()=>{dirty=true});video.addEventListener("error",()=>{layer.classList.add("video-failed")});
  if(index===0)image.decode?.().then(hideBoot).catch(hideBoot);
  const section=document.createElement("section");section.className="chapter";section.id=`scene-${index+1}`;section.setAttribute("aria-label",`${scene.title}: ${scene.line}`);story.append(section);sections.push(section);
  const button=document.createElement("button");button.type="button";button.dataset.label=String(index+1).padStart(2,"0");button.setAttribute("aria-label",`Go to chapter ${index+1}: ${scene.title}`);button.addEventListener("click",()=>goTo(index));rail.append(button);buttons.push(button);
});
const tail=document.createElement("div");tail.className="tail";tail.setAttribute("aria-hidden","true");story.append(tail);
function loadVideo(index){const state=states[index];if(!state||state.loaded||reduced)return;state.loaded=true;state.ready=false;state.layer.classList.remove("video-failed");state.video.src=state.video.dataset.src;state.video.preload="auto";try{state.video.load()}catch{}}
function unloadVideo(index){const state=states[index];if(!state||!state.loaded||Math.abs(index-active)<=2)return;state.loaded=false;state.ready=false;state.layer.classList.remove("is-ready");state.video.pause();state.video.removeAttribute("src");try{state.video.load()}catch{}}
function maintainWindow(index){loadVideo(index);loadVideo(index-1);loadVideo(index+1);loadVideo(index+2);clearTimeout(unloadTimer);unloadTimer=setTimeout(()=>states.forEach((_,i)=>unloadVideo(i)),1100)}
function measure(){geometry=sections.map(section=>({top:section.offsetTop,height:section.offsetHeight}));dirty=true}
function goTo(index){if(!geometry.length)measure();const item=geometry[clamp(index,0,scenes.length-1)];if(!item)return;scrollTo({top:item.top+item.height*.08,behavior:reduced?"auto":"smooth"})}
function setScene(index){
  const scene=scenes[index];active=index;stage.dataset.scene=String(index+1);stage.style.setProperty("--accent",scene.accent);copy.classList.toggle("is-right",scene.side==="right");
  fields.number.textContent=String(index+1).padStart(2,"0");fields.act.textContent=`${scene.act} · ${scene.actName}`;fields.jp.textContent=scene.jp;fields.kr.textContent=scene.kr;fields.title.textContent=scene.title;fields.line.textContent=scene.line;fields.topAct.textContent=`${scene.act} · ${scene.actName}`;fields.topCount.textContent=`${String(index+1).padStart(2,"0")} / 20`;
  buttons.forEach((button,i)=>{button.classList.toggle("is-active",i===index);if(i===index)button.setAttribute("aria-current","step");else button.removeAttribute("aria-current")});
  document.title=`${String(index+1).padStart(2,"0")} — ${scene.title} | The Moonfold Ronin`;maintainWindow(index);
  copy.animate?.([{filter:"blur(7px)",opacity:.35},{filter:"blur(0)",opacity:1}],{duration:430,easing:"cubic-bezier(.22,1,.36,1)"});
}
function seekFrame(state,target,now,velocity){
  state.target=target;if(reduced||!state.ready||state.video.readyState<1)return;
  const max=Math.max(.001,state.duration-.035),wanted=clamp(target,.001,max),delta=wanted-state.video.currentTime;
  if(Math.abs(delta)<.026)return;const interval=velocity>1.3?28:42;if(now-state.lastSeek<interval||state.video.seeking)return;
  try{state.video.currentTime=wanted;state.lastSeek=now}catch{}
}
function render(now=performance.now()){
  if(!geometry.length)return;const y=scrollY;let index=0;for(let i=geometry.length-1;i>=0;i--){if(y>=geometry[i].top-1){index=i;break}}index=Math.min(index,scenes.length-1);
  const item=geometry[index],local=clamp((y-item.top)/item.height),blend=index<scenes.length-1?smooth(.835,1,local):0,dt=Math.max(16,now-lastRender),velocity=Math.abs(y-lastY)/dt;lastY=y;lastRender=now;
  if(active!==index)setScene(index);
  states.forEach((state,i)=>{let opacity=0,z=0,scale=1.018;if(i===index){opacity=1;z=2;scale=1.006+local*.014}else if(i===index+1){opacity=blend;z=3;scale=1.028-blend*.022}state.layer.style.opacity=opacity.toFixed(4);state.layer.style.zIndex=String(z);state.layer.style.transform=`scale(${scale.toFixed(4)})`});
  const progress=clamp((local-.028)/.9),current=states[index];seekFrame(current,progress*Math.max(.001,current.duration-.04),now,velocity);if(states[index+1]&&blend>.06)seekFrame(states[index+1],.001,now,velocity);
  const introAmount=index===0?1-smooth(.025,.19,local):0;intro.style.opacity=introAmount.toFixed(3);intro.style.transform=`translate(-50%,calc(-46% - ${Math.round(local*24)}px)) scale(${(1+local*.025).toFixed(4)})`;
  const copyIn=index===0?smooth(.15,.245,local):smooth(.025,.095,local),copyOut=index===scenes.length-1?1-smooth(.64,.78,local):1-smooth(.69,.83,local),copyAmount=copyIn*copyOut;copy.style.opacity=copyAmount.toFixed(3);copy.style.transform=`translateY(${((1-copyAmount)*18).toFixed(2)}px) scale(${(.994+copyAmount*.006).toFixed(4)})`;
  const endAmount=index===scenes.length-1?smooth(.73,.94,local):0;ending.style.opacity=endAmount.toFixed(3);ending.style.transform=`translate(-50%,calc(-45% + ${((1-endAmount)*24).toFixed(1)}px))`;ending.style.pointerEvents=endAmount>.75?"auto":"none";
  const hintAmount=index===0?1-smooth(.015,.12,local):0;hint.style.opacity=hintAmount.toFixed(3);const fold=Math.sin(blend*Math.PI);stage.style.setProperty("--fold",fold.toFixed(4));foldFx.style.visibility=fold>.008?"visible":"hidden";
  fields.time.textContent=formatTime(progress*8);sceneBar.style.transform=`scaleX(${progress.toFixed(4)})`;const maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight);pageProgress.style.transform=`scaleX(${clamp(y/maxScroll).toFixed(5)})`;
}
function needsWork(){const state=states[Math.max(0,active)];return !!state&&state.ready&&Math.abs(state.video.currentTime-state.target)>.035}
function animationLoop(now){if(dirty||needsWork()){dirty=false;render(now)}requestAnimationFrame(animationLoop)}
addEventListener("scroll",()=>{dirty=true},{passive:true});addEventListener("resize",()=>{measure();dirty=true},{passive:true});addEventListener("orientationchange",()=>setTimeout(measure,120),{passive:true});
addEventListener("keydown",event=>{if(event.target?.matches("input,textarea,select,[contenteditable]"))return;let target=null;if(["ArrowDown","PageDown"].includes(event.key))target=Math.min(19,Math.max(0,active)+1);if(["ArrowUp","PageUp"].includes(event.key))target=Math.max(0,active-1);if(event.key==="Home")target=0;if(event.key==="End")target=19;if(target!==null){event.preventDefault();goTo(target)}});
$("#replay").addEventListener("click",()=>scrollTo({top:0,behavior:reduced?"auto":"smooth"}));
document.addEventListener("visibilitychange",()=>{states.forEach(state=>state.video.pause());dirty=true});
document.fonts?.ready.then(measure);measure();setScene(0);loadVideo(0);loadVideo(1);requestAnimationFrame(animationLoop);setTimeout(hideBoot,2300);
const params=new URLSearchParams(location.search);addEventListener("load",()=>{measure();const requested=Number(params.get("scene")),fraction=clamp(Number(params.get("progress")||.34));if(requested>=1&&requested<=20)setTimeout(()=>{const item=geometry[requested-1];scrollTo(0,item.top+item.height*fraction);dirty=true},260);else dirty=true},{once:true});
