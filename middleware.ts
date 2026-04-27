import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every page request EXCEPT:
     *   - _next/static, _next/image (build assets)
     *   - any path with a static-asset extension
     *     (svg, png, jpg, jpeg, gif, webp, ico, json, js, css, map, txt, xml, woff, woff2)
     * This implicitly excludes /manifest.json, /sw.js, /workbox-*.js, /icons/*.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|css|map|txt|xml|woff|woff2)$).*)",
  ],
};
