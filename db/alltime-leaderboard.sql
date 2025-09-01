-- Create function for all-time leaderboard
CREATE OR REPLACE FUNCTION public.get_alltime_leaderboard()
RETURNS TABLE (
  address text,
  alias text,
  pfp_url text,
  wins bigint,
  draws bigint,
  losses bigint,
  points bigint
) 
LANGUAGE sql
AS $$
  WITH latest_profiles AS (
    -- Get the most recent alias and pfp_url for each address
    SELECT DISTINCT ON (address)
      address,
      alias,
      pfp_url
    FROM public.leaderboard_entries
    WHERE alias IS NOT NULL
    ORDER BY address, updated_at DESC
  )
  SELECT 
    le.address,
    lp.alias,
    lp.pfp_url,
    SUM(le.wins)::bigint as wins,
    SUM(le.draws)::bigint as draws,
    SUM(le.losses)::bigint as losses,
    SUM(le.points)::bigint as points
  FROM public.leaderboard_entries le
  LEFT JOIN latest_profiles lp ON le.address = lp.address
  GROUP BY le.address, lp.alias, lp.pfp_url
  ORDER BY SUM(le.points) DESC, SUM(le.wins) DESC;
$$;
