import { NextRequest, NextResponse } from "next/server";

const COOKIE = "mm-theme";
const ALLOWED = new Set(["system", "light", "dark"]);

function safeNext(raw: string | null) {
  if (!raw) return "/";

  const v = raw.trim();

  // prevent header injection / weird chars
  if (/[\u0000-\u001F\u007F]/.test(v)) return "/";

  // only allow same-site relative paths (block //evil.com)
  if (v.startsWith("/") && !v.startsWith("//")) return v;

  return "/";
}

export function GET(req: NextRequest) {
  const set = (req.nextUrl.searchParams.get("set") ?? "system").toLowerCase();
  const mode = ALLOWED.has(set) ? set : "system";

  const next = safeNext(req.nextUrl.searchParams.get("next"));

  // Relative redirect => no proxy/origin headaches
  const res = new NextResponse(null, { status: 303 });
  res.headers.set("Location", next);
  res.headers.set("Cache-Control", "no-store");

  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    req.nextUrl.protocol.replace(":", "") ||
    "https";

  if (mode === "system") {
    res.cookies.delete(COOKIE);
  } else {
    res.cookies.set(COOKIE, mode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: proto === "https",
    });
  }

  return res;
}
