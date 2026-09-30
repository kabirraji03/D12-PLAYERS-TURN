// D12 PLAYERS TURN v1.6.4 — Players Today intelligence + queue Pass control
const V164_API='https://ydveditxorbtqufwnzpt.supabase.co/functions/v1/d12-turn-v164';
const v164=(a,p={},auth=true)=>api(V164_API,a,p,auth);
let v164Charts=[];

const v164RackBase=rackmasterView;
rackmasterView=function(){
  return `<section class="v164-players-today-launch"><button class="btn v164-players-today-btn" onclick="openPlayersToday()"><span class="v164-launch-icon">◉</span><span><small>DAILY ROOM INTELLIGENCE</small><b>Players Today</b></span><i>›</i></button></section>${v164RackBase()}`;
};

queueRow=function(q,i,tableId){
  const p=player(q.player_id),pendingVertical=(data.move_requests||[]).some(r=>r.status==='pending'&&(r.requester_queue_id===q.id||r.target_queue_id===q.id)),pendingTable=(data.table_move_requests||[]).some(r=>r.status==='pending'&&r.queue_entry_id===q.id),pendingTransfer=(data.player_transfer_requests||[]).some(r=>r.status==='pending'&&r.queue_entry_id===q.id),appeal=q.source==='appeal';
  return `<div class="queue-row ${pendingVertical||pendingTable||pendingTransfer?'pending-move':''}"><div class="queue-num">${i+1}</div>${avatar(p,'sm')}<div class="grow"><b>${esc(p.full_name)}</b><small>${payBadge(q)} ${pendingVertical?'<span class="pill pending">ORDER MOVE PENDING</span>':''}${pendingTable?'<span class="pill pending">TABLE MOVE PENDING</span>':''}${pendingTransfer?'<span class="pill pending">PLAYER TRANSFER PENDING</span>':''}</small></div><div class="queue-actions"><button class="icon-action" title="Upload photo" onclick="pickPlayerPhoto('${p.id}')">📷</button><button class="icon-action" title="Move up" onclick="requestMove('${q.id}','up')">↑</button><button class="icon-action" title="Move down" onclick="requestMove('${q.id}','down')">↓</button><button class="btn small move-table-btn" ${pendingTable?'disabled':''} onclick="openTableMoveRequest('${q.id}','${tableId}')">⇄ Table</button><button class="btn small call-btn" onclick="callPlayer('${q.id}')">🔔 Call</button><button class="btn small pass-btn" ${appeal?'disabled title="Paid appeal priority is protected"':''} onclick="passPlayer164('${q.id}','${esc(p.full_name).replaceAll("'","&#39;")}')">⏭ Pass</button><button class="btn small danger leave-arena-btn" onclick="staffLeaveArena('${q.id}','${esc(p.full_name).replaceAll("'","&#39;")}')">🚪 Leave Arena</button></div></div>`;
};

async function passPlayer164(id,name){
  if(!confirm(`Pass ${name||'this player'} and move them to the bottom of this table queue?`))return;
  try{const j=await v164('pass_player',{queue_id:id});toast(j.message||'Player moved to bottom of queue');await refresh(false)}catch(e){toast(e.message)}
}

