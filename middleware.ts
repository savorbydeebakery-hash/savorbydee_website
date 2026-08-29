import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (ALL Next internals: static chunks, image optimizer, and in
     *   development the HMR websocket and Turbopack chunk endpoints)
     * - favicon.ico (favicon)
     * - public assets
     * - api/webhooks (public webhook endpoints)
     * - api/cron (public cron endpoint, protected by CRON_SECRET)
     */
    "/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/webhooks|api/cron).*)",
  ],
};