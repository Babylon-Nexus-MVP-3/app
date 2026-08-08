import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

export type Step1Data = {
  name: string;
  abn: string;
  trade: string;
  idType: "trade-licence";
  idNumber: string;
  idExpiry: string;
  idState: string;
};

export type Reference = {
  name: string;
  company: string;
  mobile: string;
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
  name: "",
  company: "",
  mobile: "",
  email: "",
  relationship: "",
  project: "",
});

const emptyStep1: Step1Data = {
  name: "",
  abn: "",
  trade: "",
  idType: "trade-licence",
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
          name: p.name ?? "",
          abn: p.abn ?? "",
          trade: p.trade ?? "",
          // Legacy profiles may carry "licence"/"passport"; trade licence is now
          // the only ID type, so old values collapse onto it.
          idType: "trade-licence",
          idNumber: p.idNumber ?? "",
          idExpiry: p.idExpiry ?? "",
          idState: p.idState ?? "",
        };
        // A profile with fewer than 2 saved references is still valid — pad to
        // 2 slots instead of discarding it, otherwise a real saved reference
        // gets wiped back to blank locally.
        const loadedRefs: Reference[] = Array.isArray(p.references)
          ? p.references.map((r: Record<string, string>) => ({
              name: r.name ?? "",
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
