import { NextRequest } from "next/server";


const COOKIE = "mm_theme";

const LIGHT = `
:root{
  --bg:#f7f6f3 !important; --surface:#ffffff !important; --surface-2:#f1f0ec !important;
  --fg:#0b1f35 !important; --muted:rgba(11,31,53,.72) !important; --border:rgba(11,31,53,.14) !important;
  --shadow-sm:0 8px 24px rgba(11,31,53,.08) !important; --shadow:0 18px 56px rgba(11,31,53,.14) !important;
  --accent:#0b5ed7 !important; --accent-2:#084bb0 !important; --ring:rgba(11,94,215,.35) !important;
}
html{ color-scheme: light !important; }
`;

const DARK = `
:root{
  --bg:#070b13 !important; --surface:#0b1220 !important; --surface-2:#0f172a !important;
  --fg:#e5e7eb !important; --muted:rgba(229,231,235,.74) !important; --border:rgba(229,231,235,.14) !important;
  --shadow-sm:0 12px 30px rgba(0,0,0,.44) !important; --shadow:0 22px 64px rgba(0,0,0,.60) !important;
  --accent:#60a5fa !important; --accent-2:#93c5fd !important; --ring:rgba(96,165,250,.35) !important;
}
html{ color-scheme: dark !important; }
`;

export function GET(req: NextRequest) {
  const v = (req.cookies.get(COOKIE)?.value || "system").toLowerCase();
  const css = v === "dark" ? DARK : v === "light" ? LIGHT : "/* system */\n";

  return new Response(css, {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "private, no-store",
      vary: "Cookie",
    },
  });
}
