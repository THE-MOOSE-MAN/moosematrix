// src/app/api/healthz/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    env: process.env.NODE_ENV,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    timestamp: new Date().toISOString(),
  });
}

