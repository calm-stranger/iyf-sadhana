-- Optional free-text a student may add about a practice. Never scored.
alter table sadhana_entries
  add column if not exists book_reading_detail       text,
  add column if not exists lecture_hearing_detail    text,
  add column if not exists seva_detail               text,
  add column if not exists study_or_household_detail text;
