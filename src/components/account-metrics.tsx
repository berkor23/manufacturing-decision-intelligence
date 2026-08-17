// Hesap ekranlarının göstergesi. Renk kuralı ve "sıfır sessizdir" davranışı
// paylaşılan Readout'ta yaşar; burada yalnız eski ton adları eşlenir.

import { Readout, type ReadoutTone } from "@/components/readout";

const TONE: Record<string, ReadoutTone> = {
  indigo: "info",
  green: "ok",
  amber: "warn",
  red: "risk",
};

export function AccountMetric({
  label,
  value,
  detail,
  tone = "indigo",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "indigo" | "green" | "amber" | "red";
}) {
  return <Readout label={label} value={value} detail={detail} tone={TONE[tone]} />;
}
