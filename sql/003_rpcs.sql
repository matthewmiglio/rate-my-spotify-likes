-- 003_rpcs.sql — stored procedures for bulk operations

-- Bulk upsert songs for a user (called during sync)
create or replace function spotify_liker_upsert_songs(
  p_user_id uuid,
  p_songs jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  insert into spotify_liker_songs (user_id, spotify_track_id, track_name, artist_name, album_name, album_art_url, preview_url, added_at)
  select
    p_user_id,
    s->>'spotify_track_id',
    s->>'track_name',
    s->>'artist_name',
    s->>'album_name',
    s->>'album_art_url',
    s->>'preview_url',
    (s->>'added_at')::timestamptz
  from jsonb_array_elements(p_songs) as s
  on conflict (user_id, spotify_track_id) do update set
    track_name = excluded.track_name,
    artist_name = excluded.artist_name,
    album_name = excluded.album_name,
    album_art_url = excluded.album_art_url,
    preview_url = excluded.preview_url;
end;
$$;

-- Upsert a single rating
create or replace function spotify_liker_upsert_rating(
  p_user_id uuid,
  p_song_id uuid,
  p_rating smallint
)
returns void
language plpgsql
security definer
as $$
begin
  insert into spotify_liker_ratings (user_id, song_id, rating)
  values (p_user_id, p_song_id, p_rating)
  on conflict (song_id) do update set
    rating = excluded.rating,
    updated_at = now();
end;
$$;

-- Get songs at or below a rating threshold for a user
create or replace function spotify_liker_get_songs_below_threshold(
  p_user_id uuid,
  p_threshold smallint
)
returns table (
  song_id uuid,
  spotify_track_id text,
  track_name text,
  artist_name text,
  rating smallint
)
language sql
security definer
as $$
  select s.id as song_id, s.spotify_track_id, s.track_name, s.artist_name, r.rating
  from spotify_liker_songs s
  join spotify_liker_ratings r on r.song_id = s.id
  where s.user_id = p_user_id
    and r.rating <= p_threshold;
$$;