function v164ClosePlayersToday(){
  v164Charts.forEach(c=>{try{c.destroy()}catch{}});v164Charts=[];
  $('#modalCard')?.classList.remove('v164-wide-modal');closeModal();
}
function v164TodayPlayerRow(p){
  const total=Math.max(1,p.wins+p.losses),rate=Math.round((p.wins/total)*100),member=p.status==='Subscribed Member';
  return `<article class="v164-player-row"><div class="v164-player-ident">${avatar(p,'md')}<div><b>${esc(p.full_name)}</b><small>${esc(p.player_code||'PLAYER')} · ${esc((p.tables||[]).join(', ')||'—')}</small></div></div><div class="v164-form"><div><b>${p.wins}</b><span>W</span><em>–</em><b>${p.losses}</b><span>L</span></div><div class="v164-form-meter"><i style="width:${rate}%"></i></div><small>${rate}% win rate · ${p.matches} match${p.matches===1?'':'es'}</small></div><div class="v164-cleared"><small>CLEARED BY</small><b>${esc(p.clearance||'—')}</b></div><div class="v164-appeals"><span class="v164-mini-orb">↺</span><div><b>${p.appeals}</b><small>APPEALS</small></div></div><div><span class="pill ${member?'good':''}">${member?'◆ MEMBER':'○ WALK-IN'}</span></div></article>`;
}
function v164RenderPlayersToday(d){
  const s=d.summary||{},rows=d.players||[];
  return `<div class="v164-players-today"><div class="modal-head v164-dialog-head"><div><div class="eyebrow">D12 DAILY ROOM INTELLIGENCE · ${esc(d.date||'TODAY')}</div><h2>Players Today</h2><p>Every player who entered match play today, with results, clearance, appeals and membership status.</p></div><button class="icon-btn" onclick="v164ClosePlayersToday()">×</button></div><div class="v164-today-kpis"><article class="glass"><i>♟</i><b>${s.players||0}</b><span>Players</span></article><article class="glass"><i>🎱</i><b>${s.matches||0}</b><span>Completed Matches</span></article><article class="glass"><i>●</i><b>${s.active||0}</b><span>Live Now</span></article><article class="glass"><i>↺</i><b>${s.appeals||0}</b><span>Appeals</span></article><article class="glass"><i>◆</i><b>${s.members||0}</b><span>Members</span></article><article class="glass"><i>○</i><b>${s.walkins||0}</b><span>Walk-ins</span></article></div><div class="v164-chart-grid"><section class="glass v164-chart-card"><div><div class="eyebrow">FORM BOARD</div><h3>Top Wins Today</h3></div><canvas id="v164WinsChart"></canvas></section><section class="glass v164-chart-card"><div><div class="eyebrow">PLAYER MIX</div><h3>Member vs Walk-in</h3></div><canvas id="v164MixChart"></canvas></section></div><section class="glass v164-roster-panel"><div class="v164-roster-head"><div><div class="eyebrow">TODAY'S PLAYER ROSTER</div><h3>${rows.length} player${rows.length===1?'':'s'} recorded</h3></div><div class="v164-legend"><span><i class="win"></i>Wins</span><span><i class="loss"></i>Losses</span></div></div><div class="v164-player-list">${rows.length?rows.map(v164TodayPlayerRow).join(''):'<div class="empty">No match activity has been recorded today yet.</div>'}</div></section></div>`;
}
function v164InitTodayCharts(d){
  if(typeof Chart==='undefined')return;v164Charts.forEach(c=>{try{c.destroy()}catch{}});v164Charts=[];
  const top=(d.players||[]).slice(0,8),w=$('#v164WinsChart'),m=$('#v164MixChart');
  if(w)v164Charts.push(new Chart(w,{type:'bar',data:{labels:top.map(x=>x.full_name),datasets:[{label:'Wins',data:top.map(x=>x.wins),borderWidth:1,borderRadius:12}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}}}}}));
  if(m)v164Charts.push(new Chart(m,{type:'doughnut',data:{labels:['Subscribed Members','Walk-ins'],datasets:[{data:[d.summary?.members||0,d.summary?.walkins||0],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom'}}}}));
}
async function openPlayersToday(){
  openModal(`<div class="v164-loading"><div class="v164-loader"></div><b>Loading Players Today…</b><small>Reading today’s D12 match, clearance and appeal records.</small></div>`);$('#modalCard')?.classList.add('v164-wide-modal');
  try{const d=await v164('players_today');const card=$('#modalCard');if(!card)return;card.innerHTML=v164RenderPlayersToday(d);requestAnimationFrame(()=>v164InitTodayCharts(d))}catch(e){const card=$('#modalCard');if(card)card.innerHTML=`<div class="modal-head"><div><div class="eyebrow">PLAYERS TODAY</div><h2>Could not load today’s report</h2></div><button class="icon-btn" onclick="v164ClosePlayersToday()">×</button></div><div class="notice danger-note">${esc(e.message)}</div>`}
}
