import { ImageResponse } from "next/og";
import { getSubCriterionByNumber } from "@/lib/queries";
import { fmtSigned } from "@/lib/format";
import { OgTallyMark } from "@/lib/og-mark";
import { loadPlayfair } from "@/lib/og-font";
import { OG_COLORS, SITE_NAME } from "@/lib/site-config";

export const revalidate = 3600;

export async function GET(_req: Request, props: { params: Promise<{ number: string }> }) {
  const params = await props.params;
  const sub = await getSubCriterionByNumber(params.number);
  if (!sub) {
    return new Response("Not found", { status: 404 });
  }

  const fonts = await loadPlayfair();
  const ranked = sub.scores.filter((s) => s.net !== null) as Array<{
    displayName: string;
    net: number;
    slug: string;
  }>;
  // sub.scores is already sorted high-to-low by net (see getSubCriterionByNumber).
  const top3 = ranked.slice(0, 3);
  const bottom3 = ranked.slice(-3).reverse();

  const RowList = ({
    rows,
    color,
  }: {
    rows: { displayName: string; net: number }[];
    color: string;
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
        <div
          key={r.displayName}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
            {r.displayName}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color,
            }}
          >
            {fmtSigned(r.net, 1)}
          </div>
        </div>
      ))}
    </div>
  );

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
          padding: "56px 72px",
          color: OG_COLORS.charcoal900,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <OgTallyMark width={40} height={32} />
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontFamily: "sans-serif",
              color: OG_COLORS.rust700,
              textTransform: "uppercase",
              letterSpacing: 3,
              fontWeight: 600,
            }}
          >
            {`Sub-criterion · C${sub.category.number} ${sub.category.name}`}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              marginTop: 10,
            }}
          >
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: 36,
                color: OG_COLORS.stone500,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {sub.number}
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: -1.5,
                maxWidth: 980,
              }}
            >
              {sub.name}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 64,
              marginTop: 48,
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 12,
                  fontFamily: "sans-serif",
                  color: OG_COLORS.charcoal700,
                  textTransform: "uppercase",
                  letterSpacing: 3,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                Highest net
              </div>
              <RowList rows={top3} color={OG_COLORS.good700} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 12,
                  fontFamily: "sans-serif",
                  color: OG_COLORS.charcoal700,
                  textTransform: "uppercase",
                  letterSpacing: 3,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                Lowest net
              </div>
              <RowList rows={bottom3} color={OG_COLORS.rust700} />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 18,
            borderTop: `1px solid ${OG_COLORS.stone300}`,
            fontSize: 12,
            fontFamily: "sans-serif",
            color: OG_COLORS.charcoal700,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          <span>{SITE_NAME}</span>
          <span>16 presidents · net = good − harm</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
