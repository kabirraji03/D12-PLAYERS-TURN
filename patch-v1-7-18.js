// D12 PLAYERS TURN v1.7.18 — winner run records, dated cashier reports, graphical admin history

// ---------- RACKMASTER: BREAK & RUN / TABLE RUN ----------
function v1718RunGuard(el){
  if(!el)return;
  el.value=String(Math.max(0,Math.min(1,Math.trunc(Number(el.value||0)))));
  if(Number(el.value)===1){
    const other=el.name==='break_and_run_count'?$('#finishForm [name="table_run_count"]'):$('#finishForm [name="break_and_run_count"]');
    if(other)other.value='0';
  }
}
openFinishMatch=function(matchId){
  const m=(data.matches||[]).find(x=>x.id===matchId);if(!m)return;
  if(m.__optimistic)return toast('Match start is still being confirmed. Please wait a moment.');
  const a=player(m.holder_player_id),b=player(m.challenger_player_id),others=(data.all_table_summaries||[]).filter(t=>t.id!==m.table_id&&t.operational_status==='open');
  const loss=(value,icon,title,desc)=>`<label data-choice="${value}"><input type="radio" name="action" value="${value}" required onchange="finishChoice()"><span class="v1710-loss-icon" aria-hidden="true">${icon}</span><b>${title}</b><small>${desc}</small></label>`;
  openModal(`<div class="modal-head"><div><div class="eyebrow">RECORD RESULT</div><h2>Winner & Frame Record</h2><p class="muted">Record the winner, any run achieved, and the loser's next action.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>
  <form id="finishForm" class="stack">
    <div class="field"><label>WINNER</label><div class="winner-grid"><label>${avatar(a,'md')}<input type="radio" name="winner" value="${a.id}" required><b>${esc(a.full_name)}</b></label><label>${avatar(b,'md')}<input type="radio" name="winner" value="${b.id}" required><b>${esc(b.full_name)}</b></label></div></div>
    <section class="v1718-run-entry glass"><div class="section-title"><div><small>WINNER PERFORMANCE · THIS FRAME</small><h3>Run Achievement</h3></div><span>◎</span></div>
      <div class="v1718-run-grid">
        <label><span class="v1718-run-icon">B&R</span><div><b>Break & Run</b><small>Winner clears the frame from the break.</small></div><input name="break_and_run_count" type="number" min="0" max="1" step="1" value="0" inputmode="numeric" oninput="v1718RunGuard(this)"></label>
        <label><span class="v1718-run-icon">TR</span><div><b>Table Run</b><small>Winner clears the table after taking over the frame.</small></div><input name="table_run_count" type="number" min="0" max="1" step="1" value="0" inputmode="numeric" oninput="v1718RunGuard(this)"></label>
      </div><div class="notice">For one frame, record <b>1</b> for either Break & Run or Table Run if achieved; otherwise leave both at 0.</div>
    </section>
    <div class="field"><label>LOSER CHOICE</label><div class="action-grid v179-loser-choice-grid">
      ${loss('appeal','↻','Appeal','Immediate rematch after cashier clears payment.')}
      ${loss('remain','⌛','Remain','Join the end of this table queue.')}
      ${loss('change','⇄','Change Table','Choose another table.')}
      ${loss('leave','↗','Leave','End this playing session.')}
    </div></div>
    <div id="changeTarget" class="field hidden"><label>NEW TABLE</label><select name="target_table_id">${others.map(t=>`<option value="${t.id}">${esc(t.table_name)} · ${t.queue_count} in line · ~${t.estimated_wait_minutes} min</option>`).join('')}</select></div>
    <button class="btn primary block">Save Result</button>
  </form>`);

  $('#finishForm').addEventListener('submit',async e=>{
    e.preventDefault();if(v178FinishInFlight.has(matchId))return;
    const f=new FormData(e.currentTarget),act=String(f.get('action')||''),winner=String(f.get('winner')||''),target=act==='change'?String(f.get('target_table_id')||''):null;
    const br=Math.max(0,Math.min(1,Math.trunc(Number(f.get('break_and_run_count')||0)))),tr=Math.max(0,Math.min(1,Math.trunc(Number(f.get('table_run_count')||0))));
    if(br+tr>1)return toast('Record either Break & Run or Table Run for this frame, not both.');
    const snap=v178Snapshot();let local=null;
    try{
      v178FinishInFlight.add(matchId);
      local=v178OptimisticFinish(matchId,winner,act,target);
      if(local?.m){local.m.break_and_run_count=br;local.m.table_run_count=tr}
      closeModal();renderApp(true);
      toast(act==='appeal'?'Creating appeal — confirming…':'Result applied — confirming…');
      const j=await turn('finish_match',{match_id:matchId,winner_player_id:winner,loser_action:act,target_table_id:target,break_and_run_count:br,table_run_count:tr});
      v178ConfirmFinish(local,j.result||{});
      if(local?.m){local.m.break_and_run_count=Number(j.result?.break_and_run_count??br);local.m.table_run_count=Number(j.result?.table_run_count??tr)}
      renderApp(true);
      toast((br?'Break & Run recorded · ':tr?'Table Run recorded · ':'')+(act==='appeal'?'Appeal created — cashier must clear payment':'Result saved'));
    }catch(x){v178Restore(snap);toast(x.message)}
    finally{v178FinishInFlight.delete(matchId)}
  });
};

