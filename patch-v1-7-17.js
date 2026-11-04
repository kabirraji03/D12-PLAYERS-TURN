// D12 PLAYERS TURN v1.7.17 — Admin-only Players Today + fitted report dialog
// UI/access correction only. No polling, bootstrap, refresh or operational logic changes.

function v177StripPlayersTodayFromRack(html){
  const t=document.createElement('template');
  t.innerHTML=String(html||'');
  t.content.querySelectorAll('[onclick*="openPlayersToday"]').forEach(el=>{
    const legacy=el.closest('.v164-players-today-launch');
    if(legacy)legacy.remove();
    else el.remove();
  });
  t.content.querySelectorAll('.v164-players-today-launch').forEach(el=>el.remove());
  return t.innerHTML;
}

const v177RackmasterViewBase=rackmasterView;
rackmasterView=function(){
  return v177StripPlayersTodayFromRack(v177RackmasterViewBase());
};

function v177EnforceRackmasterUI(){
  if(view!=='rackmaster')return;
  document.querySelectorAll('[onclick*="openPlayersToday"]').forEach(el=>{
    const legacy=el.closest('.v164-players-today-launch');
    if(legacy)legacy.remove();
    else el.remove();
  });
  document.querySelectorAll('.v164-players-today-launch').forEach(el=>el.remove());
}

const v177RenderAppBase=renderApp;
renderApp=function(preserveFocus=false){
  const out=v177RenderAppBase(preserveFocus);
  v177EnforceRackmasterUI();
  return out;
};

const v177OpenPlayersTodayBase=openPlayersToday;
openPlayersToday=async function(){
  if(role!=='admin')return toast('Players Today is available to Admin only.');
  const p=v177OpenPlayersTodayBase();
  const card=$('#modalCard');
  if(card){
    card.classList.add('v177-players-today-modal');
    card.setAttribute('data-admin-only','players-today');
  }
  try{return await p}
  finally{
    const live=$('#modalCard');
    if(live&&!$('#modal')?.classList.contains('hidden'))live.classList.add('v177-players-today-modal');
  }
};


const v177ClosePlayersTodayBase=v164ClosePlayersToday;
v164ClosePlayersToday=function(){
  $('#modalCard')?.classList.remove('v177-players-today-modal');
  return v177ClosePlayersTodayBase();
};
