import { NextResponse } from "next/server";
import { audioCapabilities } from "@/lib/audio";

// Tells the client whether to use the server audio pipeline or fall back to
// the browser's Web Speech API, and which provider is serving each side.
export async function GET() {
  return NextResponse.json(audioCapabilities());
}
