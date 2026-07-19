import path from "node:path";

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME = new Set(["image/jpeg","image/png","image/webp","application/pdf","text/csv","text/plain","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

export function validateAttachment(size:number,mime:string):string|null {
  if(size<=0||size>MAX_ATTACHMENT_SIZE)return "Dosya 10 MB'dan küçük olmalı.";
  if(!ALLOWED_ATTACHMENT_MIME.has(mime))return "Bu dosya türüne izin verilmiyor.";
  return null;
}
export function safeAttachmentPath(root:string,storageKey:string):string|null {
  const resolved=path.resolve(root,storageKey); const base=path.resolve(root);
  return resolved.startsWith(base+path.sep)?resolved:null;
}
