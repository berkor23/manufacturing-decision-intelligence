import {NextResponse} from "next/server";import {prisma} from "@/lib/prisma";
// Kimliksiz erişilebilen uç: yalnız ayakta olma bilgisini verir.
// Kayıt sayısı, kalıcılık modu, sürüm ve ham hata metni bilinçli olarak
// döndürülmez — bunlar keşif aşamasına yarayan ücretsiz bilgilerdi.
export const dynamic="force-dynamic";
export async function GET(){
 const started=Date.now();
 try{
  if((process.env.PERSISTENCE??"memory").toLowerCase()==="prisma")await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({status:"ok",timestamp:new Date().toISOString(),latencyMs:Date.now()-started});
 }catch(error){
  console.error("[health] check failed",error);
  return NextResponse.json({status:"error",timestamp:new Date().toISOString()},{status:503});
 }
}
