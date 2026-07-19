"use client";

export function PrintButton({ label = "🖨 Yazdır / PDF kaydet" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn btn-primary no-print">
      {label}
    </button>
  );
}
