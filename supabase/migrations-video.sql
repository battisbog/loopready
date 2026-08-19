-- Video-avatar interview columns. Additive and nullable, so applying this while
-- the feature is flagged off changes nothing about existing behaviour.
alter table sessions add column if not exists video_conversation_id text;
alter table sessions add column if not exists video_started_at timestamptz;
alter table sessions add column if not exists video_ended_at timestamptz;

-- Settlement state for the reserved credit, so ending twice cannot charge twice.
--   null | reserved  -> not settled yet
--   committed | released | refunded -> final
alter table sessions add column if not exists video_credit_state text;

-- Finds sessions still holding a room, for the stale-session sweep.
create index if not exists sessions_video_open_idx
  on sessions (video_started_at)
  where video_conversation_id is not null and video_ended_at is null;
