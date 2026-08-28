-- Bedtime past midnight (e.g. 01:30) belongs to the next day and must score 0,
-- not 25. Add an optional "wraps before" cutoff to the time-band scorer and use
-- it for slept_at. Keep in sync with src/lib/scoring.ts + sadhana-schema.ts.

drop function if exists compute_day_score(sadhana_entries);
drop function if exists score_time_band(time, int[][], int);

create or replace function score_time_band(
  v time, bands int[][], else_score int, wrap_before int default null
) returns int language plpgsql immutable as $$
declare
  mins int;
  b int[];
begin
  if v is null then return 0; end if;
  mins := extract(hour from v) * 60 + extract(minute from v);
  if wrap_before is not null and mins < wrap_before then
    mins := mins + 1440;               -- treat as next-day
  end if;
  foreach b slice 1 in array bands loop
    if mins < b[1] then return b[2]; end if;
  end loop;
  return else_score;
end;
$$;

create or replace function compute_day_score(e sadhana_entries) returns int
language sql immutable as $$
  select
      score_time_band(e.woke_up_at,
        array[array[300,25],array[330,20],array[360,15],array[390,10],array[420,5]], 0)
    + score_time_band(e.chanting_completed_at,
        array[array[720,25],array[750,20],array[780,15],array[810,10],array[840,5]], 0)
    + score_time_band(e.slept_at,
        array[array[1321,25]], 0, 720)   -- <= 22:00; 00:00–11:59 wraps to next day
    + case when e.mangal_arati       then 25 else 0 end
    + case when e.nrsimha_arati      then 20 else 0 end
    + case when e.siksastakam        then 10 else 0 end
    + case when e.book_reading       then 20 else 0 end
    + case when e.lecture_hearing    then 20 else 0 end
    + case when e.seva               then 10 else 0 end
    + case when e.study_or_household then 20 else 0 end
$$;

-- recompute every stored score so day_score matches the current rules
update sadhana_entries set day_score = compute_day_score(sadhana_entries.*);
