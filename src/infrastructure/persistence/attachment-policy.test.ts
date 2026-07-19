import {describe,expect,it} from "vitest";
import {safeAttachmentPath,validateAttachment} from "./attachment-policy";
describe("attachment policy",()=>{
  it("izin verilmeyen türü ve büyük dosyayı reddeder",()=>{expect(validateAttachment(100,"text/html")).toBeTruthy();expect(validateAttachment(11*1024*1024,"application/pdf")).toBeTruthy();});
  it("path traversal girişini reddeder",()=>{expect(safeAttachmentPath("C:/app/storage","../../secret.env")).toBeNull();expect(safeAttachmentPath("C:/app/storage","ws/att.pdf")).toContain("att.pdf");});
});