// ---------- PLAYER PORTAL: RUN COUNTS IN DAILY + HISTORY ----------
v174Totals=function(r){
  return (r.days||[]).reduce((a,d)=>({
    played:a.played+Number(d.played||0),wins:a.wins+Number(d.wins||0),losses:a.losses+Number(d.losses||0),
    best:Math.max(a.best,Number(d.best_streak||0)),
    break_and_runs:a.break_and_runs+Number(d.break_and_runs||0),
    table_runs:a.table_runs+Number(d.table_runs||0)
  }),{played:0,wins:0,losses:0,best:0,break_and_runs:0,table_runs:0});
};

v174Daily=async function(momentum=false){
  if(!v174Player())return;
  try{
    const r=await v174Api('performance_history',{from:v174Day(),to:v174Day(),period:'day'}),s=r.days[0]||{date:v174Day(),played:0,wins:0,losses:0,win_rate:0,best_streak:0,streak:0,break_and_runs:0,table_runs:0};
    v163InsightsData={...(v163InsightsData||{}),today_stats:{...(v163InsightsData?.today_stats||{}),...s}};
    if(momentum){
      const pct=Math.max(0,Math.min(100,Number(s.win_rate||0))),msg=!s.played?'Your first completed match will start today’s momentum.':s.wins>s.losses?'Positive momentum — keep pressing.':s.wins===s.losses?'Balanced form — next result can swing the day.':'Building momentum — one strong run can change the day.';
      return openModal(`<div class="modal-head"><div><div class="eyebrow">MOMENTUM · ${esc(s.date)}</div><h2>Current Form</h2><p class="muted">${esc(msg)}</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><section class="v172-momentum glass"><div class="v172-momentum-orb" style="--pct:${pct}"><span><b>${pct}%</b><small>WIN RATE</small></span></div><div class="grow"><div class="v172-momentum-meter"><i style="width:${pct}%"></i></div><div class="v172-momentum-stats"><span><b>${Number(s.wins||0)}</b> WINS</span><span><b>${Number(s.losses||0)}</b> LOSSES</span><span><b>${Number(s.streak||0)}</b> STREAK</span><span><b>${Number(s.break_and_runs||0)}</b> B&R</span><span><b>${Number(s.table_runs||0)}</b> TABLE RUNS</span></div></div></section>`);
    }
    openModal(`<div class="modal-head"><div><div class="eyebrow">TODAY AT D12</div><h2>Daily Performance · ${esc(s.date)}</h2><p class="muted">Your completed D12 results and run achievements for this playing day.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="v174-kpis v1718-player-kpis">${[[s.played,'Matches'],[s.wins,'Wins'],[s.losses,'Losses'],[s.win_rate+'%','Win rate'],[s.best_streak,'Highest win streak'],[s.streak,'Current streak'],[s.break_and_runs||0,'Break & Runs'],[s.table_runs||0,'Table Runs']].map(([v,k])=>`<div><b>${v}</b><span>${k}</span></div>`).join('')}</div><button class="btn" onclick="openHistory174()">Performance History</button>`);
  }catch(e){toast(e.message)}
};

