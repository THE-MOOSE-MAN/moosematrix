import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["system", "light", "dark"]);

function firstHeaderValue(v: string | null): string | null {
  if (!v) return null;
  // handle "https, http" or "moosematrix.com, something"
  return v.split(",")[0].trim() || null;
}

function safeNext(raw: string | null) {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

function getOrigin(req: NextRequest) {
  const proto =
    firstHeaderValue(req.headers.get("x-forwarded-proto")) ||
    "https";

  const host =
    firstHeaderValue(req.headers.get("x-forwarded-host")) ||
    firstHeaderValue(req.headers.get("host")) ||
    "moosematrix.com";

  return `${proto}://${host}`;
}

export function GET(req: NextRequest) {
  const set = req.nextUrl.searchParams.get("set") ?? "system";
  const mode = ALLOWED.has(set) ? set : "system";

  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const origin = getOrigin(req);

  const res = NextResponse.redirect(new URL(next, origin), 303);
  res.headers.set("Cache-Control", "no-store");

  if (mode === "system") {
    res.cookies.delete({ name: "mm-theme", path: "/" });
  } else {
    // secure cookie if request is effectively https
    const proto = firstHeaderValue(req.headers.get("x-forwarded-proto")) || "https";
    res.cookies.set("mm-theme", mode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
      secure: proto === "https",
    });
  }

  return res;
}
