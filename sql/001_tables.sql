-- 001_tables.sql — spotify_liker_users, spotify_liker_songs, spotify_liker_ratings tables

create extension if not exists "pgcrypto";

create table if not exists spotify_liker_users (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  display_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists spotify_liker_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references spotify_liker_users(id) on delete cascade,
  spotify_track_id text not null,
  track_name text,
  artist_name text,
  album_name text,
  album_art_url text,
  preview_url text,
  added_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, spotify_track_id)
);

create table if not exists spotify_liker_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references spotify_liker_users(id) on delete cascade,
  song_id uuid not null references spotify_liker_songs(id) on delete cascade unique,
  rating smallint not null check (rating >= 1 and rating <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_spotify_liker_songs_user_id on spotify_liker_songs(user_id);
create index if not exists idx_spotify_liker_ratings_user_id on spotify_liker_ratings(user_id);
create index if not exists idx_spotify_liker_ratings_song_id on spotify_liker_ratings(song_id);
