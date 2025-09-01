-- Step 0: Create backup
CREATE TABLE public.leaderboard_entries_backup AS 
SELECT * FROM public.leaderboard_entries;

-- Start transaction for safety
BEGIN;

-- Step 1: Create a temporary table to map all IDs to canonical addresses
CREATE TEMP TABLE user_mappings AS
WITH user_aliases AS (
  SELECT DISTINCT
    COALESCE(alias, address) as username,
    address,
    CASE 
      WHEN address LIKE '0x%' THEN 'wallet'
      WHEN address LIKE 'fc:%' THEN 'farcaster'
      WHEN address LIKE 'anon:%' THEN 'anonymous'
      ELSE 'other'
    END as address_type,
    updated_at
  FROM public.leaderboard_entries_backup
  WHERE alias IS NOT NULL OR address LIKE '0x%'
),
canonical_addresses AS (
  SELECT 
    username,
    -- Prefer wallet addresses over farcaster/anon
    FIRST_VALUE(address) OVER (
      PARTITION BY username 
      ORDER BY 
        CASE address_type
          WHEN 'wallet' THEN 1
          WHEN 'farcaster' THEN 2
          ELSE 3
        END,
        updated_at DESC
    ) as canonical_address
  FROM user_aliases
)
SELECT DISTINCT
  le.address as original_address,
  COALESCE(ca.canonical_address, le.address) as canonical_address
FROM public.leaderboard_entries_backup le
LEFT JOIN canonical_addresses ca ON le.alias = ca.username;

-- Step 2: Delete all existing entries
DELETE FROM public.leaderboard_entries;

-- Step 3: Insert consolidated data
WITH stats_with_latest AS (
  SELECT 
    le.season,
    um.canonical_address as address,
    le.alias,
    le.pfp_url,
    le.wins,
    le.draws,
    le.losses,
    le.points,
    le.inserted_at,
    le.updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY le.season, um.canonical_address 
      ORDER BY le.updated_at DESC
    ) as rn
  FROM public.leaderboard_entries_backup le
  JOIN user_mappings um ON le.address = um.original_address
),
consolidated_stats AS (
  SELECT 
    season,
    address,
    -- Take the most recent alias and pfp
    FIRST_VALUE(alias) OVER (PARTITION BY season, address ORDER BY updated_at DESC) as alias,
    FIRST_VALUE(pfp_url) OVER (PARTITION BY season, address ORDER BY updated_at DESC) as pfp_url,
    SUM(wins) as wins,
    SUM(draws) as draws,
    SUM(losses) as losses,
    SUM(points) as points,
    MIN(inserted_at) as inserted_at,
    MAX(updated_at) as updated_at
  FROM stats_with_latest
  GROUP BY season, address, updated_at, alias, pfp_url
)
INSERT INTO public.leaderboard_entries (
  season,
  address,
  alias,
  pfp_url,
  wins,
  draws,
  losses,
  points,
  inserted_at,
  updated_at
)
SELECT DISTINCT ON (season, address)
  season,
  address,
  alias,
  pfp_url,
  wins,
  draws,
  losses,
  points,
  inserted_at,
  updated_at
FROM consolidated_stats
ORDER BY season, address, updated_at DESC;

-- Step 4: Verify cleanup - show counts before and after
SELECT 
  'Before cleanup' as stage,
  season,
  COUNT(*) as total_entries,
  COUNT(DISTINCT address) as unique_addresses,
  COUNT(DISTINCT alias) as unique_aliases
FROM public.leaderboard_entries_backup
GROUP BY season
UNION ALL
SELECT 
  'After cleanup' as stage,
  season,
  COUNT(*) as total_entries,
  COUNT(DISTINCT address) as unique_addresses,
  COUNT(DISTINCT alias) as unique_aliases
FROM public.leaderboard_entries
GROUP BY season
ORDER BY season, stage;

-- If everything looks good, commit the transaction
COMMIT;

-- Optional: Drop backup if you're satisfied with the results
-- DROP TABLE public.leaderboard_entries_backup;