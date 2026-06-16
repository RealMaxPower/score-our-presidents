import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { LENS_WEIGHTS } from "@/lib/rankings";
import { OgTallyMark } from "@/lib/og-mark";
import { loadPlayfair } from "@/lib/og-font";
import { OG_COLORS, SITE_NAME } from "@/lib/site-config";

export const revalidate = 3600;

export async function GET(_req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  if (params.slug === "default" || !(params.slug in LENS_WEIGHTS)) {
    return new Response("Not found", { status: 404 });
  }
  const lens = await prisma.lensPreset.findUnique({
    where: { slug: params.slug },
    select: { displayName: true, description: true },
  });
  if (!lens) {
    return new Response("Not found", { status: 404 });
  }

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
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontFamily: "sans-serif",
              color: OG_COLORS.rust700,
              textTransform: "uppercase",
              letterSpacing: 3.5,
              fontWeight: 600,
            }}
          >
            Lens preset
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -2,
            }}
          >
            {`${lens.displayName} ranking`}
          </div>
          <div
            style={{
              fontSize: 26,
              fontFamily: "sans-serif",
              color: OG_COLORS.charcoal700,
              lineHeight: 1.35,
              maxWidth: 980,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {lens.description}
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
          <span>Re-weighted from the same evidence</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
