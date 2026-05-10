# 🛰️ Astraeus Research Node (V9.4)

Welcome to the Astraeus Research Network. This repository contains the **Archivist Logic** for your research node. By deploying this, you are contributing to the global decentralized research effort.

## 🚀 "One-Shot" Deployment

### 1. Import to Cloudflare
*   Go to your [Cloudflare Dashboard](https://dash.cloudflare.com).
*   Click **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**.
*   Select this repository and click **Begin setup**.

### 2. Connect Your Memory (Vital)
Before you click deploy, you need to link your database:
1.  Open your `wrangler.toml` file in this repo.
2.  Find `id = "PASTE_YOUR_KV_ID_HERE"`.
3.  Replace it with your **KV Namespace ID** (found under Storage -> KV in Cloudflare).

### 3. Final Activation
Once the node is deployed:
1.  Go to **Settings** → **Variables** in your Cloudflare Worker.
2.  Update `ENTITY_KEY` from `test1` to your **Unique Team Key**.
3.  **Save and Deploy**.

## 🛠️ Usage
*   **Check Status:** `[your-url]/status` (Green means you are connected!)
*   **Force Sync:** `[your-url]/sync` (Downloads new missions)
*   **Manual Run:** `[your-url]/run` (Triggers one research cycle)

---
*ASTRAEUS SYSTEMS // MISSION CONTROL*
