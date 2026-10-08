// D12 PLAYERS TURN v1.7.4 — restore Staff & Shifts composition + universal instant feedback

// --- Fix Staff & Shifts composition.
// A v1.6.9 override bypassed the v1.6.7 shift workspace by calling the older staff view directly.
const v174StaffBase=staffView;
const v174SettingsBase=settingsView;
const v174ShiftWorkspaceBase=v166ShiftWorkspace;

v166ShiftWorkspace=function(){
  // Keep All Staff templates out of the legacy 1-Cashier + 2-Rackmaster card renderer.
  // They remain available through the shared Saved Staff Combination loader.
  const all=data?.shift_templates;
  if(!Array.isArray(all))return v174ShiftWorkspaceBase();
  data.shift_templates=all.filter(t=>t.shift_mode!=='all_staff');
  try{return v174ShiftWorkspaceBase()}finally{data.shift_templates=all}
};

function v174CreateShiftHeader(){
  return `<section class="v174-shift-hub glass">
    <div class="v174-shift-hub-head"><div><div class="eyebrow">STAFF & SHIFTS · CREATE STAFF SHIFT</div><h2>Choose Shift Structure</h2><p>Use the standard D12 shift or activate the complete six-person operational team.</p></div><span class="glass-icon">♟</span></div>
    <div class="v174-shift-mode-grid">
      <button class="v174-shift-mode" onclick="openStandardShift174()"><i>2+1</i><div><small>STANDARD SHIFT</small><b>1 Cashier + 2 Rackmasters</b><span>2 tables per Rackmaster</span></div><em>›</em></button>
      <button class="v174-shift-mode all" onclick="openAllStaffShift174()"><i>6</i><div><small>FULL OPERATIONS</small><b>All Staff Active</b><span>2 Cashiers + 4 Rackmasters</span></div><em>›</em></button>
    </div>
  </section>`;
}
function openStandardShift174(){
  const d=$('.v166-save-template');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>d.querySelector('input')?.focus(),250)}
}
function openAllStaffShift174(){
  const cb=$('#v173EnableAllStaff');if(cb){cb.checked=true;toggleAllStaff173(true);$('#v173AllStaffPanel')?.scrollIntoView({behavior:'smooth',block:'center'})}
}

staffView=function(){
  let html=v174StaffBase();
  if(role!=='admin')return html;

  // Remove duplicate older shift fragments if present, then add the authoritative workspace once.
  const hasStandard=html.includes('v166-shift-workspace');
  const hasAllStaff=html.includes('v173-shift-card');
  const standard=hasStandard?'':v166ShiftWorkspace();
  const allStaff=hasAllStaff?'':v173AllStaffShiftSection();

  return `${v174CreateShiftHeader()}${allStaff}${html}${standard}`;
};

// All Staff Active is now part of Staff & Shifts, not Settings.
settingsView=function(){
  let html=v174SettingsBase();
  if(role!=='admin'||typeof v173AllStaffShiftSection!=='function')return html;
  const block=v173AllStaffShiftSection();
  if(block&&html.includes(block))html=html.replace(block,'');
  return html;
};

// After each Staff & Shifts render, restore selector population, dynamic names and query bars.
const v174RenderBase=renderApp;
renderApp=function(preserveFocus=false){
  v174RenderBase(preserveFocus);
  if(view==='staff'&&role==='admin'){
    setTimeout(()=>{
      if(typeof v169PopulateShiftSelectors==='function')v169PopulateShiftSelectors();
      if(typeof v170BindShiftTableLabels==='function')v170BindShiftTableLabels();
      if(typeof v1610DecorateStaffQueries==='function')v1610DecorateStaffQueries();
      v173RefreshRackLabels();
    },0);
  }
};

// --- Universal perceived-response improvement.
// No polling changes, no extra reads, no bootstrap feed and no session write.
// This only gives immediate local visual acknowledgement while existing requests run.
let v174ForegroundRequests=0;
const v174BackgroundActions=new Set([
  'bootstrap','ticket_status','public_config','admin_bootstrap','staff_list'
]);
function v174FeedbackStart(){
  v174ForegroundRequests++;
  document.documentElement.classList.add('v174-network-busy');
  let bar=$('#v174ActionBar');
  if(!bar){bar=document.createElement('div');bar.id='v174ActionBar';bar.innerHTML='<i></i>';document.body.appendChild(bar)}
  requestAnimationFrame(()=>bar.classList.add('show'));
}
function v174FeedbackEnd(ok=true){
  v174ForegroundRequests=Math.max(0,v174ForegroundRequests-1);
  if(v174ForegroundRequests)return;
  const bar=$('#v174ActionBar');if(bar){bar.classList.toggle('success',ok);bar.classList.toggle('error',!ok);setTimeout(()=>{bar.classList.remove('show','success','error')},220)}
  document.documentElement.classList.remove('v174-network-busy');
}
const v174ApiBase=api;
api=async function(url,action,payload={},auth=true){
  const foreground=!v174BackgroundActions.has(action);
  if(foreground)v174FeedbackStart();
  try{
    const result=await v174ApiBase(url,action,payload,auth);
    if(foreground)v174FeedbackEnd(true);
    return result;
  }catch(e){
    if(foreground)v174FeedbackEnd(false);
    throw e;
  }
};

// Immediate tactile/visual acknowledgement for every interactive control.
// It never invokes network or changes action timing.
document.addEventListener('pointerdown',e=>{
  const el=e.target?.closest?.('button,.btn,[role="button"],summary');
  if(!el||el.disabled)return;
  el.classList.add('v174-pressed');
  setTimeout(()=>el.classList.remove('v174-pressed'),160);
},{passive:true});
document.addEventListener('click',e=>{
  const el=e.target?.closest?.('button,.btn,[role="button"],summary');
  if(!el||el.disabled)return;
  el.classList.add('v174-ack');
  setTimeout(()=>el.classList.remove('v174-ack'),360);
},{passive:true});
