import "server-only";

import { NextResponse } from "next/server";
import { accountAuthEnabled, accountFromRequest, canAccessWorkspace, canEditWorkspace } from "@/lib/account-auth";

/**
 * Çalışma alanı route'larının kendi yetki kapısı.
 *
 * Proxy zaten `/api/workspace/{id}` desenini koruyor; bu ikinci katman
 * bilinçlidir: yetkilendirmenin tek dayanağı bir yol regex'i olmamalı.
 * Desen değişirse (ya da yeni bir alt yol eklenirse) koruma sessizce
 * kaybolmasın diye handler kendi kararını da verir.
 *
 * Dönen değer: engellenmişse hazır yanıt, serbestse null.
 */
export async function denyWorkspaceAccess(
  request: Request,
  workspaceId: string,
  mode: "read" | "write",
): Promise<NextResponse | null> {
  if (!accountAuthEnabled()) return null;
  const account = await accountFromRequest(request);
  if (!account) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (!(await canAccessWorkspace(account, workspaceId))) {
    return NextResponse.json({ error: "Bu çalışmaya erişiminiz yok." }, { status: 403 });
  }
  // VIEWER okuyabilir, yazamaz.
  if (mode === "write" && !(await canEditWorkspace(account, workspaceId))) {
    return NextResponse.json({ error: "Bu çalışma için yalnızca görüntüleme yetkiniz var." }, { status: 403 });
  }
  return null;
}