const v1718ReportHTMLBase=v174ReportHTML;
v174ReportHTML=function(r){
  const t=v174Totals(r);
  let html=v1718ReportHTMLBase(r);
  const runs=`<section class="v1718-player-run-summary"><div><b>${t.break_and_runs}</b><span>BREAK & RUNS</span></div><div><b>${t.table_runs}</b><span>TABLE RUNS</span></div></section>`;
  const daily=`<details class="v175-no-print v1718-run-history"><summary>Run achievements by day</summary><table><thead><tr><th>Date</th><th>Break & Runs</th><th>Table Runs</th></tr></thead><tbody>${(r.days||[]).map(d=>`<tr><td>${esc(d.date)}</td><td>${Number(d.break_and_runs||0)}</td><td>${Number(d.table_runs||0)}</td></tr>`).join('')}</tbody></table></details>`;
  html=html.replace('<div class="v175-graphs">',runs+'<div class="v175-graphs">');
  const footer=v175BrandFooter();html=html.replace(footer,daily+footer);
  return html;
};

// ---------- CASHIER DAILY REPORT: SELECT OPERATIONAL DATE ----------
let v1718CashierReportDay='';
function v1718CashierReportForm(day,report){
  const r=report||{};
  return '<form id="v176CashierReportForm" class="stack v176-report-form" oninput="v176CalcCashierReport()" onsubmit="saveCashierDailyReport176(event)">'+
    '<input type="hidden" name="operational_day" value="'+esc(day)+'">'+
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
    '<button class="btn primary block">'+(report?'Update Report for '+esc(day):'Save Report for '+esc(day))+'</button>'+
    (report?'<small class="muted">Last saved '+esc(v166AbujaStamp(report.updated_at||report.submitted_at))+'</small>':'')+
  '</form>';
}
async function loadCashierDailyReport1718(day){
  const host=$('#v176DailyReportHost');if(!host||!day)return;
  v1718CashierReportDay=day;host.className='empty';host.textContent='Loading '+day+' report…';
  try{
    const j=await v166('cashier_report_get',{operational_day:day}),report=j.report||null;
    if(!host.isConnected)return;host.className='';host.innerHTML=v1718CashierReportForm(day,report);v176CalcCashierReport();
  }catch(e){host.textContent=e.message}
}
openCashierDailyReport176=function(){
  if(role!=='cashier')return toast('Cashier login required to submit a Daily Report.');
  const today=v176Day(),min=v174Shift(today,-365);v1718CashierReportDay=today;
  openModal(`<div class="modal-head"><div><div class="eyebrow">CASHIER · DAILY REPORT</div><h2>Daily Reconciliation</h2><p class="muted">Select the D12 operational date to enter or edit. Club day: 06:00–05:59 Africa/Lagos.</p></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="v1718-report-date"><label>REPORT DATE<input id="v1718CashierReportDate" type="date" min="${min}" max="${today}" value="${today}" onchange="loadCashierDailyReport1718(this.value)"></label><span>Choose any operational day within the past year.</span></div>
    <div id="v176DailyReportHost" class="empty">Loading saved report…</div>`);
  return loadCashierDailyReport1718(today);
};
saveCashierDailyReport176=async function(e){
  e.preventDefault();const f=new FormData(e.currentTarget),day=String(f.get('operational_day')||v1718CashierReportDay||v176Day()),payload={operational_day:day,total_players:v176Num(f.get('total_players')),total_appeals:v176Num(f.get('total_appeals')),total_appeal_amount:v176Num(f.get('total_appeal_amount')),cash_amount:v176Num(f.get('cash_amount')),pos_card_amount:v176Num(f.get('pos_card_amount'))};
  const btn=e.currentTarget.querySelector('button');if(btn){btn.disabled=true;btn.textContent='Saving…'}
  try{const j=await v166('cashier_report_save',payload);toast(j.message||'Daily cashier report saved.');if(btn){btn.disabled=false;btn.textContent='Report Saved'} }
  catch(x){toast(x.message);if(btn){btn.disabled=false;btn.textContent='Save Daily Report'}}
};

