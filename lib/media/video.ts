/**
 * Video URL handling — vendor-supplied YouTube / Vimeo links for
 * the product detail page. Strict host allowlist; everything else
 * is rejected at the schema layer. Normalisation produces a
 * player-embed URL so the front-end iframe never has to interpret
 * the raw input.
 *
 * Supported inputs:
 *   • https://youtube.com/watch?v=ID        → embed/ID
 *   • https://www.youtube.com/watch?v=ID    → embed/ID
 *   • https://youtu.be/ID                   → embed/ID
 *   • https://www.youtube.com/shorts/ID     → embed/ID  (Phase C Q6 — accept)
 *   • https://www.youtube.com/embed/ID      → unchanged
 *   • https://vimeo.com/ID                  → player.vimeo.com/video/ID
 *   • https://player.vimeo.com/video/ID     → unchanged
 *
 * Explicitly rejected:
 *   • https://www.youtube.com/live/ID       (Phase C Q6 — different player, edge cases)
 *   • Any host not in the allowlist
 *
 * Why a hand-rolled parser rather than a regex: explicit branches
 * for each format are easier to audit (and to reject /live/) than
 * a single multi-arm regex.
 */

export type VideoEmbed =
  | { ok: true; embedUrl: string }
  | { ok: false; reason: string };

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
]);

const VIMEO_HOSTS = new Set([
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

// YouTube IDs are 11 chars in the wild but the spec doesn't pin
// that, so we allow a bit of slack. Pattern matches base64-url
// chars only — anything else is suspect.
const YT_ID_PATTERN = /^[A-Za-z0-9_-]{6,32}$/;
const VIMEO_ID_PATTERN = /^\d{6,12}$/;

export function isYouTubeOrVimeo(raw: string): boolean {
  return parseVideoUrl(raw).ok;
}

export function toEmbedSrc(raw: string): string | null {
  const r = parseVideoUrl(raw);
  return r.ok ? r.embedUrl : null;
}

export function parseVideoUrl(raw: string): VideoEmbed {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Not a valid URL" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, reason: "Use an https:// URL" };
  }
  const host = u.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    return parseYouTube(u);
  }
  if (VIMEO_HOSTS.has(host)) {
    return parseVimeo(u);
  }
  return { ok: false, reason: "Use a YouTube or Vimeo URL" };
}

function parseYouTube(u: URL): VideoEmbed {
  // youtu.be/<ID>
  if (u.hostname === "youtu.be") {
    const id = firstSegment(u.pathname);
    if (!id || !YT_ID_PATTERN.test(id)) {
      return { ok: false, reason: "Couldn't parse the YouTube video ID" };
    }
    return embed("https://www.youtube.com/embed/" + id);
  }
  // youtube.com/watch?v=ID
  if (u.pathname === "/watch") {
    const id = u.searchParams.get("v");
    if (!id || !YT_ID_PATTERN.test(id)) {
      return { ok: false, reason: "Couldn't parse the YouTube video ID" };
    }
    return embed("https://www.youtube.com/embed/" + id);
  }
  // youtube.com/embed/ID  (passthrough — already normalised)
  if (u.pathname.startsWith("/embed/")) {
    const id = firstSegment(u.pathname.slice("/embed/".length));
    if (!id || !YT_ID_PATTERN.test(id)) {
      return { ok: false, reason: "Couldn't parse the YouTube video ID" };
    }
    return embed("https://www.youtube.com/embed/" + id);
  }
  // youtube.com/shorts/ID  (Phase C Q6 — accept)
  if (u.pathname.startsWith("/shorts/")) {
    const id = firstSegment(u.pathname.slice("/shorts/".length));
    if (!id || !YT_ID_PATTERN.test(id)) {
      return { ok: false, reason: "Couldn't parse the YouTube video ID" };
    }
    return embed("https://www.youtube.com/embed/" + id);
  }
  // youtube.com/live/ID  (Phase C Q6 — reject)
  if (u.pathname.startsWith("/live/")) {
    return { ok: false, reason: "YouTube Live URLs aren't supported" };
  }
  return { ok: false, reason: "Couldn't parse the YouTube URL" };
}

function parseVimeo(u: URL): VideoEmbed {
  // player.vimeo.com/video/ID  (passthrough — already an embed URL)
  if (u.hostname === "player.vimeo.com") {
    if (!u.pathname.startsWith("/video/")) {
      return { ok: false, reason: "Couldn't parse the Vimeo URL" };
    }
    const id = firstSegment(u.pathname.slice("/video/".length));
    if (!id || !VIMEO_ID_PATTERN.test(id)) {
      return { ok: false, reason: "Couldn't parse the Vimeo video ID" };
    }
    return embed("https://player.vimeo.com/video/" + id);
  }
  // vimeo.com/<id>
  const id = firstSegment(u.pathname);
  if (!id || !VIMEO_ID_PATTERN.test(id)) {
    return { ok: false, reason: "Couldn't parse the Vimeo video ID" };
  }
  return embed("https://player.vimeo.com/video/" + id);
}

function firstSegment(path: string): string | null {
  const s = path.replace(/^\//, "").split("/")[0];
  return s && s.length > 0 ? s : null;
}

function embed(url: string): VideoEmbed {
  return { ok: true, embedUrl: url };
}
