import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ success: false, error: "Invalid challenge" }, { status: 400 });
}

export async function POST(request: Request) {
  const payload = await request.json();
  return NextResponse.json({ success: true, data: { source: "instagram", payload } });
}