// ---------- ADMIN: CASHIER REPORT BY DATE ----------
const v1718PlayersControlsBase=v176PlayersControls;
v176PlayersControls=function(){
  const today=v176Day(),min=v174Shift(today,-365);
  return v1718PlayersControlsBase()+`<section class="v1718-cashier-date-tools v175-no-print"><div><small>CASHIER REPORT ARCHIVE</small><b>View Cashier Report by Date</b></div><label>REPORT DATE<input id="v1718AdminCashierDate" type="date" min="${min}" max="${today}" value="${today}"></label><button class="btn" onclick="viewCashierReportByDate1718()">View Cashier Report</button></section>`;
};
function v1718CashierCards(day,reports){
  if(!reports.length)return `<section class="card glass v1718-cashier-archive"><div class="section-title"><div><small>CASHIER REPORT · ${esc(day)}</small><h3>No report submitted</h3></div><span>▤</span></div><div class="notice">No Cashier Daily Report exists for this operational date.</div></section>`;
  return `<section class="card glass v1718-cashier-archive"><div class="section-title"><div><small>CASHIER REPORT ARCHIVE · ${esc(day)}</small><h3>${reports.length} submitted report${reports.length===1?'':'s'}</h3></div><span>▤</span></div><div class="v1718-cashier-report-grid">${reports.map(r=>`<article><header><b>${esc(r.cashier_name||'Cashier')}</b><small>${esc(v166AbujaStamp(r.updated_at||r.submitted_at))}</small></header><div class="v1718-mini-kpis"><span><b>${Number(r.total_players||0)}</b>Players</span><span><b>${Number(r.total_appeals||0)}</b>Appeals</span><span><b>${esc(v176Money(r.total_appeal_amount||0))}</b>Appeal ₦</span><span><b>${esc(v176Money(r.cash_amount||0))}</b>Cash</span><span><b>${esc(v176Money(r.pos_card_amount||0))}</b>POS/Card</span><span><b>${esc(v176Money(r.total_amount||0))}</b>Game total</span><span class="total"><b>${esc(v176Money(r.total_income||0))}</b>Total income</span></div></article>`).join('')}</div></section>`;
}
async function viewCashierReportByDate1718(){
  if(role!=='admin')return toast('Admin access required.');
  const day=$('#v1718AdminCashierDate')?.value||v176Day(),host=$('#v176CompareHost');if(!host)return;
  host.innerHTML='<div class="empty">Loading Cashier report…</div>';
  try{const j=await v166('cashier_reports_range',{from:day,to:day});host.innerHTML=v1718CashierCards(day,j.reports||[])}catch(e){host.innerHTML='<div class="notice danger-note">'+esc(e.message)+'</div>'}
}

