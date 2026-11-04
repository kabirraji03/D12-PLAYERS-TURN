// D12 PLAYERS TURN v1.7.16 — cashier reports, admin intelligence, safe queue undo/redo

// ---------- CASHIER DAILY REPORT ----------
function v176Num(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,n):0}
function v176Day(){return typeof v174Day==='function'?v174Day():new Date().toISOString().slice(0,10)}
function v176Money(v){const n=Number(v),x=Number.isFinite(n)?n:0;if(typeof money==='function')return money(x);return (x<0?'-':'')+'₦'+Math.abs(Math.round(x)).toLocaleString('en-NG')}
function v176CalcCashierReport(){
  const f=$('#v176CashierReportForm');if(!f)return;
  const cash=v176Num(f.elements.cash_amount?.value),pos=v176Num(f.elements.pos_card_amount?.value),appeal=v176Num(f.elements.total_appeal_amount?.value);
  const total=cash+pos,income=total+appeal;
  const ta=$('#v176TotalAmount'),ti=$('#v176TotalIncome');
  if(ta){ta.value=total;ta.dataset.money=v176Money(total)}
  if(ti){ti.value=income;ti.dataset.money=v176Money(income)}
  const preview=$('#v176CashierMath');if(preview)preview.innerHTML='<b>'+esc(v176Money(total))+'</b><span>Game total = Cash + POS/Card</span><b>'+esc(v176Money(income))+'</b><span>Total income = Game total + Appeal amount</span>';
}
async function openCashierDailyReport176(){
  if(role!=='cashier')return toast('Cashier login required to submit a Daily Report.');
  const day=v176Day();let report=null;
  openModal('<div class="modal-head"><div><div class="eyebrow">CASHIER · DAILY REPORT</div><h2>'+esc(day)+'</h2><p class="muted">D12 operational day · 06:00 to 05:59 Africa/Lagos.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div id="v176DailyReportHost" class="empty">Loading saved report…</div>');
  try{const j=await v166('cashier_report_get',{operational_day:day});report=j.report||null}catch(e){toast(e.message)}
  const host=$('#v176DailyReportHost');if(!host)return;
  const r=report||{};
  host.className='';
  host.innerHTML='<form id="v176CashierReportForm" class="stack v176-report-form" oninput="v176CalcCashierReport()" onsubmit="saveCashierDailyReport176(event)">'+
    '<div class="v176-report-grid">'+
      '<label><span>A · TOTAL PLAYERS</span><input name="total_players" type="number" min="0" step="1" value="'+v176Num(r.total_players)+'" required></label>'+
      '<label><span>B · TOTAL NUMBER OF APPEALS</span><input name="total_appeals" type="number" min="0" step="1" value="'+v176Num(r.total_appeals)+'" required></label>'+
      '<label><span>C · TOTAL APPEAL AMOUNT</span><input name="total_appeal_amount" type="number" min="0" step="0.01" value="'+v176Num(r.total_appeal_amount)+'" required></label>'+
      '<label><span>D · CASH AMOUNT</span><input name="cash_amount" type="number" min="0" step="0.01" value="'+v176Num(r.cash_amount)+'" required></label>'+
      '<label><span>E · ALL POS / CARD AMOUNT</span><input name="pos_card_amount" type="number" min="0" step="0.01" value="'+v176Num(r.pos_card_amount)+'" required></label>'+
      '<label class="v176-auto"><span>F · TOTAL AMOUNT</span><input id="v176TotalAmount" name="total_amount" type="number" readonly></label>'+
      '<label class="v176-auto"><span>G · TOTAL INCOME (GAME + APPEAL)</span><input id="v176TotalIncome" name="total_income" type="number" readonly></label>'+
    '</div><div id="v176CashierMath" class="v176-math"></div>'+
    '<div class="notice">Automatic formulas: <b>Total Amount = Cash + POS/Card</b>. <b>Total Income = Total Amount + Total Appeal Amount</b>.</div>'+
    '<button class="btn primary block">'+(report?'Update Daily Report':'Save Daily Report')+'</button>'+
    (report?'<small class="muted">Last saved '+esc(v166AbujaStamp(report.updated_at||report.submitted_at))+'</small>':'')+
  '</form>';
  v176CalcCashierReport();
}
async function saveCashierDailyReport176(e){
  e.preventDefault();const f=new FormData(e.currentTarget),payload={operational_day:v176Day(),total_players:v176Num(f.get('total_players')),total_appeals:v176Num(f.get('total_appeals')),total_appeal_amount:v176Num(f.get('total_appeal_amount')),cash_amount:v176Num(f.get('cash_amount')),pos_card_amount:v176Num(f.get('pos_card_amount'))};
  const btn=e.currentTarget.querySelector('button');if(btn){btn.disabled=true;btn.textContent='Saving…'}
  try{const j=await v166('cashier_report_save',payload);toast(j.message||'Daily cashier report saved.');closeModal()}catch(x){toast(x.message);if(btn){btn.disabled=false;btn.textContent='Save Daily Report'}}
}

