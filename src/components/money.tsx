import { formatMoney } from "@/lib/format";

export function Money({ value, colored = false, className = "" }: { value: number; colored?: boolean; className?: string }) {
  const color = colored ? (value < 0 ? "text-negative" : "text-accent") : "";
  return <span className={`tabular-nums ${color} ${className}`}>{formatMoney(value)}</span>;
}
