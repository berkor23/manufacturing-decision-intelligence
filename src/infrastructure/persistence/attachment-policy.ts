import path from "node:path";

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
/** Çalışma başına kota: dosya adedi ve toplam boyut. Sınırsız yükleme diski doldurur. */
export const MAX_ATTACHMENTS_PER_WORKSPACE = 100;
export const MAX_ATTACHMENT_BYTES_PER_WORKSPACE = 200 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME = new Set(["image/jpeg","image/png","image/webp","application/pdf","text/csv","text/plain","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

export function validateAttachment(size:number,mime:string):string|null {
  if(size<=0||size>MAX_ATTACHMENT_SIZE)return "Dosya 10 MB'dan küçük olmalı.";
  if(!ALLOWED_ATTACHMENT_MIME.has(mime))return "Bu dosya türüne izin verilmiyor.";
  return null;
}
/** Kota aşılıyorsa hata mesajı, aşılmıyorsa null. */
export function quotaExceeded(existing:{size:number}[],incomingSize:number):string|null {
  if(existing.length>=MAX_ATTACHMENTS_PER_WORKSPACE)return `Bir çalışmaya en fazla ${MAX_ATTACHMENTS_PER_WORKSPACE} dosya eklenebilir.`;
  const total=existing.reduce((sum,item)=>sum+(item.size||0),0);
  if(total+incomingSize>MAX_ATTACHMENT_BYTES_PER_WORKSPACE)return "Çalışmanın toplam dosya kotası doldu.";
  return null;
}
export function safeAttachmentPath(root:string,storageKey:string):string|null {
  const resolved=path.resolve(root,storageKey); const base=path.resolve(root);
  return resolved.startsWith(base+path.sep)?resolved:null;
}