// Mobile/tablet Cashier tabs: keep Player ID Request and add Daily Report.
v171CashierTabs=function(){
  const report=role==='cashier'?'<button type="button" onclick="openCashierDailyReport176()">▤ Daily Report</button>':'';
  return '<nav class="v171-cashier-tabs glass"><button class="active" type="button">₦ Cashier</button><button type="button" onclick="openPlayerIdRequest171()">▦ Player ID Request</button>'+report+'</nav>';
};
const v176CashierViewBase=cashierView;
cashierView=function(){
  let html=v176CashierViewBase();
  if(role==='cashier')html=html.replace('<div class="v170-cashier-desktop">','<div class="v170-cashier-desktop"><section class="v176-cashier-report-launch glass"><div><small>SHIFT RECONCILIATION</small><b>Daily Cashier Report</b><span>Players · Appeals · Cash · POS/Card · Income</span></div><button class="btn primary" onclick="openCashierDailyReport176()">▤ Open Daily Report</button></section>');
  return html;
};

// ---------- MOBILE / TABLET PLAYER ID REQUEST HARDENING ----------
v171PlayerIdSearchRows=function(q=''){
  const term=String(q||'').trim().toLowerCase(),rows=v171Registry().filter(p=>!term||(`${p.full_name||''} ${p.player_code||''} ${p.phone||''}`).toLowerCase().includes(term)).slice(0,100);
  return rows.length?rows.map(p=>'<button type="button" class="v171-player-row v176-player-id-row" onclick="showPlayerId171(\''+p.id+'\')">'+avatar(p,'sm')+'<span><b>'+esc(p.full_name||'Player')+'</b><small>'+esc(p.player_code||'ID pending')+' · '+esc(p.phone||'No WhatsApp number')+'</small></span><i>›</i></button>').join(''):'<div class="empty">No registered player matches that search.</div>';
};
openPlayerIdRequest171=function(){
  openModal('<div class="modal-head"><div><div class="eyebrow">CASHIER · PLAYER ID REQUEST</div><h2>Registered Players</h2><p class="muted">Search and select a player to review their Player ID and send it to the registered WhatsApp number.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v176-id-search"><div class="field"><label>SEARCH PLAYER</label><input id="v171PlayerSearch" type="search" autocomplete="off" placeholder="Name, Player ID or WhatsApp number" oninput="filterPlayerId171(this.value)"></div><button type="button" class="btn" onclick="const x=$(\'#v171PlayerSearch\');if(x){x.value=\'\';filterPlayerId171(\'\');x.focus()}">Clear</button></div><div id="v171PlayerList" class="v171-player-list v176-player-id-list">'+v171PlayerIdSearchRows('')+'</div>');
};

