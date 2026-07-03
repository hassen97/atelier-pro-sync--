-- Normalize "/" to "/dashboard" in all team_members allowed_pages arrays
UPDATE team_members
SET allowed_pages = (
  SELECT array_agg(DISTINCT CASE WHEN page = '/' THEN '/dashboard' ELSE page END ORDER BY CASE WHEN page = '/' THEN '/dashboard' ELSE page END)
  FROM unnest(allowed_pages) AS page
)
WHERE '/' = ANY(allowed_pages);