// ---------- ADMIN: GRAPHICAL PLAYERS TODAY & HISTORY ----------
v176DailyNormalize=function(d){
  const s=d.summary||{};
  return {from:d.date,to:d.date,generated_at:d.generated_at,summary:{...s,player_visits:Number(s.players||0)},players:d.players||[],daily:[{date:d.date,players:Number(s.players||0),matches:Number(s.matches||0),unfinished:Number(s.unfinished||0),active:Number(s.active||0),break_and_runs:Number(s.break_and_runs||0),table_runs:Number(s.table_runs||0),appeals:Number(s.appeals||0),appeal_amount:Number(s.appeal_amount||0),game_income:Number(s.game_income||0),total_income:Number(s.total_income||0)}]};
};
function v1718Buckets(days){
  const monthly=(days||[]).length>45,map=new Map();
  for(const d of days||[]){const key=monthly?String(d.date).slice(0,7):String(d.date);const b=map.get(key)||{label:key,players:0,matches:0,appeals:0,income:0,game:0,appeal_amount:0,break_and_runs:0,table_runs:0};b.players+=Number(d.players||0);b.matches+=Number(d.matches||0);b.appeals+=Number(d.appeals||0);b.income+=Number(d.total_income||0);b.game+=Number(d.game_income||0);b.appeal_amount+=Number(d.appeal_amount||0);b.break_and_runs+=Number(d.break_and_runs||0);b.table_runs+=Number(d.table_runs||0);map.set(key,b)}
  return [...map.values()];
}
function v1718BarSvg(rows,key,label){
  const peak=Math.max(1,...rows.map(r=>Number(r[key]||0))),w=760,h=225,plot=680,step=plot/Math.max(1,rows.length),bw=Math.max(2,Math.min(42,step*.62)),skip=Math.max(1,Math.ceil(rows.length/9));
  const bars=rows.map((r,i)=>{const x=45+i*step,val=Number(r[key]||0),bh=val/peak*145;return `<g><title>${esc(r.label)}: ${val}</title><rect x="${x}" y="${175-bh}" width="${bw}" height="${bh}" rx="4"/>${i%skip===0?`<text x="${x}" y="201">${esc(r.label.length>7?r.label.slice(5):r.label)}</text>`:''}</g>`}).join('');
  return `<svg class="v1718-bar-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><text class="title" x="20" y="24">${esc(label)}</text><line x1="35" y1="176" x2="740" y2="176"/>${bars}</svg>`;
}
function v1718AdminGraphics(d){
  const rows=v1718Buckets(d.daily||[]),s=d.summary||{},game=Number(s.game_income||0),appeal=Number(s.appeal_amount||0),total=Math.max(1,game+appeal),gamePct=Math.round(game/total*100),br=Number(s.break_and_runs||0),tr=Number(s.table_runs||0),runMax=Math.max(1,br,tr);
  return `<section class="v1718-admin-graphics">
    <article class="v1718-chart-card"><div><small>ROOM TRAFFIC</small><h3>Players by Operational Day</h3></div><div class="v1718-svg-wrap">${v1718BarSvg(rows,'players','Player visits')}</div></article>
    <article class="v1718-chart-card"><div><small>APPEAL ACTIVITY</small><h3>Appeals by Operational Day</h3></div><div class="v1718-svg-wrap">${v1718BarSvg(rows,'appeals','Paid appeals')}</div></article>
    <article class="v1718-chart-card v1718-income-card"><div><small>INCOME COMPOSITION</small><h3>Game vs Appeal Income</h3></div><div class="v1718-donut" style="--pct:${gamePct}"><span><b>${gamePct}%</b><small>GAME</small></span></div><div class="v1718-legend"><span><i class="game"></i>Game ${esc(v176Money(game))}</span><span><i class="appeal"></i>Appeal ${esc(v176Money(appeal))}</span></div></article>
    <article class="v1718-chart-card"><div><small>QUALITY CLEARANCES</small><h3>Break & Run / Table Run</h3></div><div class="v1718-run-bars"><label><span>Break & Runs</span><i><em style="width:${br/runMax*100}%"></em></i><b>${br}</b></label><label><span>Table Runs</span><i><em style="width:${tr/runMax*100}%"></em></i><b>${tr}</b></label></div></article>
  </section>`;
}
v176PlayersHTML=function(d){
  const s=d.summary||{},rows=[...(d.players||[])].sort((a,b)=>v176Sort==='za'?String(b.full_name||'').localeCompare(String(a.full_name||'')):String(a.full_name||'').localeCompare(String(b.full_name||'')));
  const kpis=[[Number(s.player_visits??s.players??0),'Player visits'],[Number(s.players||0),'Unique players'],[Number(s.appeals||0),'Appeals'],[v176Money(s.appeal_amount),'Appeal amount'],[v176Money(s.game_income),'Game income'],[v176Money(s.total_income),'Total income']];
  return '<article class="v176-admin-log"><header><img src="./d12-cue-club-logo-v1-1.svg" alt="D12 Cue Club"><div><small>D12 CUE CLUB ARENA</small><h2>PLAYER ACTIVITY REPORT</h2><b>'+esc(d.from)+' — '+esc(d.to)+'</b></div></header><div class="v176-kpis">'+kpis.map(x=>'<div><b>'+esc(String(x[0]))+'</b><span>'+x[1]+'</span></div>').join('')+'</div>'+
    v1718AdminGraphics(d)+
    '<div class="v175-table-scroll"><table><thead><tr><th>Player / ID</th><th>Tables</th><th>Played</th><th>W</th><th>L</th><th>Win %</th><th>B&R</th><th>Table Runs</th><th>Appeals</th><th>Appeal ₦</th><th>First / Last play</th><th>Clearance / Entry</th></tr></thead><tbody>'+
    (rows.length?rows.map(p=>{const total=Number(p.wins||0)+Number(p.losses||0),rate=total?Math.round(Number(p.wins||0)/total*100):0;return '<tr><td><b>'+esc(p.full_name||'Player')+'</b><br><small>'+esc(p.player_code||'')+'</small></td><td>'+esc(Array.isArray(p.tables)?p.tables.join(', '):'—')+'</td><td>'+Number(p.matches||0)+'</td><td>'+Number(p.wins||0)+'</td><td>'+Number(p.losses||0)+'</td><td>'+rate+'%</td><td><b>'+Number(p.break_and_runs||0)+'</b></td><td><b>'+Number(p.table_runs||0)+'</b></td><td><b>'+Number(p.appeals||0)+'</b></td><td>'+esc(v176Money(p.appeal_amount||0))+'</td><td>'+v176Stamp(p.first_play_at)+'<br>'+v176Stamp(p.last_play_at)+'</td><td>'+esc(p.clearance||p.status||'—')+'</td></tr>'}).join(''):'<tr><td colspan="12">No player activity in this range.</td></tr>')+
    '</tbody></table></div>'+v176DailyBreakdown(d.daily||[])+v175BrandFooter()+'</article>';
};
v176DailyBreakdown=function(days){
  if(!days.length)return '';
  return '<details class="v176-daily-break"><summary>Daily breakdown ('+days.length+' day'+(days.length===1?'':'s')+')</summary><div class="v175-table-scroll"><table><thead><tr><th>Date</th><th>Players</th><th>Matches</th><th>B&R</th><th>Table Runs</th><th>Appeals</th><th>Appeal ₦</th><th>Game income</th><th>Total income</th></tr></thead><tbody>'+days.map(d=>'<tr><td>'+esc(d.date)+'</td><td>'+Number(d.players||0)+'</td><td>'+Number(d.matches||0)+'</td><td>'+Number(d.break_and_runs||0)+'</td><td>'+Number(d.table_runs||0)+'</td><td>'+Number(d.appeals||0)+'</td><td>'+esc(v176Money(d.appeal_amount||0))+'</td><td>'+esc(v176Money(d.game_income||0))+'</td><td>'+esc(v176Money(d.total_income||0))+'</td></tr>').join('')+'</tbody></table></div></details>';
};


v176PrintHTML=function(html,title){
  const win=window.open('','_blank');if(!win)return toast('Allow popups to print.');
  const styles=['./patch-v1-7-15.css','./patch-v1-7-16.css','./patch-v1-7-18.css'].map(x=>'<link rel="stylesheet" href="'+new URL(x,location.href).href+'">').join('');
  win.document.write('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title>'+styles+'</head><body>'+html+'</body></html>');
  win.document.close();win.addEventListener('load',()=>win.print(),{once:true});
};
