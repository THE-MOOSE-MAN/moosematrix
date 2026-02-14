import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["system", "light", "dark"]);

function safeNext(raw: string | null) {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const set = url.searchParams.get("set") ?? "system";
  const mode = ALLOWED.has(set) ? set : "system";

  const next = safeNext(url.searchParams.get("next"));
  const res = NextResponse.redirect(new URL(next, url.origin), 303);

  res.headers.set("Cache-Control", "no-store");

  if (mode === "system") {
    res.cookies.delete({ name: "mm-theme", path: "/" });
  } else {
    res.cookies.set("mm-theme", mode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return res;
}
