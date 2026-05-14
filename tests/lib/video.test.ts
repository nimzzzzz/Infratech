import { describe, it, expect } from "vitest";
import {
  isYouTubeOrVimeo,
  parseVideoUrl,
  toEmbedSrc,
} from "@/lib/media/video";

/**
 * Phase C PR 1 — vendor-supplied video URL handling. The parser
 * is the security boundary: every URL that lands in apps.video_url
 * has gone through here, so unsupported hosts / formats are
 * rejected before the iframe ever sees them. Tests cover every
 * supported format, the explicit /live/ rejection (Q6), and the
 * edge cases that should pass through cleanly.
 */

describe("parseVideoUrl — YouTube", () => {
  it("normalises youtube.com/watch?v=ID", () => {
    expect(toEmbedSrc("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("normalises youtube.com/watch?v=ID without www", () => {
    expect(toEmbedSrc("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("normalises youtu.be/ID short URLs", () => {
    expect(toEmbedSrc("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("accepts /shorts/ID URLs (Q6: yes)", () => {
    expect(toEmbedSrc("https://www.youtube.com/shorts/abc123def45")).toBe(
      "https://www.youtube.com/embed/abc123def45",
    );
  });

  it("passes through /embed/ID URLs", () => {
    expect(
      toEmbedSrc("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("rejects /live/ID URLs (Q6: no)", () => {
    const r = parseVideoUrl("https://www.youtube.com/live/abc123def45");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/live/i);
  });

  it("rejects /watch with no v= param", () => {
    expect(isYouTubeOrVimeo("https://www.youtube.com/watch")).toBe(false);
  });

  it("rejects video IDs with disallowed characters", () => {
    expect(
      isYouTubeOrVimeo("https://www.youtube.com/watch?v=invalid id!"),
    ).toBe(false);
  });
});

describe("parseVideoUrl — Vimeo", () => {
  it("normalises vimeo.com/<numeric-id>", () => {
    expect(toEmbedSrc("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });

  it("passes through player.vimeo.com/video/ID", () => {
    expect(
      toEmbedSrc("https://player.vimeo.com/video/123456789"),
    ).toBe("https://player.vimeo.com/video/123456789");
  });

  it("rejects vimeo URLs with non-numeric ID", () => {
    expect(isYouTubeOrVimeo("https://vimeo.com/some-slug-here")).toBe(false);
  });

  it("rejects player.vimeo.com without /video/ prefix", () => {
    expect(
      isYouTubeOrVimeo("https://player.vimeo.com/showcase/123456"),
    ).toBe(false);
  });
});

describe("parseVideoUrl — host rejection", () => {
  it("rejects unsupported hosts", () => {
    expect(isYouTubeOrVimeo("https://dailymotion.com/video/x")).toBe(false);
    expect(isYouTubeOrVimeo("https://www.twitch.tv/videos/123")).toBe(false);
    expect(isYouTubeOrVimeo("https://example.com/video.mp4")).toBe(false);
  });

  it("rejects unparseable strings", () => {
    expect(isYouTubeOrVimeo("not a url at all")).toBe(false);
    expect(isYouTubeOrVimeo("")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(
      isYouTubeOrVimeo("javascript:alert(1)//youtu.be/dQw4w9WgXcQ"),
    ).toBe(false);
  });

  it("accepts http:// URLs (normalised to https:// embed)", () => {
    // http URLs are tolerated because the normalisation rewrites
    // to a https://www.youtube.com/embed/ URL anyway — the stored
    // value is always https.
    expect(toEmbedSrc("http://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });
});

describe("toEmbedSrc — null fallback", () => {
  it("returns null for invalid input", () => {
    expect(toEmbedSrc("not a url")).toBeNull();
    expect(toEmbedSrc("https://example.com")).toBeNull();
  });
});
