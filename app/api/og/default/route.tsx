import { ImageResponse } from "next/og";
import { OgTallyMark } from "@/lib/og-mark";
import { loadPlayfair } from "@/lib/og-font";
import {
  OG_COLORS,
  SITE_NAME,
  SITE_SUBHEADLINE,
  SITE_TAGLINE,
} from "@/lib/site-config";

export const revalidate = 3600;

export async function GET() {
  const fonts = await loadPlayfair();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: OG_COLORS.cream50,
          fontFamily: "Playfair Display",
          padding: "64px 72px",
          color: OG_COLORS.charcoal900,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <OgTallyMark width={64} height={51} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: -0.5,
                lineHeight: 1.05,
              }}
            >
              {SITE_NAME}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 400,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: OG_COLORS.stone500,
                marginTop: 6,
              }}
            >
              {SITE_SUBHEADLINE}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 24,
            height: 2,
            width: 96,
            background: OG_COLORS.rust700,
          }}
        />
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 980,
            }}
          >
            {SITE_TAGLINE}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 14,
            fontFamily: "sans-serif",
            color: OG_COLORS.charcoal700,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          <span>An independent project</span>
          <span>Range −10 to +10</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
