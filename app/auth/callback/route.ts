import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) return URL. Supabase sends the browser back here with a
// one-time `code`; exchanging it server-side sets the session cookies (PKCE
// verifier cookie was set when the flow started). `next` is sanitised so this
// can never become an open redirect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("OAuth code exchange failed:", error.code ?? error.message);
  } else if (searchParams.get("error")) {
    // e.g. the user pressed "Cancel" on Google's consent screen.
    console.error("OAuth provider error:", searchParams.get("error"));
  }

  const login = new URL("/login", origin);
  login.searchParams.set("next", next);
  login.searchParams.set("error", "oauth");
  return NextResponse.redirect(login);
}
