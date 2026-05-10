# 🛰️ Astraeus Research Node (V9.4)

Welcome to the Astraeus Research Network. This repository contains the logic for your **Research Archivist** node. By deploying this to Cloudflare, you are contributing to the global decentralized research effort.

## 🚀 One-Shot Setup

1. **Import to Cloudflare**:
   - Go to the [Cloudflare Dashboard](https://dash.cloudflare.com).
   - Click **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
   - Select this repository.

2. **Configure your Node**:
   - Open the `wrangler.toml` file in this repository.
   - Replace `PASTE_YOUR_KV_ID_HERE` with your actual KV Namespace ID.
   - Update `ENTITY_KEY` if your team has a custom key (Default is `test1`).

3. **Deploy**:
   - Save your changes. Cloudflare will detect the commit and deploy your node automatically.

## 🛠️ Verification
Once deployed, visit your node's URL and append these paths:
- `/status`: Verify that your storage, AI, and keys are linked correctly.
- `/sync`: Perform the initial handshake with Mission Control.
- `/run`: Manually trigger your first research cycle.

---
**Powered by Astraeus Systems // 2026**