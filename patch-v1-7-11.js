// D12 PLAYERS TURN v1.7.11 — live Player Portal dialogs + immediate local move feedback
let v1711LiveDialog=null;
let v1711DialogUpdating=false;

const v1711MyTurnBase=openMyTurn172;
const v1711TodayBase=openTodayD12172;
const v1711MomentumBase=openMomentum172;
const v1711RadarBase=openMatchRadar172;
const v1711ArenaBase=openArenaPulse172;
const v1711AlertsBase=openAlerts172;
const v1711CloseModalBase=closeModal;

openMyTurn172=function(...args){v1711LiveDialog='myturn';return v1711MyTurnBase(...args)};
openTodayD12172=function(...args){v1711LiveDialog='today';return v1711TodayBase(...args)};
openMomentum172=function(...args){v1711LiveDialog='momentum';return v1711MomentumBase(...args)};
openMatchRadar172=function(...args){v1711LiveDialog='radar';return v1711RadarBase(...args)};
openArenaPulse172=function(...args){v1711LiveDialog='arena';return v1711ArenaBase(...args)};
openAlerts172=function(...args){v1711LiveDialog='alerts';return v1711AlertsBase(...args)};
closeModal=function(...args){v1711LiveDialog=null;return v1711CloseModalBase(...args)};

function v1711DialogVisible(){
  const m=$('#modal');
  return !!m&&!m.classList.contains('hidden');
}
function v1711RenderLiveDialog(){
  if(!v1711LiveDialog||!v1711DialogVisible()||v1711DialogUpdating)return;
  v1711DialogUpdating=true;
  try{
    if(v1711LiveDialog==='myturn')v1711MyTurnBase();
    else if(v1711LiveDialog==='today')v1711TodayBase();
    else if(v1711LiveDialog==='momentum')v1711MomentumBase();
    else if(v1711LiveDialog==='radar')v1711RadarBase();
    else if(v1711LiveDialog==='arena')v1711ArenaBase();
    else if(v1711LiveDialog==='alerts')v1711AlertsBase();
    const card=$('#modalCard');
    if(card){card.classList.remove('v1711-live-update');void card.offsetWidth;card.classList.add('v1711-live-update')}
  }finally{v1711DialogUpdating=false}
}

const v1711RenderPlayerBase=renderPlayer;
renderPlayer=function(d){
  const out=v1711RenderPlayerBase(d);
  v1711RenderLiveDialog();
  return out;
};

const v1711RespondMoveBase=respondMove;
respondMove=async function(id,approve){
  const d=v172PlayerData;
  const req=(d?.move_requests||[]).find(x=>x.id===id);
  if(!d||!req)return v1711RespondMoveBase(id,approve);

  const oldPosition=d.queue?.position;
  const oldRequests=[...(d.move_requests||[])];

  if(approve&&d.queue?.position){
    const delta=req.direction==='up'?1:req.direction==='down'?-1:0;
    d.queue.position=Math.max(1,Number(d.queue.position)+delta);
    if(d.queue.estimated_wait_minutes!=null){
      const mins=Number(d.table_state?.avg_match_minutes||12);
      d.queue.estimated_wait_minutes=Math.max(0,(Number(d.queue.position)-1)*mins);
    }
  }
  d.move_requests=(d.move_requests||[]).filter(x=>x.id!==id);
  v1711RenderLiveDialog();

  try{
    await ticketApi('respond_move',{ticket:ticketParam,request_id:id,approve});
    toast(approve?'Queue exchange approved':'Queue exchange declined');
  }catch(e){
    if(d.queue)d.queue.position=oldPosition;
    d.move_requests=oldRequests;
    v1711RenderLiveDialog();
    toast(e.message);
  }
};

const v1711OpenTransferBase=openPlayerTableMoveFromData;
openPlayerTableMoveFromData=function(){
  const open=(window.__d12PlayerTableSummaries||[]).filter(x=>x.operational_status==='open');
  if(!open.length)return toast('No other open table is available.');
  v1711LiveDialog=null;
  openModal(`<div class="modal-head"><div><div class="eyebrow">PLAYER TABLE MOVE</div><h2>Select New Table</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="notice">Your current Rackmaster must approve your exit and the incoming Rackmaster must approve your entry. You stay in your current queue until both approve.</div>
    <form id="playerTransferForm" class="stack"><div class="field"><label>MOVE TO TABLE</label><select name="target_table_id" class="v161-contrast-select">${open.map(x=>`<option value="${x.id}">${esc(x.table_name)} · ${x.queue_count} in line · ~${x.estimated_wait_minutes} min</option>`).join('')}</select></div><button class="btn primary block">Send Move Request</button></form>`);
  $('#playerTransferForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const form=e.currentTarget,btn=form.querySelector('button[type="submit"],button:not([type])'),f=new FormData(form),target=String(f.get('target_table_id')||'');
    if(btn){btn.disabled=true;btn.textContent='Sending…'}
    try{
      const j=await ticketApi('request_table_transfer',{ticket:ticketParam,target_table_id:target});
      if(v172PlayerData&&j.request){
        v172PlayerData.transfer_requests=[j.request,...(v172PlayerData.transfer_requests||[]).filter(x=>x.id!==j.request.id)];
      }
      closeModal();
      toast(j.message);
      openMyTurn172();
    }catch(x){
      if(btn){btn.disabled=false;btn.textContent='Send Move Request'}
      toast(x.message);
    }
  });
};
