import { expireDue, listExpiredMedia, listLiveDue, updatePage } from "./store.js";
import { dropChannelPost } from "./channel.js";

export async function runExpiry(env) {
  const now = Date.now();
  await env.DB.prepare(
    "UPDATE pages SET status = 'expired' WHERE status = 'pending_pay' AND created_at <= ?"
  ).bind(now - 2 * 3600 * 1000).run();
  const due = await listLiveDue(env.DB, now);
  for (const row of due) {
    if (row && row.channel_msg_id) {
      try { await dropChannelPost(env, row.channel_msg_id); } catch {}
    }
  }
  const n = await expireDue(env.DB, now);
  const media = await listExpiredMedia(env.DB, now, 40);
  const rows = (media && media.results) || media || [];
  let cleared = 0;
  for (const row of rows) {
    if (!row || !row.image_key) continue;
    try {
      if (env.MEDIA && !String(row.image_key).startsWith("tg:")) {
        await env.MEDIA.delete(row.image_key);
      }
      await updatePage(env.DB, row.code, { image_key: null });
      cleared++;
    } catch (err) {
      console.log(JSON.stringify({ op: "expire_media", code: row.code, err: String(err && err.message || err) }));
    }
  }
  console.log(JSON.stringify({ op: "cron_expire", expired: n, media_cleared: cleared }));
  return { expired: n, media_cleared: cleared };
}
