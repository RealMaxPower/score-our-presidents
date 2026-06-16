import { ImageResponse } from "next/og";
import { getPresidentBySlug } from "@/lib/queries";
import { fmtSigned, formatTerm, partyLabel } from "@/lib/format";
import { OgTallyMark } from "@/lib/og-mark";
import { loadPlayfair } from "@/lib/og-font";
import { OG_COLORS, SITE_NAME } from "@/lib/site-config";

export const revalidate = 3600;

export async function GET(_req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const president = await getPresidentBySlug(params.slug);
  if (!president) {
    return new Response("Not found", { status: 404 });
  }

  const fonts = await loadPlayfair();
  const total = president.weightedTotalDefault;
  const totalColor = total >= 0 ? OG_COLORS.good700 : OG_COLORS.rust700;

  const topCategories = president.categories
    .filter((c) => c.net !== null)
    .map((c) => ({ number: c.number, name: c.name, net: c.net as number }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 3);

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
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: -0.3,
            }}
          >
            {SITE_NAME}
          </div>
          <div style={{ flex: 1 }} />
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
            Scorecard
          </div>
        </div>
        <div
          style={{
            marginTop: 18,
            height: 2,
            width: "100%",
            background: OG_COLORS.rust700,
            opacity: 0.5,
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            marginTop: 36,
            gap: 32,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontFamily: "sans-serif",
                color: OG_COLORS.charcoal700,
                textTransform: "uppercase",
                letterSpacing: 3,
                fontWeight: 600,
              }}
            >
              {`${partyLabel(president.party)} · ${formatTerm(president.termStart, president.termEnd)}${president.inOffice ? " · In Office" : ""}`}
            </div>
            <div
              style={{
                fontSize: 88,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: -2,
                marginTop: 8,
              }}
            >
              {president.displayName}
            </div>
            {president.calibrationAnchor && (
              <div
                style={{
                  display: "flex",
                  marginTop: 18,
                  fontSize: 13,
                  fontFamily: "sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: 3,
                  color: OG_COLORS.charcoal700,
                  background: OG_COLORS.cream100,
                  border: `1px solid ${OG_COLORS.stone300}`,
                  padding: "6px 14px",
                  borderRadius: 2,
                  alignSelf: "flex-start",
                }}
              >
                Calibration anchor
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              minWidth: 280,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontFamily: "sans-serif",
                color: OG_COLORS.charcoal700,
                textTransform: "uppercase",
                letterSpacing: 3,
                fontWeight: 600,
              }}
            >
              Default weighted total
            </div>
            <div
              style={{
                fontSize: 128,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: -3,
                color: totalColor,
                fontVariantNumeric: "tabular-nums",
                marginTop: 4,
              }}
            >
              {fmtSigned(total)}
            </div>
            <div
              style={{
                fontSize: 12,
                fontFamily: "sans-serif",
                color: OG_COLORS.stone500,
                textTransform: "uppercase",
                letterSpacing: 3,
              }}
            >
              Range −10 to +10
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            paddingTop: 24,
            borderTop: `1px solid ${OG_COLORS.stone300}`,
          }}
        >
          {topCategories.map((c) => (
            <div
              key={c.number}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "sans-serif",
                  color: OG_COLORS.stone500,
                  textTransform: "uppercase",
                  letterSpacing: 2.5,
                  fontWeight: 600,
                }}
              >
                {`C${c.number}`}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginTop: 2,
                  lineHeight: 1.1,
                  letterSpacing: -0.3,
                }}
              >
                {c.name}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: c.net >= 0 ? OG_COLORS.good700 : OG_COLORS.rust700,
                  marginTop: 4,
                }}
              >
                {fmtSigned(c.net, 1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
