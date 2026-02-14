import { NextRequest, NextResponse } from "next/server";

const COOKIE = "mm-theme";
const ALLOWED = new Set(["system", "light", "dark"]);

function safeNext(raw: string | null) {
  if (!raw) return "/";
  const v = raw.trim();
  if (/[\u0000-\u001F\u007F]/.test(v)) return "/";
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return "/";
}

function isLocalhostHost(host: string) {
  const h = host.toLowerCase();
  return h.startsWith("localhost") || h.startsWith("127.0.0.1") || h.startsWith("[::1]");
}

export function GET(req: NextRequest) {
  const set = (req.nextUrl.searchParams.get("set") ?? "system").toLowerCase();
  const mode = ALLOWED.has(set) ? set : "system";
  const next = safeNext(req.nextUrl.searchParams.get("next"));

  const res = new NextResponse(null, { status: 303 });
  res.headers.set("Location", next);          // RELATIVE redirect (no port leakage)
  res.headers.set("Cache-Control", "no-store");

  const host =
    (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();

  const proto =
    (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "") ?? "http")
      .split(",")[0]
      .trim();

  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd && proto === "https" && !isLocalhostHost(host);

  if (mode === "system") {
    res.cookies.delete({ name: COOKIE, path: "/" });
  } else {
    res.cookies.set(COOKIE, mode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false, // ✅ must be readable by mm-theme.js / layout inline script
      secure,
    });
  }

  return res;
}
