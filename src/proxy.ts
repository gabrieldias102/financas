import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    // Tudo menos login, a rota do cron (que tem a própria senha) e arquivos
    // que o iPhone busca sem cookie (manifest e ícones).
    "/((?!login|api/sync|_next/static|_next/image|manifest.webmanifest|favicon.ico|icon|apple-icon|icons/).*)",
  ],
};
