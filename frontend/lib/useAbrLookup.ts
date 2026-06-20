import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/constants/api";

export type AbrResult = {
  entityName: string;
  tradingName?: string;
  businessType: string;
  state: string;
  activeYears: number;
  isActive: boolean;
};

export function formatAbn(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

export function useAbrLookup(digits: string) {
  const [abrResult, setAbrResult] = useState<AbrResult | null>(null);
  const [abrLoading, setAbrLoading] = useState(false);
  const [abrError, setAbrError] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (digits.length !== 11) {
      setAbrResult(null);
      setAbrError("");
      return;
    }
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => lookup(digits), 400);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [digits]);

  async function lookup(abn: string) {
    setAbrLoading(true);
    setAbrError("");
    setAbrResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/abr/lookup?abn=${abn}`);
      if (!res.ok) {
        if (res.status >= 500) {
          setAbrError("ABN lookup is temporarily unavailable. Please try again later.");
        } else {
          const errData = await res.json().catch(() => ({}));
          setAbrError(
            errData.error === "ABN is not active"
              ? "This ABN is not currently active."
              : "ABN not found. Check the number and try again."
          );
        }
        return;
      }
      const data: AbrResult = await res.json();
      if (!data.isActive) {
        setAbrError("This ABN is not currently active.");
        return;
      }
      setAbrResult(data);
    } catch {
      setAbrError("ABN lookup is temporarily unavailable. Please try again later.");
    } finally {
      setAbrLoading(false);
    }
  }

  return { abrResult, abrLoading, abrError };
}