// ---------- ADMIN-ONLY PLAYERS TODAY ----------
const v176AllowedNavBase=allowedNav;
allowedNav=function(){
  const list=v176AllowedNavBase().filter(x=>x[0]!=='players_today_admin');
  if(role==='admin'){
    const out=[...list],idx=Math.max(0,out.findIndex(x=>x[0]==='overview')+1);
    out.splice(idx,0,['players_today_admin','◉','Players Today']);return out;
  }
  return list;
};
const v176GoBase=go;
go=function(v){if(v==='players_today_admin')return openPlayersToday();return v176GoBase(v)};

const v176RackViewBase=rackmasterView;
rackmasterView=function(){
  let html=v176RackViewBase();
  html=html.replace(/<button class="btn v164-players-today-btn"[\s\S]*?<\/button>/g,'');
  if(role==='rackmaster'||role==='admin')html='<section class="v176-undo-bar glass"><div><small>SAFE QUEUE CORRECTION</small><b>Undo / Redo</b><span>Reverses validated queue moves only. Match results and payments remain protected.</span></div><div><button class="btn" onclick="undoQueue176()">↶ Undo</button><button class="btn" onclick="redoQueue176()">↷ Redo</button></div></section>'+html;
  return html;
};

let v176Players=null,v176Sort='az',v176CashierReports=[];
function v176Stamp(v){return v?esc(v166AbujaStamp(v)):'—'}
function v176DailyNormalize(d){
  const s=d.summary||{};
  return {from:d.date,to:d.date,generated_at:d.generated_at,summary:{...s,player_visits:Number(s.players||0)},players:d.players||[],daily:[{date:d.date,players:Number(s.players||0),matches:Number(s.matches||0),unfinished:Number(s.unfinished||0),appeals:Number(s.appeals||0),appeal_amount:Number(s.appeal_amount||0),game_income:Number(s.game_income||0),total_income:Number(s.total_income||0)}]};
}
function v176PlayersControls(){
  const today=v176Day(),min=typeof v174Shift==='function'?v174Shift(today,-365):today;
  return '<div class="v176-range-controls v175-no-print"><label>FROM<input id="v176From" type="date" min="'+min+'" max="'+today+'" value="'+today+'"></label><label>TO<input id="v176To" type="date" min="'+min+'" max="'+today+'" value="'+today+'"></label><button class="btn primary" onclick="loadPlayersRange176()">View Range</button><label>SORT<select id="v176Sort" onchange="sortPlayers176(this.value)"><option value="az">Name A → Z</option><option value="za">Name Z → A</option></select></label><button class="btn" onclick="compareCashier176()">Compare Cashier Report</button><button class="btn" onclick="printPlayersRange176()">Print / Save PDF</button></div>';
}
openPlayersToday=async function(){
  if(role!=='admin')return toast('Players Today is available to Admin only.');
  v176Players=null;v176CashierReports=[];v176Sort='az';
  openModal('<div class="modal-head"><div><div class="eyebrow">ADMIN · DAILY ROOM INTELLIGENCE</div><h2>Players Today & History</h2><p class="muted">Player activity, appeals, income and Cashier reconciliation.</p></div><button class="icon-btn" onclick="v164ClosePlayersToday()">×</button></div>'+v176PlayersControls()+'<div id="v176PlayersHost" aria-live="polite">Loading today’s player log…</div><div id="v176CompareHost"></div>');
  $('#modalCard')?.classList.add('v164-wide-modal');return loadPlayersRange176();
};
async function loadPlayersRange176(){
  const host=$('#v176PlayersHost'),from=$('#v176From')?.value||v176Day(),to=$('#v176To')?.value||v176Day();if(!host)return;
  if(!from||!to||from>to)return toast('Choose a valid date range.');
  host.textContent='Loading player activity…';const compare=$('#v176CompareHost');if(compare)compare.innerHTML='';v176CashierReports=[];
  try{const d=from===to?v176DailyNormalize(await v166('players_today',{date:from})):await v166('players_range',{from,to});v176Players=d;host.innerHTML=v176PlayersHTML(d)}catch(e){host.textContent=e.message}
}
function sortPlayers176(v){v176Sort=v==='za'?'za':'az';const host=$('#v176PlayersHost');if(host&&v176Players)host.innerHTML=v176PlayersHTML(v176Players)}
function v176PlayersHTML(d){
  const s=d.summary||{},rows=[...(d.players||[])].sort((a,b)=>v176Sort==='za'?String(b.full_name||'').localeCompare(String(a.full_name||'')):String(a.full_name||'').localeCompare(String(b.full_name||'')));
  const kpis=[[Number(s.player_visits??s.players??0),'Player visits'],[Number(s.players||0),'Unique players'],[Number(s.appeals||0),'Appeals'],[v176Money(s.appeal_amount),'Appeal amount'],[v176Money(s.game_income),'Game income'],[v176Money(s.total_income),'Total income']];
  return '<article class="v176-admin-log"><header><img src="./d12-cue-club-logo-v1-1.svg" alt="D12 Cue Club"><div><small>D12 CUE CLUB ARENA</small><h2>PLAYER ACTIVITY REPORT</h2><b>'+esc(d.from)+' — '+esc(d.to)+'</b></div></header><div class="v176-kpis">'+kpis.map(x=>'<div><b>'+esc(String(x[0]))+'</b><span>'+x[1]+'</span></div>').join('')+'</div>'+
    '<div class="v175-table-scroll"><table><thead><tr><th>Player / ID</th><th>Tables</th><th>Played</th><th>W</th><th>L</th><th>Win %</th><th>Appeals</th><th>Appeal ₦</th><th>First / Last play</th><th>Clearance / Entry</th></tr></thead><tbody>'+
    (rows.length?rows.map(p=>{const total=Number(p.wins||0)+Number(p.losses||0),rate=total?Math.round(Number(p.wins||0)/total*100):0;return '<tr><td><b>'+esc(p.full_name||'Player')+'</b><br><small>'+esc(p.player_code||'')+'</small></td><td>'+esc(Array.isArray(p.tables)?p.tables.join(', '):'—')+'</td><td>'+Number(p.matches||0)+'</td><td>'+Number(p.wins||0)+'</td><td>'+Number(p.losses||0)+'</td><td>'+rate+'%</td><td><b>'+Number(p.appeals||0)+'</b></td><td>'+esc(v176Money(p.appeal_amount||0))+'</td><td>'+v176Stamp(p.first_play_at)+'<br>'+v176Stamp(p.last_play_at)+'</td><td>'+esc(p.clearance||p.status||'—')+'</td></tr>'}).join(''):'<tr><td colspan="10">No player activity in this range.</td></tr>')+
    '</tbody></table></div>'+v176DailyBreakdown(d.daily||[])+v175BrandFooter()+'</article>';
}
function v176DailyBreakdown(days){
  if(!days.length)return '';
  return '<details class="v176-daily-break"><summary>Daily breakdown ('+days.length+' day'+(days.length===1?'':'s')+')</summary><div class="v175-table-scroll"><table><thead><tr><th>Date</th><th>Players</th><th>Matches</th><th>Appeals</th><th>Appeal ₦</th><th>Game income</th><th>Total income</th></tr></thead><tbody>'+days.map(d=>'<tr><td>'+esc(d.date)+'</td><td>'+Number(d.players||0)+'</td><td>'+Number(d.matches||0)+'</td><td>'+Number(d.appeals||0)+'</td><td>'+esc(v176Money(d.appeal_amount||0))+'</td><td>'+esc(v176Money(d.game_income||0))+'</td><td>'+esc(v176Money(d.total_income||0))+'</td></tr>').join('')+'</tbody></table></div></details>';
}
function v176PrintHTML(html,title){const win=window.open('','_blank');if(!win)return toast('Allow popups to print.');const a=new URL('./patch-v1-7-15.css',location.href).href,b=new URL('./patch-v1-7-16.css',location.href).href;win.document.write('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><link rel="stylesheet" href="'+a+'"><link rel="stylesheet" href="'+b+'"></head><body>'+html+'</body></html>');win.document.close();win.addEventListener('load',()=>win.print(),{once:true})}
function printPlayersRange176(){if(!v176Players)return toast('Load a date range first.');v176PrintHTML(v176PlayersHTML(v176Players),'D12 Player Activity '+v176Players.from+' to '+v176Players.to)}
function v176Accuracy(system,reported){system=v176Num(system);reported=v176Num(reported);if(system===0&&reported===0)return 100;if(system===0)return 0;return Math.max(0,Math.round((1-Math.abs(reported-system)/system)*100))}
function v176Metric(label,system,reported,moneyMode=false){const max=Math.max(1,v176Num(system),v176Num(reported)),a=Math.min(100,v176Num(system)/max*100),b=Math.min(100,v176Num(reported)/max*100),delta=v176Num(reported)-v176Num(system);return '<div class="v176-compare-metric"><div><b>'+label+'</b><span>Accuracy '+v176Accuracy(system,reported)+'% · Variance '+(delta>0?'+':'')+(moneyMode?v176Money(delta):delta)+'</span></div><div class="v176-bars"><i style="width:'+a+'%"></i><em style="width:'+b+'%"></em></div><small>System: '+(moneyMode?v176Money(system):system)+' · Cashier: '+(moneyMode?v176Money(reported):reported)+'</small></div>'}
async function compareCashier176(){
  if(!v176Players)return toast('Load the Player Activity range first.');
  const host=$('#v176CompareHost');if(!host)return;host.innerHTML='<div class="empty">Loading Cashier reports…</div>';
  try{const j=await v166('cashier_reports_range',{from:v176Players.from,to:v176Players.to});v176CashierReports=j.reports||[];host.innerHTML=v176CompareHTML(v176Players,v176CashierReports)}catch(e){host.innerHTML='<div class="notice danger-note">'+esc(e.message)+'</div>'}
}
function v176CompareHTML(system,reports){
  if(!reports.length)return '<section class="card glass v176-comparison"><h3>Cashier Report Comparison</h3><div class="notice">No Cashier Daily Report was submitted in this selected range.</div></section>';
  const dayMap=Object.fromEntries((system.daily||[]).map(d=>[d.date,d])),counts={};reports.forEach(r=>counts[r.operational_day]=(counts[r.operational_day]||0)+1);
  const cards=reports.map(r=>{const d=dayMap[r.operational_day]||{},tips=[];if(Number(r.total_players)!==Number(d.players||0))tips.push(Number(r.total_players)>Number(d.players||0)?'Cashier count is higher; this may include checked-in players who did not start a recorded frame.':'System activity is higher; review omitted Cashier entries or player-count recording.');if(Number(r.total_appeals)!==Number(d.appeals||0))tips.push('Appeal count differs; review appeal payment confirmations for this operational day.');if(Math.abs(Number(r.total_appeal_amount)-Number(d.appeal_amount||0))>.5)tips.push('Appeal amount differs; review appeal values and paid/voided appeal records.');if(Math.abs(Number(r.total_income)-Number(d.total_income||0))>.5)tips.push('Income differs; review game payments, appeal payments, and Cash/POS reconciliation.');if(counts[r.operational_day]>1)tips.push('Multiple Cashier reports exist for this day; compare them individually before consolidation.');if(!tips.length)tips.push('Core player, appeal and income figures align with the system record.');return '<article class="v176-compare-card"><header><div><b>'+esc(r.operational_day)+' · '+esc(r.cashier_name||'Cashier')+'</b><small>Cash '+esc(v176Money(r.cash_amount))+' · POS/Card '+esc(v176Money(r.pos_card_amount))+'</small></div><span class="pill '+(tips.length===1&&tips[0].startsWith('Core')?'good':'pending')+'">'+(tips.length===1&&tips[0].startsWith('Core')?'MATCH':'REVIEW')+'</span></header>'+v176Metric('Players',d.players||0,r.total_players,false)+v176Metric('Appeals',d.appeals||0,r.total_appeals,false)+v176Metric('Appeal amount',d.appeal_amount||0,r.total_appeal_amount,true)+v176Metric('Total income',d.total_income||0,r.total_income,true)+'<ul>'+tips.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></article>'}).join('');
  return '<section class="card glass v176-comparison"><div class="row split"><div><div class="eyebrow">ADMIN RECONCILIATION</div><h3>Players Today vs Cashier Daily Report</h3><p class="muted">Green bars = system · outlined bars = Cashier report.</p></div><span class="pill">'+reports.length+' REPORT'+(reports.length===1?'':'S')+'</span></div><div class="v176-compare-grid">'+cards+'</div></section>';
}

// ---------- SAFE QUEUE UNDO / REDO ----------
let v176UndoStack=[],v176RedoStack=[];
function v176MoveSnapshot(){return v1712Snap(['queue','move_requests','all_table_summaries'])}
function v176ApplyQueueState(rows){
  for(const r of rows||[]){const q=(data?.queue||[]).find(x=>x.id===r.id);if(q)Object.assign(q,{table_id:r.table_id,status:r.status,priority:r.priority,joined_at:r.joined_at,called_at:r.called_at,updated_at:v1712Now()})}
  for(const s of data?.all_table_summaries||[]){const n=(data.queue||[]).filter(q=>q.table_id===s.id&&['queued','called'].includes(q.status)&&q.payment_status!=='pending').length;s.queue_count=n;const st=v1712State(s.id);s.estimated_wait_minutes=Math.round(n*Number(st?.avg_match_minutes||data?.settings?.default_match_minutes||12))}
  v1712Render();
}
executeMove166=async function(queueId,mode){
  const key='move:'+queueId;if(v1712Busy.has(key))return;
  const target=mode==='table'?$('#v166MoveTarget')?.value:null;if(mode==='table'&&!target)return toast('Select a destination table.');
  const before=v176MoveSnapshot();
  try{v1712Busy.add(key);v1712MoveLocal(queueId,mode,target);const after=v176MoveSnapshot();closeModal();v1712Render();toast('Queue updated — confirming…');const j=await v166('move_player',{queue_id:queueId,mode,target_table_id:target});if(j.undo_action_id){v176UndoStack.push({id:j.undo_action_id,before,after});if(v176UndoStack.length>30)v176UndoStack.shift();v176RedoStack=[]}toast(j.message||'Queue updated')}
  catch(e){v1712Restore(before);toast(e.message)}finally{v1712Busy.delete(key)}
};
async function undoQueue176(){
  const local=v176UndoStack.pop()||null;
  if(local){v1712Restore(local.before);toast('Undo applied — confirming…')}
  else toast('Checking last safe queue action…');
  try{const j=await v166('undo_queue',local?{action_id:local.id}:{});if(j.state)v176ApplyQueueState(j.state);if(local)v176RedoStack.push(local);toast(j.message||'Queue action undone.')}
  catch(e){if(local){v1712Restore(local.after);v176UndoStack.push(local)}toast(e.message)}
}
async function redoQueue176(){
  const local=v176RedoStack.pop()||null;
  if(local){v1712Restore(local.after);toast('Redo applied — confirming…')}
  else toast('Checking last undone queue action…');
  try{const j=await v166('redo_queue',local?{action_id:local.id}:{});if(j.state)v176ApplyQueueState(j.state);if(local)v176UndoStack.push(local);toast(j.message||'Queue action redone.')}
  catch(e){if(local){v1712Restore(local.before);v176RedoStack.push(local)}toast(e.message)}
}
