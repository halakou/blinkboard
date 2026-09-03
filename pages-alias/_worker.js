const ORIGIN = "https://blinkboard.halakou.workers.dev";
const SKIP = /^(host|connection|content-length|transfer-encoding|accept-encoding|cf-connecting-ip|cf-ray|cf-visitor|cf-ew-via|cdn-loop)$/i;

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const dest = ORIGIN + incoming.pathname + incoming.search;
    const headers = new Headers();
    for (const [k, v] of request.headers) {
      if (!SKIP.test(k)) headers.set(k, v);
    }
    headers.set("X-Forwarded-Host", incoming.host);
    headers.set("X-Forwarded-Proto", incoming.protocol.replace(":", ""));
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) headers.set("X-Forwarded-For", ip);
    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }
    const resp = await fetch(dest, init);
    const out = new Headers(resp.headers);
    const loc = out.get("Location");
    if (loc && loc.includes("blinkboard.halakou.workers.dev")) {
      out.set("Location", loc.split("https://blinkboard.halakou.workers.dev").join(incoming.origin));
    }
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: out,
    });
  },
};
