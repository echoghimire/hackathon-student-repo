// student_worker_v9.js (V9.0 - "The Archivist")
export default {
  async scheduled(event, env, ctx) {
    if (event.cron === "0 0 * * *") {
      await this.syncManifest(env);
    } else {
      await this.processCycle(env);
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/run") {
      return new Response(await this.processCycle(env));
    }

    if (url.pathname === "/sync") {
      return new Response(await this.syncManifest(env));
    }

    if (url.pathname === "/clear") {
      await env.AGENT_STORAGE.delete("index");
      const keys = await env.AGENT_STORAGE.list();
      for (const key of keys.keys) {
        await env.AGENT_STORAGE.delete(key.name);
      }
      return new Response("Storage Cleared");
    }

    if (url.pathname.startsWith("/article/")) {
      const id = url.pathname.split("/")[2];
      const post = await env.AGENT_STORAGE.get(`post_${id}`);
      return new Response(post || "Not Found", {
        headers: { "Content-Type": "text/html" }
      });
    }

    const indexRows = JSON.parse(await env.AGENT_STORAGE.get("index") || "[]");
    return new Response(
      this.renderLayout(env, "Astraeus Research Hub", this.renderIndex(indexRows)),
      { headers: { "Content-Type": "text/html" } }
    );
  },

  async syncManifest(env) {
    const res = await fetch(`${env.HUB_URL}/get-daily-manifest`, {
      headers: { Authorization: `Bearer ${env.ENTITY_KEY}` }
    });
    if (!res.ok) return "Manifest Sync Failed: " + res.status;
    await env.AGENT_STORAGE.put("DAILY_QUEUE", await res.text());
    return "Manifest Synced";
  },

  async processCycle(env) {
    let queue = JSON.parse(await env.AGENT_STORAGE.get("DAILY_QUEUE") || "[]");
    if (queue.length === 0) return "Queue Empty - Run /sync first";

    const mission = queue.shift();
    await env.AGENT_STORAGE.put("DAILY_QUEUE", JSON.stringify(queue));

    // V9 Optimization: Removed Image Prompting to save tokens
    const prompt = `
      Write a Senior Research Paper on: "${mission.title}".
      NODE: ${mission.source_node.name}
      SIG: ${mission.seed}
      
      REQUIRED SECTIONS:
      1. ### ABSTRACT - High level summary.
      2. ### TECHNICAL DATA - A detailed table of 5 experimental metrics (Simulate research data).
      3. ### CORE ANALYSIS - Deep academic discourse.
      4. ### FUTURE PROJECTIONS - Impact on industry.
      
      CONSTRAINTS:
      - LENGTH: 700-1000 words. 
      - STYLE: Academic, no conversational filler.
      - INTEGRATION: Use the variable "${mission.seed}" as the primary data point.
      - TABLE: Use standard Markdown | pipes for the Technical Data section.
    `;

    try {
      const ai = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1400, // Reduced slightly to stay safe within CPU/Neuron limits
        temperature: 0.6
      });

      const text = ai.response;
      let body = this.formatContent(text.trim());

      const excerpt = text.substring(0, 160).replace(/[#*|]/g, "").trim() + "...";
      
      // V9 IMAGE ENGINE: Using LoremFlickr for real-world science photography
      // Deterministic based on the seed so the image stays the same for that article
      const imgKeywords = `science,technology,laboratory,${mission.title.split(' ')[0]}`;
      const imgUrl = `https://loremflickr.com/1280/720/${encodeURIComponent(imgKeywords)}?lock=${mission.seed.length}`;

      const articleId = Date.now();
      const articleHtml = `
        <div class="article-v9">
          <div class="v9-nav">
            <a href="/" class="v9-link">← CORE ARCHIVE</a>
            <div class="status-pill status-ready">V9 ARCHIVIST ENABLED</div>
          </div>

          <header class="v9-header">
            <div class="v9-eyebrow">RESEARCH LOG // ${mission.seed.toUpperCase()}</div>
            <h1 class="v9-title">${mission.title}</h1>
            <div class="v9-meta">
              <span>POSTED: ${new Date().toLocaleDateString()}</span>
              <span>ORACLE: ${mission.source_node.name}</span>
            </div>
          </header>

          <div class="v9-hero">
            <img src="${imgUrl}" class="v9-img" loading="lazy" />
            <div class="v9-overlay-tag">SECURE IMAGE FEED: ${mission.seed}</div>
          </div>

          <div class="v9-layout">
            <aside class="v9-sidebar">
              <div class="stat-card">
                <small>TELEMETRY SIG</small>
                <div class="stat-hex">${mission.seed.slice(0,4)}</div>
              </div>
              <div class="stat-card">
                <small>SOURCE AUTH</small>
                <div class="stat-val">CERTIFIED</div>
              </div>
            </aside>
            
            <article class="v9-body">
              ${body}
            </article>
          </div>

          <footer class="v9-footer">
            <div class="source-grid">
               <a href="${mission.source_node.url}" class="source-item">
                  <strong>PRIMARY SOURCE</strong>
                  <span>${mission.source_node.name}</span>
               </a>
               <a href="${mission.yield_protocol.url}" class="source-item highlight">
                  <strong>VERIFY PROTOCOL</strong>
                  <span>Access Yield Node</span>
               </a>
            </div>
          </footer>
        </div>
      `;

      await env.AGENT_STORAGE.put(`post_${articleId}`, this.renderLayout(env, mission.title, articleHtml));
      
      const index = JSON.parse(await env.AGENT_STORAGE.get("index") || "[]");
      index.unshift({ id: articleId, title: mission.title, excerpt, img: imgUrl, date: new Date().toLocaleDateString() });
      await env.AGENT_STORAGE.put("index", JSON.stringify(index.slice(0, 15)));

      return "V9 Process Success: " + mission.title;
    } catch (e) {
      return "Critical Cycle Error: " + e.message;
    }
  },

  formatContent(text) {
    return text
      .replace(/^### (.*$)/gim, '<h2 class="v9-sh">$1</h2>')
      .replace(/^## (.*$)/gim, '<h2 class="v9-sh">$2</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .split('\n\n')
      .map(p => {
         const t = p.trim();
         if (!t) return '';
         if (t.startsWith('<h')) return t;
         if (t.includes('|')) {
           const rows = t.split('\n').filter(r => r.includes('|'));
           if (rows.length > 0) {
             return `<div class="v9-table-wrap"><table>${rows.map(r => `<tr>${r.split('|').filter(c => c.trim() && !c.includes('---')).map(c => `<td>${c.trim()}</td>`).join('')}</tr>`).join('')}</table></div>`;
           }
         }
         return `<p>${t.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
  },

  renderIndex(index) {
    if (index.length === 0) return `<div class="v8-empty"><h2>NODE OFFLINE</h2><p>Execute /sync then /run</p></div>`;
    const hero = index[0];
    const grid = index.slice(1).map(p => `
      <div class="v9-card" onclick="location.href='/article/${p.id}'">
        <div class="v9-card-img"><img src="${p.img}" loading="lazy" /></div>
        <div class="v9-card-body">
          <small>${p.date} // ARCHIVE</small>
          <h3>${p.title}</h3>
          <p>${p.excerpt}</p>
        </div>
      </div>`).join("");

    return `
      <header class="v9-hero-section" onclick="location.href='/article/${hero.id}'">
        <div class="v9-hero-back" style="background-image:url('${hero.img}')"></div>
        <div class="v9-hero-content">
          <div class="v9-badge">PRIME INVESTIGATION</div>
          <h1>${hero.title}</h1>
          <p>${hero.excerpt}</p>
        </div>
      </header>
      <div class="v9-grid-feed">${grid}</div>
    `;
  },

  renderLayout(env, title, content) {
    const hue = env.ENTITY_KEY.split("").reduce((a, b) => a + b.charCodeAt(0), 0) % 360;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&family=Crimson+Pro:wght@400;600&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet"/>
    <style>
      :root{--accent:hsl(${hue},100%,70%);--bg:#070708;--surface:#111216;--text:#eeeff2;--muted:#8b919e;--border:#1f2229;}
      body{margin:0;font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}
      .v8-wrapper{max-width:1100px;margin:auto;padding:40px 20px 100px;}
      
      /* V9 Global Styles */
      a{color:inherit;text-decoration:none;}
      h1,h2,h3{letter-spacing:-0.03em;font-weight:800;}
      
      /* Index / Feed */
      .v9-hero-section{height:500px;position:relative;border-radius:32px;overflow:hidden;cursor:pointer;margin-bottom:40px;display:flex;align-items:flex-end;}
      .v9-hero-back{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0.5;filter:grayscale(20%);transition:1s;}
      .v9-hero-section:hover .v9-hero-back{transform:scale(1.05);opacity:0.7;}
      .v9-hero-content{position:relative;padding:60px;width:100%;background:linear-gradient(transparent, rgba(0,0,0,0.9));}
      .v9-badge{background:var(--accent);color:#000;font-size:10px;font-weight:900;padding:6px 14px;border-radius:99px;width:max-content;margin-bottom:20px;}
      .v9-hero-content h1{font-size:52px;margin:0 0 15px;line-height:0.9;}
      .v9-hero-content p{max-width:600px;color:rgba(255,255,255,0.6);font-size:18px;}

      .v9-grid-feed{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:30px;}
      .v9-card{background:var(--surface);border:1px solid var(--border);border-radius:24px;overflow:hidden;cursor:pointer;transition:0.3s;}
      .v9-card:hover{transform:translateY(-8px);border-color:var(--accent);}
      .v9-card-img{height:180px;background:#000;}
      .v9-card-img img{width:100%;height:100%;object-fit:cover;opacity:0.8;}
      .v9-card-body{padding:25px;}
      .v9-card-body small{font-family:'IBM Plex Mono';font-size:10px;color:var(--accent);display:block;margin-bottom:12px;}
      .v9-card-body h3{font-size:22px;margin:0 0 12px;}
      .v9-card-body p{font-size:14px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}

      /* Article Styles */
      .article-v9{max-width:900px;margin:auto;}
      .v9-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;}
      .v9-link{font-family:'IBM Plex Mono';font-size:12px;color:var(--muted);font-weight:700;}
      .v9-link:hover{color:var(--accent);}
      .status-pill{font-family:'IBM Plex Mono';font-size:10px;background:var(--border);padding:6px 12px;border-radius:8px;}
      
      .v9-header{margin-bottom:50px;}
      .v9-eyebrow{font-family:'IBM Plex Mono';font-size:12px;color:var(--accent);letter-spacing:4px;margin-bottom:15px;}
      .v9-title{font-size:72px;line-height:0.95;margin:0 0 20px;letter-spacing:-4px;}
      .v9-meta{font-size:12px;color:var(--muted);display:flex;gap:20px;text-transform:uppercase;letter-spacing:1px;}

      .v9-hero{border-radius:32px;overflow:hidden;margin-bottom:60px;border:1px solid var(--border);position:relative;}
      .v9-img{width:100%;display:block;}
      .v9-overlay-tag{position:absolute;bottom:20px;right:20px;background:rgba(0,0,0,0.8);color:white;font-family:'IBM Plex Mono';font-size:9px;padding:8px 15px;border-radius:6px;border:1px solid var(--border);}

      .v9-layout{display:grid;grid-template-columns:220px 1fr;gap:60px;}
      .v9-sidebar{position:sticky;top:40px;height:max-content;}
      .stat-card{background:var(--surface);border:1px solid var(--border);padding:20px;border-radius:20px;margin-bottom:20px;}
      .stat-card small{font-size:9px;color:var(--muted);letter-spacing:1px;display:block;margin-bottom:10px;}
      .stat-hex{font-family:'IBM Plex Mono';font-size:32px;font-weight:700;color:var(--accent);}
      .stat-val{font-size:18px;font-weight:800;color:var(--text);}

      .v9-body{font-family:'Crimson Pro',serif;font-size:24px;color:rgba(255,255,255,0.9);line-height:1.7;}
      .v9-body p{margin-bottom:30px;}
      .v9-sh{font-family:'Plus Jakarta Sans';font-size:32px;color:var(--accent);margin:60px 0 30px;border-bottom:1px solid var(--border);padding-bottom:10px;}
      
      .v9-table-wrap{margin:40px 0;border:1px solid var(--border);border-radius:20px;overflow:hidden;background:var(--surface);}
      table{width:100%;border-collapse:collapse;font-size:15px;font-family:'Plus Jakarta Sans';}
      td{padding:18px;border-bottom:1px solid var(--border);}
      td:first-child{font-weight:800;color:var(--accent);width:40%;}

      .source-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:80px;padding-top:40px;border-top:1px solid var(--border);}
      .source-item{background:var(--surface);padding:30px;border-radius:24px;border:1px solid var(--border);transition:0.3s;}
      .source-item:hover{border-color:var(--accent);transform:translateY(-5px);}
      .source-item.highlight{background:var(--accent);color:#000;border:none;}
      .source-item strong{display:block;font-size:11px;letter-spacing:1px;margin-bottom:8px;opacity:0.6;}
      .source-item span{font-size:22px;font-weight:800;}

      @media(max-width:850px){
        .v9-layout{grid-template-columns:1fr;}
        .v9-sidebar{display:flex;gap:20px;position:static;}
        .v9-sidebar > *{flex:1;}
        .v9-title{font-size:48px;}
        .source-grid{grid-template-columns:1fr;}
      }
    </style></head><body>
      <div class="v8-wrapper">
        <header style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:60px;">
          <div>
            <div style="font-family:'IBM Plex Mono'; font-size:11px; color:var(--accent); letter-spacing:3px; margin-bottom:5px;">${env.ENTITY_KEY.toUpperCase()}</div>
            <div style="font-size:28px; font-weight:800; letter-spacing:-1px;">Astraeus Discovery</div>
          </div>
          <div style="text-align:right; font-family:'IBM Plex Mono'; font-size:10px; color:var(--muted)">
            ARCHIVE // V9.0 STABLE<br/>CRYPTO-ID: ${Math.random().toString(16).substring(2,10)}
          </div>
        </header>
        ${content}
      </div>
    </body></html>`;
  }
};
