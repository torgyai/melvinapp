-- Camerascan toegevoegd als opnamemethode.
alter table capture_sessions drop constraint if exists capture_sessions_method_check;
alter table capture_sessions
  add constraint capture_sessions_method_check
  check (method is null or method in ('camera','ar','manual','lidar','import'));
