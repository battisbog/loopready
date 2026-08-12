import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          borderRadius: 7,
          color: "#34d399",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        L
      </div>
    ),
    size
  );
}
