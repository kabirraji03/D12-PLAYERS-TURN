import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS, GET","Access-Control-Max-Age":"86400"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const clean=(v,n=180)=>typeof v==='string'?v.trim().replace(/\s+/g,' ').slice(0,n):'';
const phoneNorm=v=>String(v||'').replace(/\D/g,'').replace(/^0(?=\d{10}$)/,'234').slice(-13);
function operationalDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()-21600000))}
function abujaDayStartISO(){return new Date(operationalDate()+'T06:00:00+01:00').toISOString()}
async function buildInsights(db,p){
 const start=abujaDayStartISO();
 const [{data:matches,error:me},{data:tables},{data:activeQ}]=await Promise.all([
  db.from('d12_turn_matches').select('id,table_id,holder_player_id,challenger_player_id,winner_player_id,loser_player_id,status,started_at,ended_at').eq('status','completed').gte('ended_at',start).order('ended_at',{ascending:true}).order('started_at',{ascending:true}).order('id',{ascending:true}),
  db.from('cue_tables').select('id,table_name').order('table_name'),
  db.from('d12_turn_queue').select('table_id,status,joined_at').eq('player_id',p.id).in('status',['awaiting_payment','queued','called','active']).order('joined_at',{ascending:false}).limit(1)
 ]);if(me)throw new Error(me.message);
 const all=matches||[],mine=all.filter(m=>m.winner_player_id===p.id||m.loser_player_id===p.id),ids=new Set();
 for(const m of all){if(m.holder_player_id)ids.add(m.holder_player_id);if(m.challenger_player_id)ids.add(m.challenger_player_id);if(m.winner_player_id)ids.add(m.winner_player_id)}
 const {data:players}=ids.size?await db.from('d12_turn_players').select('id,full_name,photo_data,player_code').in('id',[...ids]):{data:[]};
 const pmap=Object.fromEntries((players||[]).map(x=>[x.id,x]));let wins=0,losses=0,streak=0,currentStreak=0,bestStreak=0;const opp={};
 for(const m of mine){const won=m.winner_player_id===p.id;if(won){wins++;currentStreak++}else{losses++;currentStreak=0}streak=currentStreak;bestStreak=Math.max(bestStreak,currentStreak);const oid=m.holder_player_id===p.id?m.challenger_player_id:m.holder_player_id;if(!oid)continue;if(!opp[oid])opp[oid]={id:oid,full_name:pmap[oid]?.full_name||'Player',photo_data:pmap[oid]?.photo_data||null,player_code:pmap[oid]?.player_code||'',matches:0,wins:0,losses:0};opp[oid].matches++;if(won)opp[oid].wins++;else opp[oid].losses++}
 const tableWins={};for(const m of all){if(!m.winner_player_id)continue;tableWins[m.table_id]??={};tableWins[m.table_id][m.winner_player_id]=(tableWins[m.table_id][m.winner_player_id]||0)+1}
 const top=[];for(const t of (tables||[])){const rows=Object.entries(tableWins[t.id]||{}).sort((a,b)=>b[1]-a[1]);if(!rows.length)continue;const [pid,count]=rows[0],pp=pmap[pid]||{id:pid,full_name:'Player',photo_data:null,player_code:''};top.push({table_id:t.id,table_name:t.table_name,player_id:pid,full_name:pp.full_name,photo_data:pp.photo_data||null,player_code:pp.player_code||'',wins:count})}
 const played=wins+losses,rate=played?Math.round(wins/played*100):0;return {today_stats:{played,wins,losses,win_rate:rate,streak,best_streak:bestStreak,operational_date:operationalDate()},head_to_head:Object.values(opp).sort((a,b)=>b.matches-a.matches||b.wins-a.wins),top_winners:top,current_table_id:activeQ?.[0]?.table_id||null,day_start:start,generated_at:new Date().toISOString()}
}
export default {fetch:withSupabase({auth:'none'},async(req,ctx)=>{try{if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method==='GET')return new Response('D12 PLAYER INSIGHTS V1.6.3 OK',{headers:{...cors,'Content-Type':'text/plain','Cache-Control':'no-store'}});if(req.method!=='POST')return json({ok:false,error:'Method not allowed'},405);const body=await req.json().catch(()=>({})),action=clean(body.action,50),db=ctx.supabaseAdmin;if(!['insights','performance_history','update_profile_photo'].includes(action))return json({ok:false,error:'Unknown action'},400);let p;
if(body.ticket){const {data:q}=await db.from('d12_turn_queue').select('player_id').eq('public_token',clean(body.ticket,120)).maybeSingle();if(q){const r=await db.from('d12_turn_players').select('id,full_name,phone,player_code,photo_data').eq('id',q.player_id).maybeSingle();p=r.data}}
else {const code=clean(body.player_code,40).toUpperCase(),phone=phoneNorm(body.phone);
if(code&&phone){const r=await db.from('d12_turn_players').select('id,full_name,phone,player_code,photo_data').eq('player_code',code).maybeSingle();if(r.data&&phoneNorm(r.data.phone)===phone)p=r.data}}
if(!p)return json({ok:false,error:'Player identity could not be verified.'},401);
if(action==='update_profile_photo'){
const photo=body.photo_data;
if(typeof photo!=='string'||photo.length>600000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))return json({ok:false,error:'Invalid compressed JPEG photo'},400);
const bytes=Uint8Array.from(atob(photo.split(',')[1]),c=>c.charCodeAt(0));if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return json({ok:false,error:'Invalid JPEG'},400);
const r=await db.from('d12_turn_players').update({photo_data:photo,updated_at:new Date().toISOString()}).eq('id',p.id);if(r.error)throw new Error(r.error.message);return json({ok:true});
}
if(action==='performance_history'){
const r=await db.rpc('d12_turn_performance_v175',{p_player:p.id,p_from:clean(body.from,10),p_to:clean(body.to,10),p_period:clean(body.period,12)||'day'});if(r.error)return json({ok:false,error:r.error.message},400);return json({ok:true,...r.data});
}
return json({ok:true,player:{id:p.id,full_name:p.full_name,player_code:p.player_code},...await buildInsights(db,p)})}catch(e){console.error('d12-player-insights-v1.6.3',e);return json({ok:false,error:e instanceof Error?e.message:'Unexpected server error'},500)}})};
