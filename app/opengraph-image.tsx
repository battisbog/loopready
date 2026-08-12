import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LoopReady — Fail your mock, not your loop";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#09090b",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#a1a1aa",
            fontSize: 26,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#34d399",
            }}
          />
          LoopReady
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            fontWeight: 700,
            color: "#fafafa",
            lineHeight: 1.1,
          }}
        >
          <span>Fail your mock,</span>
          <span style={{ color: "#34d399" }}>not your loop.</span>
        </div>

        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: "#a1a1aa",
            maxWidth: 900,
          }}
        >
          Voice mock interviews calibrated to your target company and level —
          with feedback that tells you where you would get dinged.
        </div>
      </div>
    ),
    size
  );
}
