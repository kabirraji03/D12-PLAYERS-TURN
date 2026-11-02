-- v1.7.15: no match rows are deleted. Only unfinished frames may be marked void.
create extension if not exists pg_cron with schema pg_catalog;
create or replace function public.d12_turn_clear_queues_v175(p_scheduled boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cutoff timestamptz := case when p_scheduled then (((now() at time zone 'Africa/Lagos'-interval '6 hours')::date+time '06:00') at time zone 'Africa/Lagos') else now() end;
n integer; unfinished integer;
begin
perform pg_advisory_xact_lock(hashtext('d12_queue_clear_v175'));
-- Lock tables against simultaneous match start/check-in so each transition is atomic.
lock table public.d12_turn_queue, public.d12_turn_matches, public.d12_turn_table_state in share row exclusive mode;
update public.d12_turn_matches set status='void',ended_at=cutoff where status='in_progress' and (not p_scheduled or started_at<cutoff);
get diagnostics unfinished=row_count;
update public.d12_turn_queue set status='cancelled',finished_at=cutoff,updated_at=now(),note=case when p_scheduled then 'Club-day queue cleared; records retained' else 'Admin-approved queue clear; records retained' end
where status in ('awaiting_payment','queued','called','active') and (not p_scheduled or joined_at<cutoff);
get diagnostics n=row_count;
update public.d12_turn_table_state set holder_player_id=null,current_match_id=null,activity_status='waiting',holder_mode='active',break_owner_player_id=null,break_started_at=null,holder_ready_at=null,break_initial_match_done=false,last_activity_at=now()
where not p_scheduled or last_activity_at<cutoff or last_activity_at is null or current_match_id in (select id from public.d12_turn_matches where status='void' and ended_at=cutoff);
update public.d12_turn_checkin_requests set status='declined',resolved_at=now(),updated_at=now() where status='pending' and (not p_scheduled or created_at<cutoff);
update public.d12_turn_player_transfer_requests set status='cancelled',resolved_at=now(),updated_at=now() where status='pending' and (not p_scheduled or requested_at<cutoff);
update public.d12_turn_table_move_requests set status='declined',resolved_at=now(),updated_at=now() where status='pending' and (not p_scheduled or requested_at<cutoff);
update public.d12_turn_move_requests set status='expired',responded_at=now() where status='pending' and (not p_scheduled or requested_at<cutoff);
if p_scheduled then
update public.d12_turn_reset_requests set status='declined',resolved_at=now(),updated_at=now() where status='pending' and created_at<cutoff;
update public.d12_turn_reset_all_requests set status='declined',resolved_at=now(),updated_at=now() where status='pending' and requested_at<cutoff;
end if;
update public.d12_turn_payments set status='void' where kind='appeal' and status='pending' and (not p_scheduled or created_at<cutoff);
return jsonb_build_object('players_cleared',n,'unfinished_frames_retained',unfinished,'cutoff',cutoff);
end $$;
revoke all on function public.d12_turn_clear_queues_v175(boolean) from public,anon,authenticated;
grant execute on function public.d12_turn_clear_queues_v175(boolean) to service_role;

create or replace function public.d12_turn_approve_reset_v175(p_request uuid,p_all boolean,p_staff uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
perform pg_advisory_xact_lock(hashtext('d12_queue_clear_v175'));
if p_all then
 perform 1 from public.d12_turn_reset_all_requests where id=p_request and status='pending' for update;
else
 perform 1 from public.d12_turn_reset_requests where id=p_request and status='pending' for update;
end if;
if not found then raise exception 'Pending reset request not found';end if;
result:=public.d12_turn_clear_queues_v175(false);
update public.d12_turn_reset_requests set status=case when not p_all and id=p_request then 'approved' else 'declined' end,resolved_by_staff_id=p_staff,resolved_at=now(),updated_at=now() where status='pending';
update public.d12_turn_reset_all_requests set status=case when p_all and id=p_request then 'approved' else 'declined' end,resolved_by_staff_id=p_staff,resolved_at=now(),updated_at=now() where status='pending';
return result;
end $$;
revoke all on function public.d12_turn_approve_reset_v175(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.d12_turn_approve_reset_v175(uuid,boolean,uuid) to service_role;
-- pg_cron uses UTC; 05:00 UTC is 06:00 Africa/Lagos. No browser timers or feeds.
select cron.schedule('d12-club-day-queue-clear','0 5 * * *','select public.d12_turn_clear_queues_v175(true);');

create or replace function public.d12_turn_performance_days_v175(p_player uuid,p_from date,p_to date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare d date;m record;played int;wins int;losses int;streak int;best int;seconds numeric;timed int;form jsonb;days jsonb:='[]'::jsonb;
begin
if p_from is null or p_to is null or p_from>p_to or p_to-p_from>366 or p_from<(now() at time zone 'Africa/Lagos'-interval '6 hours')::date-732 then raise exception 'Invalid performance period';end if;
for d in select generate_series(p_from::timestamp,p_to::timestamp,interval '1 day')::date loop
played:=0;wins:=0;losses:=0;streak:=0;best:=0;seconds:=0;timed:=0;form:='[]'::jsonb;
for m in select winner_player_id,started_at,ended_at from public.d12_turn_matches where status='completed' and (winner_player_id=p_player or loser_player_id=p_player)
and ended_at>=((d+time '06:00') at time zone 'Africa/Lagos') and ended_at<(((d+1)+time '06:00') at time zone 'Africa/Lagos') order by ended_at,started_at,id loop
played:=played+1;
if m.winner_player_id=p_player then wins:=wins+1;streak:=streak+1;best:=greatest(best,streak);form:=form||'"W"'::jsonb;else losses:=losses+1;streak:=0;form:=form||'"L"'::jsonb;end if;
if m.started_at is not null and m.ended_at>=m.started_at then seconds:=seconds+extract(epoch from m.ended_at-m.started_at);timed:=timed+1;end if;
end loop;
days:=days||jsonb_build_array(jsonb_build_object('date',d,'played',played,'wins',wins,'losses',losses,'win_rate',case when played=0 then 0 else round(100.0*wins/played,1) end,'streak',streak,'best_streak',best,'frame_seconds',seconds,'timed_frames',timed,'avg_frame_minutes',case when timed=0 then null else round(seconds/60/timed,1) end,'form',form));
end loop;return days;
end $$;
revoke all on function public.d12_turn_performance_days_v175(uuid,date,date) from public,anon,authenticated;
grant execute on function public.d12_turn_performance_days_v175(uuid,date,date) to service_role;

create or replace function public.d12_turn_performance_v175(p_player uuid,p_from date,p_to date,p_period text default 'day')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare today date:=(now() at time zone 'Africa/Lagos'-interval '6 hours')::date;prev_from date;prev_to date;span int;
begin
if p_from is null or p_to is null or p_from>p_to or p_to>today or p_from<today-365 then raise exception 'Select a range within the past year';end if;
span:=p_to-p_from+1;
prev_from:=case p_period when 'month' then (p_from-interval '1 month')::date when 'quarter' then (p_from-interval '3 months')::date when 'six' then (p_from-interval '6 months')::date when 'year' then (p_from-interval '1 year')::date else p_from-span end;
prev_to:=least(p_from-1,prev_from+span-1);
return jsonb_build_object('from',p_from,'to',p_to,'days',public.d12_turn_performance_days_v175(p_player,p_from,p_to),'previous',jsonb_build_object('from',prev_from,'to',prev_to,'days',public.d12_turn_performance_days_v175(p_player,prev_from,prev_to)),'operational_date',today,'period',p_period,'timezone','Africa/Lagos');
end $$;
revoke all on function public.d12_turn_performance_v175(uuid,date,date,text) from public,anon,authenticated;
grant execute on function public.d12_turn_performance_v175(uuid,date,date,text) to service_role;
create or replace function public.d12_turn_log_matches_v175(p_date date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare today date:=(now() at time zone 'Africa/Lagos'-interval '6 hours')::date;result jsonb;
begin
if p_date is null or p_date<today-365 or p_date>today then raise exception 'Select a date within the past year';end if;
select coalesce(jsonb_agg(to_jsonb(m) order by m.started_at,m.id),'[]'::jsonb) into result from public.d12_turn_matches m where
case when m.status='completed' then m.ended_at else m.started_at end >=((p_date+time '06:00') at time zone 'Africa/Lagos') and
case when m.status='completed' then m.ended_at else m.started_at end <(((p_date+1)+time '06:00') at time zone 'Africa/Lagos');
return result;
end $$;
revoke all on function public.d12_turn_log_matches_v175(date) from public,anon,authenticated;
grant execute on function public.d12_turn_log_matches_v175(date) to service_role;
