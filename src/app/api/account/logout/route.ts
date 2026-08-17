import { NextResponse } from "next/server";
import { destroyUserSession, isAllowedMutationOrigin } from "@/lib/account-auth";

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) return NextResponse.json({ error: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  await destroyUserSession();
  return NextResponse.redirect(new URL("/giris", request.url), 303);
}
