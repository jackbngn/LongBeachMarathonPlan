// GET /api/auth  — one-time setup helper.
// Redirects you to Strava's consent screen. After you approve, Strava sends
// you back to /api/callback, which prints your refresh token.

export default function handler(req, res) {
  const { STRAVA_CLIENT_ID } = process.env;
  if (!STRAVA_CLIENT_ID) {
    return res.status(500).send('Missing STRAVA_CLIENT_ID environment variable.');
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirectUri = `${proto}://${host}/api/callback`;

  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id', STRAVA_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('approval_prompt', 'force');
  url.searchParams.set('scope', 'read,activity:read_all');

  res.writeHead(302, { Location: url.toString() });
  res.end();
}
