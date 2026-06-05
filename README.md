# FitAI — Ash's Six-Pack Journey 🏋️

A personal fitness dashboard that reads your WHOOP data daily and uses Claude AI to generate a fully personalized workout + meal plan every morning.

## How It Works

1. **GitHub Actions** runs every day at 6 AM IST (1 AM UTC)
2. It fetches your WHOOP data (recovery, sleep, strain, HRV)
3. Sends it to Claude AI which generates a personalized daily plan
4. Commits `src/data/daily-plan.json` to the repo
5. Rebuilds and deploys the site to GitHub Pages

---

## Setup Instructions

### 1. Create GitHub Repo

```bash
git init fitai
cd fitai
# Copy all these files in
git add .
git commit -m "🚀 Initial FitAI setup"
git remote add origin https://github.com/YOUR_USERNAME/fitai.git
git push -u origin main
```

### 2. Enable GitHub Pages

- Go to repo **Settings → Pages**
- Set Source to **GitHub Actions**

### 3. Add Secrets

Go to repo **Settings → Secrets and Variables → Actions → New Repository Secret**:

| Secret Name | Value |
|-------------|-------|
| `WHOOP_TOKEN` | Your WHOOP Bearer token (from network tab) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key from console.anthropic.com |

### 4. Update vite.config.js

Change the base path to match your repo name:
```js
base: '/fitai/',  // change 'fitai' to your actual repo name
```

### 5. Trigger First Run

Go to **Actions → Daily FitAI Update → Run workflow** to trigger manually.

---

## Token Refresh

WHOOP tokens expire. When the action fails:
1. Go to app.whoop.com → DevTools → Network tab
2. Find any API call → copy the `Authorization: Bearer XXXX` token
3. Update the `WHOOP_TOKEN` secret

---

## Local Development

```bash
npm install
npm run dev
```

To test the WHOOP fetch locally:
```bash
export WHOOP_TOKEN="your_token"
export ANTHROPIC_API_KEY="your_key"
npm run fetch-whoop
```
