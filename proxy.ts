import { auth } from "@/auth";

const PUBLIC_PATHS = ["/login", "/offline"];
const PUBLIC_FILES = ["/sw.js", "/manifest.webmanifest"];

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;

  const isPublic =
    PUBLIC_PATHS.some((p) => path.startsWith(p))
    || PUBLIC_FILES.includes(path)
    || path.startsWith("/api/auth")
    || path.startsWith("/icons/");

  if (isPublic) return;

  if (!req.auth) {
    if (path.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", path + nextUrl.search);
    return Response.redirect(url);
  }
});

export const config = {
  // Skip Next internals and static assets; everything else goes through auth
  matcher: ["/((?!_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
