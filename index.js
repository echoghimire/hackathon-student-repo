export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // STATUS CHECK: Visit /status to verify connections
    if (url.pathname === "/status") {
      return new Response(`NODE STATUS:
- Storage (KV): ${!!env.AGENT_STORAGE ? "ONLINE" : "OFFLINE"}
- AI Brain: ${!!env.AI ? "ONLINE" : "OFFLINE"}
- Team Key: ${env.ENTITY_KEY !== "test1" ? "ACTIVE" : "PLACEHOLDER (Update ENTITY_KEY)"}`, { headers: {"Content-Type":"text/plain"} });
    }

    if (url.pathname === "/sync") return new Response(await this.syncManifest(env));
    if (url.pathname === "/run") return new Response(await this.processCycle(env));
    
    if (url.pathname.startsWith("/article/")) {
      const id = url.pathname.split("/")[2];
      const post = await env.AGENT_STORAGE.get(`post_${id}`);
      return new Response(post || "Not Found", { headers: {"Content-Type":"text/html"} });
    }

    const indexRows = JSON.parse(await env.AGENT_STORAGE.get("index") || "[]");
    return new Response(this.renderLayout(env, "Research Hub", this.renderIndex(indexRows)), { headers: {"Content-Type":"text/html"} });
  },

  async scheduled(event, env) {
    if (event.cron === "0 0 * * *") await this.syncManifest(env);
    else await this.processCycle(env);
  },

  async syncManifest(env) {
    const res = await fetch(`${env.HUB_URL}/get-daily-manifest`, { headers: {"Authorization": `Bearer ${env.ENTITY_KEY}`} });
    if (!res.ok) return "Sync Error: " + res.status;
    await env.AGENT_STORAGE.put("DAILY_QUEUE", await res.text());
    return "Manifest Synced. Ready for /run";
  },

  async processCycle(env) {
    let queue = JSON.parse(await env.AGENT_STORAGE.get("DAILY_QUEUE") || "[]");
    if (queue.length === 0) return "Queue Empty - Run /sync first";
    const mission = queue.shift();
    await env.AGENT_STORAGE.put("DAILY_QUEUE", JSON.stringify(queue));
    const prompt = `Science Research on: "${mission.title}". Academic style, 1000 words. SIG: ${mission.seed}`;
    try {
      const ai = await env.AI.run("@cf/meta/llama-3-8b-instruct", { messages: [{ role: "user", content: prompt }] });
      const articleId = Date.now();
      const html = `<h1>${mission.title}</h1><div style="font-size:20px;">${ai.response.replace(/\n/g, '<br>')}</div>`;
      await env.AGENT_STORAGE.put(`post_${articleId}`, this.renderLayout(env, mission.title, html));
      const index = JSON.parse(await env.AGENT_STORAGE.get("index") || "[]");
      index.unshift({ id: articleId, title: mission.title });
      await env.AGENT_STORAGE.put("index", JSON.stringify(index.slice(0, 15)));
      return "Published: " + mission.title;
    } catch (e) { return e.message; }
  },

  renderIndex(index) {
    if (index.length === 0) return `<h2>NODE IDLE</h2><p>Visit /sync then /run</p>`;
    return index.map(p => `<div onclick="location.href='/article/${p.id}'" style="border:1px solid #333; padding:20px; margin:10px; cursor:pointer;"><h3>${p.title}</h3></div>`).join("");
  },

  renderLayout(env, title, content) {
    return `<!DOCTYPE html><html><head><title>${title}</title><style>body{background:#000;color:#fff;padding:50px;font-family:sans-serif;}</style></head><body>${content}</body></html>`;
  }
};