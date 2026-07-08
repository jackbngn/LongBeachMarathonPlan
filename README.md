# Long Beach 2026 Tracker — Automatic Strava Sync

This is a deployable project. `index.html` is your training tracker; `api/` is a
small backend that holds your Strava credentials and refreshes tokens. Once set
up, **the tracker checks Strava every time you open it — no button, no manual
sync.** Finish a run, open the app later, and it's already logged against the
right day.

```
pfitz-strava/
├─ index.html          ← the tracker (deploy this)
├─ package.json
├─ README.md
└─ api/
   ├─ activities.js     ← returns your recent runs (called silently on load)
   ├─ auth.js           ← one-time: starts Strava authorization
   └─ callback.js       ← one-time: prints your refresh token
```

---

## How "automatic" actually works here

Your tracker is a webpage, not an installed app, so it can't get a true push
notification the instant a run lands on Strava. Instead: every time you *open*
the tracker, it silently calls your backend, which fetches your recent Strava
runs and matches them to plan days by date. In practice — for how you'd
actually use this (open the app, check today) — you'll never need to press a
sync button. The ⚡ Strava button in the nav is only for one-time setup and to
check connection status.

A day is only auto-filled if it isn't already logged by hand — anything you
type in yourself is never overwritten by a sync.

---

## Setup (about 10 minutes, done once)

### 1. Create a Strava API application
1. Go to https://www.strava.com/settings/api
2. Fill in the form (name it anything, e.g. "Long Beach Tracker").
   - **Authorization Callback Domain**: leave as `localhost` for now — update
     it in step 4 once you have your Vercel domain.
3. Note your **Client ID** and **Client Secret**.

### 2. Put this folder on GitHub
Create a new GitHub repo and push the contents of this `pfitz-strava` folder
(`index.html`, `package.json`, and the `api/` folder).

### 3. Deploy to Vercel
1. Go to https://vercel.com and **sign in first** (GitHub login is easiest).
2. **Import** the repo you just created.
3. Framework preset: **Other** — it's static + serverless, no build step.
4. Before deploying, add **Environment Variables**:
   - `STRAVA_CLIENT_ID` = your Client ID
   - `STRAVA_CLIENT_SECRET` = your Client Secret
   - *(recommended)* `SYNC_SECRET` = any random string — without this, your
     activities endpoint is publicly reachable by anyone with the URL.
5. Deploy. You'll get a URL like `https://your-app.vercel.app`.

### 4. Point Strava at your domain
Back at https://www.strava.com/settings/api, set **Authorization Callback
Domain** to your Vercel host (just the domain, no `https://`), e.g.
`your-app.vercel.app`.

### 5. Get your refresh token (one time)
1. Visit `https://your-app.vercel.app/api/auth`
2. Approve access on Strava's screen.
3. You'll land on a page showing your **refresh token**. Copy it.
4. In Vercel → Settings → Environment Variables, add:
   - `STRAVA_REFRESH_TOKEN` = the value you copied
5. **Redeploy** (Vercel → Deployments → ⋯ → Redeploy) so the new variable
   loads.

### 6. Connect the tracker
Open your tracker (deployed URL, or added to your home screen), tap **⚡
Strava**, and enter:
- **Backend URL**: `https://your-app.vercel.app`
- **Access key**: the `SYNC_SECRET` value, if you set one

Tap **Save & sync now** once. From then on, sync happens automatically every
time you open the app — you're done touching this screen.

---

## How matching works
- Each run is placed on the plan day with the same calendar date.
- Two runs on the same day are summed, with a note like "2 runs".
- A day already logged by hand (tapped Complete or edited manually) is never
  touched by auto-sync — synced entries carry a small **Strava** tag so you
  can tell them apart from manual ones.
- Runs outside the plan's date range, or non-running activities, are ignored.
- Only the last ~2 weeks of activity are fetched each time (fast, avoids
  re-processing your whole history).

## Notes
- Access tokens refresh automatically on every sync — you never deal with
  Strava's ~6 hour token expiry.
- `activity:read_all` scope is requested so private activities sync too.
- If the ⚡ Strava button shows a ⚠, tap it to see the error in the status
  line — usually an expired/incorrect backend URL or a redeploy still
  pending.
- This still respects Strava's API terms: it only ever shows *your* data to
  *you*.
