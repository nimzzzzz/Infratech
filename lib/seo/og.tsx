import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Shared OG-image renderer. Every opengraph-image.tsx file in the app/
 * tree calls renderOgImage(...) — keeps the visual identity consistent
 * across the homepage, /browse, app detail, vendor profile, and the
 * stage / capability landings.
 *
 * Visual: pink-orange-on-black per the brand decision memory. Heading
 * in Alike, body in Pavanam. ImageResponse pipes Vercel Edge runtime
 * Satori under the hood, so the JSX subset is constrained — flex
 * layouts only, no grid / no transforms / no css custom properties.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

let cachedFonts: { alike: ArrayBuffer; pavanam: ArrayBuffer } | null = null;

async function loadFonts() {
  if (cachedFonts) return cachedFonts;
  const fontsDir = join(process.cwd(), "public", "fonts");
  const [alike, pavanam] = await Promise.all([
    readFile(join(fontsDir, "Alike-Regular.ttf")),
    readFile(join(fontsDir, "Pavanam-Regular.ttf")),
  ]);
  // node Buffer is an ArrayBufferLike — cast for ImageResponse types
  cachedFonts = {
    alike: alike.buffer.slice(
      alike.byteOffset,
      alike.byteOffset + alike.byteLength,
    ) as ArrayBuffer,
    pavanam: pavanam.buffer.slice(
      pavanam.byteOffset,
      pavanam.byteOffset + pavanam.byteLength,
    ) as ArrayBuffer,
  };
  return cachedFonts;
}

export type OgInputs = {
  /** Small uppercase kicker above the title, e.g. "Vendor profile" */
  eyebrow: string;
  /** Big serif title — wraps at ~2 lines in this layout */
  title: string;
  /** Optional sub-line in body face */
  subtitle?: string;
  /** Bottom-right footer label, e.g. "infratechdb.io" */
  footer?: string;
};

export async function renderOgImage(opts: OgInputs): Promise<ImageResponse> {
  const { alike, pavanam } = await loadFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0A0A0B",
          backgroundImage:
            "radial-gradient(circle at 75% 25%, rgba(214,51,108,0.35), transparent 55%), radial-gradient(circle at 25% 90%, rgba(249,115,22,0.30), transparent 55%)",
          color: "white",
          fontFamily: "Pavanam",
        }}
      >
        {/* TOP — eyebrow + title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 18,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#F97316",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, #D6336C 0%, #F97316 100%)",
              }}
            />
            <span>{opts.eyebrow}</span>
          </div>
          <div
            style={{
              fontFamily: "Alike",
              fontSize: 84,
              lineHeight: 1.04,
              letterSpacing: -1.5,
              color: "white",
              maxWidth: 980,
              display: "flex",
            }}
          >
            {opts.title}
          </div>
          {opts.subtitle ? (
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.72)",
                maxWidth: 880,
                display: "flex",
              }}
            >
              {opts.subtitle}
            </div>
          ) : null}
        </div>

        {/* BOTTOM — wordmark + footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: "Alike",
              fontStyle: "italic",
              fontSize: 28,
              color: "white",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, #D6336C 0%, #F97316 100%)",
              }}
            />
            InfraTechDB
          </div>
          {opts.footer ? (
            <div
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              {opts.footer}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Alike", data: alike, weight: 400, style: "normal" },
        { name: "Pavanam", data: pavanam, weight: 400, style: "normal" },
      ],
    },
  );
}
