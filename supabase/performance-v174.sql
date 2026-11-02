create or replace function public.d12_turn_performance_v174(p_player uuid,p_from date,p_to date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare today date := (now() at time zone 'Africa/Lagos' - interval '6 hours')::date;
d date; m record; played int; wins int; losses int; streak int; best int; days jsonb := '[]'::jsonb;
begin
if p_from is null or p_to is null or p_from>p_to or p_to>today or p_from<today-365 then raise exception 'Select a range within the past year'; end if;
for d in select generate_series(p_from::timestamp,p_to::timestamp,interval '1 day')::date loop
played:=0; wins:=0; losses:=0; streak:=0; best:=0;
for m in select winner_player_id,loser_player_id from public.d12_turn_matches
where status='completed' and (winner_player_id=p_player or loser_player_id=p_player)
and ended_at >= ((d+time '06:00') at time zone 'Africa/Lagos')
and ended_at < (((d+1)+time '06:00') at time zone 'Africa/Lagos')
order by ended_at,started_at,id loop
played:=played+1;
if m.winner_player_id=p_player then wins:=wins+1; streak:=streak+1; best:=greatest(best,streak);
else losses:=losses+1; streak:=0; end if;
end loop;
days:=days||jsonb_build_array(jsonb_build_object('date',d,'played',played,'wins',wins,'losses',losses,'win_rate',case when played=0 then 0 else round(100.0*wins/played,1) end,'streak',streak,'best_streak',best));
end loop;
return jsonb_build_object('days',days,'from',p_from,'to',p_to,'operational_date',today,'timezone','Africa/Lagos','boundary','06:00');
end $$;
revoke all on function public.d12_turn_performance_v174(uuid,date,date) from public,anon,authenticated;
grant execute on function public.d12_turn_performance_v174(uuid,date,date) to service_role;
