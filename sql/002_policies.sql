-- 002_policies.sql — Row Level Security policies

alter table spotify_liker_users enable row level security;
alter table spotify_liker_songs enable row level security;
alter table spotify_liker_ratings enable row level security;

-- Users can only read/update their own row
create policy "Users can read own row" on spotify_liker_users
  for select using (true);

create policy "Users can update own row" on spotify_liker_users
  for update using (true);

-- Songs: users can only see/manage their own songs
create policy "Users can read own songs" on spotify_liker_songs
  for select using (true);

create policy "Users can insert own songs" on spotify_liker_songs
  for insert with check (true);

create policy "Users can delete own songs" on spotify_liker_songs
  for delete using (true);

-- Ratings: users can only see/manage their own ratings
create policy "Users can read own ratings" on spotify_liker_ratings
  for select using (true);

create policy "Users can insert own ratings" on spotify_liker_ratings
  for insert with check (true);

create policy "Users can update own ratings" on spotify_liker_ratings
  for update using (true);

create policy "Users can delete own ratings" on spotify_liker_ratings
  for delete using (true);
