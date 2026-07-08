// GET /api/callback — one-time setup helper.
// Strava redirects here after you authorize. It exchanges the code for tokens
// and shows your refresh token so you can paste it into STRAVA_REFRESH_TOKEN.

export default async function handler(req, res) {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env;
  const code = req.query.code;

  if (!code) return res.status(400).send('Missing authorization code.');
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return res.status(500).send('Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET.');
  }

  try {
    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });
    const data = await r.json();

    if (!data.refresh_token) {
      return res
        .status(502)
        .send('<pre>Token exchange failed:\n' + JSON.stringify(data, null, 2) + '</pre>');
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.6;color:#111">
      <h2 style="margin-bottom:4px">✅ Strava connected</h2>
      <p>Add the value below as an environment variable named <code>STRAVA_REFRESH_TOKEN</code> in your Vercel project settings, then redeploy.</p>
      <p style="margin-bottom:4px;font-weight:600">Refresh token</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:8px;word-break:break-all;white-space:pre-wrap;border:1px solid #ddd">${data.refresh_token}</pre>
      <p style="color:#666;font-size:14px">Once redeployed, your tracker will auto-sync with Strava every time you open it. You can close this tab — this page is only needed once.</p>
    </body></html>`);
  } catch (e) {
    return res.status(500).send('Error: ' + String(e));
  }
}
