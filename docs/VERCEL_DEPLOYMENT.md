# Vercel Deployment Guide — Gramin Kirana Frontend (PWA)

Deploying the Gramin Kirana frontend on Vercel gives you high global CDN speed, instant edge caching, and free automatic SSL.

---

## 🚀 Step-by-Step Vercel Setup

### Step 1: Import Project on Vercel
1. Go to [https://vercel.com/new](https://vercel.com/new).
2. Connect your GitHub account and find:
   ```
   Paras65/gramin-grocery
   ```
3. Click **Import**.

---

### Step 2: Configure Project Settings
Vercel will detect `vercel.json` and auto-configure:
- **Framework Preset:** `Vite`
- **Root Directory:** `./` (leave default as root)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

---

### Step 3: Add Backend API Environment Variable
Under the **Environment Variables** section, add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://<your-render-backend>.onrender.com/api/v1` | URL of your Render backend API |

> 💡 *Example:* `https://gramin-kirana-pos.onrender.com/api/v1`

---

### Step 4: Click Deploy!
- Click **Deploy**.
- Within 30–45 seconds, your frontend will be live on `https://gramin-grocery.vercel.app`!

---

## ⚡ What `vercel.json` Configures Automatically:
- **SPA Rewrites:** All sub-routes reload cleanly without 404 errors.
- **PWA Service Worker:** `sw.js` and `manifest.json` are served with `Cache-Control: no-cache, no-store, must-revalidate` so users always get instant updates.
- **Immutable Asset Caching:** JavaScript and CSS bundles (`/assets/*`) are cached for 1 year with automatic hash busting.

