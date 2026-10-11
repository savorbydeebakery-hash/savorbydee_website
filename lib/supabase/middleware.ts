import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh middleware.
 * Refreshes Supabase auth cookies on every request and protects
 * /admin/* (staff+) and /account/* (authenticated) routes.
 */
export async function updateSession(request: NextRequest) {
  // Anonymous visitors — nearly every customer — carry no Supabase cookie, so
  // there is no session to refresh and nobody to look up. This used to build
  // a client and call auth.getUser() regardless, on every page, API call and
  // link prefetch; on Cloudflare Workers that is CPU spent against a per-
  // request limit the site was already exceeding (Error 1102, 2026-10-11).
  //
  // The cookie is "sb-<project>-auth-token", split into ".0", ".1" chunks
  // when large, so match on the stem. With no such cookie the outcome of the
  // full path is already known: protected pages go to the login, everything
  // else passes through untouched.
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!hasSessionCookie) {
    const path = request.nextUrl.pathname;
    if (path.startsWith("/account") || path.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /account/* — requires authentication
  if (pathname.startsWith("/account") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Protect /admin/* — requires staff+ role
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // Fetch the user's role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (role !== "admin" && role !== "staff") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}