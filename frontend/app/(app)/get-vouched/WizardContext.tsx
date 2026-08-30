import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import { splitLegacyName } from "@/lib/format";
import { matchTradeType } from "@/constants/trades";

export type Step1Data = {
  firstName: string;
  lastName: string;
  abn: string;
  idType: "trade-licence";
  /** What the user does, picked from TRADE_TYPES. Asked once, in step 2. */
  tradeType: string;
  idNumber: string;
  idExpiry: string;
  idState: string;
};

export type Reference = {
  firstName: string;
  lastName: string;
  /** The reference's employer — a business, not a person, so it stays one field. */
  company: string;
  /**
   * Legacy — references are contacted by email and this is no longer collected.
   * Kept so drafts and profiles saved before that change still load.
   */
  mobile?: string;
  email: string;
  relationship: string;
  project: string;
};

type WizardContextType = {
  step1: Step1Data;
  references: Reference[];
  setStep1: (d: Step1Data) => void;
  setReferences: (refs: Reference[]) => void;
};

const WizardContext = createContext<WizardContextType | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}

const emptyRef = (): Reference => ({
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  relationship: "",
  project: "",
});

const emptyStep1: Step1Data = {
  firstName: "",
  lastName: "",
  abn: "",
  idType: "trade-licence",
  tradeType: "",
  idNumber: "",
  idExpiry: "",
  idState: "",
};

// Scoped per logged-in user — otherwise switching accounts on the same device
// (e.g. during testing) leaks one account's draft into another's submission.
function storageKeyFor(userId: string | undefined): string {
  return `wizard_draft_${userId ?? "anon"}`;
}

async function loadDraft(storageKey: string): Promise<{
  step1: Step1Data;
  references: Reference[];
} | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveDraft(storageKey: string, step1: Step1Data, references: Reference[]) {
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify({ step1, references }));
  } catch {}
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const { user, fetchWithAuth } = useAuth();
  const storageKey = storageKeyFor(user?.id);
  const [step1, setStep1Raw] = useState<Step1Data>(emptyStep1);
  const [references, setReferencesRaw] = useState<Reference[]>([emptyRef(), emptyRef()]);

  function setStep1(d: Step1Data) {
    setStep1Raw(d);
    saveDraft(storageKey, d, references);
  }

  function setReferences(refs: Reference[]) {
    setReferencesRaw(refs);
    saveDraft(storageKey, step1, refs);
  }

  useEffect(() => {
    // Reset to defaults first — guards against stale in-memory state from a
    // previous account if this provider doesn't unmount between logins.
    setStep1Raw(emptyStep1);
    setReferencesRaw([emptyRef(), emptyRef()]);

    // Load this user's local draft immediately so the UI restores without
    // waiting for network.
    loadDraft(storageKey).then((draft) => {
      if (draft) {
        setStep1Raw(draft.step1);
        setReferencesRaw(draft.references);
      }
    });

    // Then fetch from backend — backend data wins (it reflects what was actually saved)
    fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        const s1: Step1Data = {
          // Profiles saved before names were split carry only `name`.
          ...splitLegacyName(p.name),
          ...(p.firstName ? { firstName: p.firstName, lastName: p.lastName ?? "" } : {}),
          abn: p.abn ?? "",
          // Legacy profiles may carry "licence"/"passport"; trade licence is now
          // the only ID type, so old values collapse onto it.
          idType: "trade-licence",
          // `trade` is the retired step-1 free-text field. A profile saved
          // before the merge may have it and no tradeType — carry the answer
          // over when it maps onto an option so the user isn't asked twice.
          tradeType: p.tradeType || matchTradeType(p.trade),
          idNumber: p.idNumber ?? "",
          idExpiry: p.idExpiry ?? "",
          idState: p.idState ?? "",
        };
        // A profile with fewer than 2 saved references is still valid — pad to
        // 2 slots instead of discarding it, otherwise a real saved reference
        // gets wiped back to blank locally.
        const loadedRefs: Reference[] = Array.isArray(p.references)
          ? p.references.map((r: Record<string, string>) => ({
              ...splitLegacyName(r.name),
              ...(r.firstName ? { firstName: r.firstName, lastName: r.lastName ?? "" } : {}),
              company: r.company ?? "",
              mobile: r.mobile ?? "",
              email: r.email ?? "",
              relationship: r.relationship ?? "",
              project: r.project ?? r.projectName ?? "",
            }))
          : [];
        const refs: Reference[] = [
          loadedRefs[0] ?? emptyRef(),
          loadedRefs[1] ?? emptyRef(),
          ...loadedRefs.slice(2),
        ];

        setStep1Raw(s1);
        setReferencesRaw(refs);
        saveDraft(storageKey, s1, refs);
      })
      .catch(() => {});
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WizardContext.Provider value={{ step1, references, setStep1, setReferences }}>
      {children}
    </WizardContext.Provider>
  );
}
