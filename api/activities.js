// GET /api/activities
// Refreshes the Strava access token using the stored refresh token, then
// returns the athlete's recent runs (trimmed to the fields the tracker needs).
// Called silently by the tracker every time it's opened — no button needed.
//
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   STRAVA_CLIENT_ID
//   STRAVA_CLIENT_SECRET
//   STRAVA_REFRESH_TOKEN
// Optional:
//   SYNC_SECRET  — if set, requests must include ?key=<SYNC_SECRET>

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const {
    STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET,
    STRAVA_REFRESH_TOKEN,
    SYNC_SECRET,
  } = process.env;

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    return res.status(500).json({
      error:
        'Server is missing Strava credentials. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and STRAVA_REFRESH_TOKEN in Vercel env vars.',
    });
  }

  if (SYNC_SECRET && req.query.key !== SYNC_SECRET) {
    return res.status(401).json({ error: 'Invalid or missing access key.' });
  }

  try {
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: STRAVA_REFRESH_TOKEN,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(502).json({ error: 'Strava token refresh failed.', detail: tokenData });
    }

    const after = req.query.after ? Number(req.query.after) : undefined;
    const perPage = Math.min(req.query.per_page ? Number(req.query.per_page) : 50, 100);
    const url = new URL('https://www.strava.com/api/v3/athlete/activities');
    url.searchParams.set('per_page', String(perPage));
    if (after) url.searchParams.set('after', String(after));

    const actRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const activities = await actRes.json();
    if (!Array.isArray(activities)) {
      return res.status(502).json({ error: 'Failed to fetch activities.', detail: activities });
    }

    const isRun = (a) =>
      ['Run', 'TrailRun'].includes(a.type) || ['Run', 'TrailRun'].includes(a.sport_type);
    const runs = activities.filter(isRun).map((a) => ({
      id: a.id,
      name: a.name,
      distance_mi: +(a.distance / 1609.344).toFixed(2),
      moving_time_s: a.moving_time,
      start_date_local: a.start_date_local,
      type: a.sport_type || a.type,
      avg_hr: a.average_heartrate || null,
      polyline: (a.map && a.map.summary_polyline) || null,
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ count: runs.length, runs });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error.', detail: String(err) });
  }
}
