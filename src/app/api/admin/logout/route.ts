import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { httpOnly:true, sameSite:"lax", path:"/", maxAge:0 });
  return response;
}
