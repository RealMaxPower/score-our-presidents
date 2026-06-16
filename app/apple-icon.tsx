import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fafaf5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="96" viewBox="0 0 40 32">
          <g
            stroke="#1a1a2e"
            strokeWidth={3}
            strokeLinecap="square"
            fill="none"
          >
            <line x1="6" y1="4" x2="6" y2="28" />
            <line x1="13" y1="4" x2="13" y2="28" />
            <line x1="20" y1="4" x2="20" y2="28" />
            <line x1="27" y1="4" x2="27" y2="28" />
          </g>
          <line
            x1="3"
            y1="29"
            x2="33"
            y2="3"
            stroke="#b45309"
            strokeWidth={3.25}
            strokeLinecap="square"
          />
        </svg>
      </div>
    ),
    size
  );
}
