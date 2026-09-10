-- The ISSO 82.1 opnameformulier, filled in during the capture and kept with the
-- property so a report can show where every value came from.

alter table capture_sessions add column if not exists opname jsonb;
alter table properties       add column if not exists opname jsonb;
alter table capture_photos   add column if not exists opname_key text;

create index if not exists capture_photos_opname_idx on capture_photos (session_id, opname_key);
