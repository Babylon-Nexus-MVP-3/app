import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

export type Step1Data = {
  name: string;
  abn: string;
  trade: string;
  idType: "passport" | "licence" | "trade-licence";
  idNumber: string;
  idExpiry: string;
  idState: string;
  idCountry: string;
};

export type Step2Data = {
  currentProjectName: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  value: string;
  pastProjectName: string;
  pastSuburb: string;
  pastState: string;
  pastPostcode: string;
  pastMonthYear: string;
  pastValue: string;
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
  step2: Step2Data;
  references: Reference[];
  setStep1: (d: Step1Data) => void;
  setStep2: (d: Step2Data) => void;
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
  idType: "licence",
  idNumber: "",
  idExpiry: "",
  idState: "",
  idCountry: "",
};

const emptyStep2: Step2Data = {
  currentProjectName: "",
  address: "",
  suburb: "",
  state: "",
  postcode: "",
  value: "",
  pastProjectName: "",
  pastSuburb: "",
  pastState: "",
  pastPostcode: "",
  pastMonthYear: "",
  pastValue: "",
};

const STORAGE_KEY = "wizard_draft";

async function loadDraft(): Promise<{
  step1: Step1Data;
  step2: Step2Data;
  references: Reference[];
} | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveDraft(step1: Step1Data, step2: Step2Data, references: Reference[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ step1, step2, references }));
  } catch {}
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const { fetchWithAuth } = useAuth();
  const [step1, setStep1Raw] = useState<Step1Data>(emptyStep1);
  const [step2, setStep2Raw] = useState<Step2Data>(emptyStep2);
  const [references, setReferencesRaw] = useState<Reference[]>([emptyRef(), emptyRef()]);

  function setStep1(d: Step1Data) {
    setStep1Raw(d);
    saveDraft(d, step2, references);
  }

  function setStep2(d: Step2Data) {
    setStep2Raw(d);
    saveDraft(step1, d, references);
  }

  function setReferences(refs: Reference[]) {
    setReferencesRaw(refs);
    saveDraft(step1, step2, refs);
  }

  useEffect(() => {
    // Load local draft immediately so the UI restores without waiting for network
    loadDraft().then((draft) => {
      if (draft) {
        setStep1Raw(draft.step1);
        setStep2Raw(draft.step2);
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
          idType:
            p.idType === "licence"
              ? "licence"
              : p.idType === "trade-licence"
                ? "trade-licence"
                : "passport",
          idNumber: p.idNumber ?? "",
          idExpiry: p.idExpiry ?? "",
          idState: p.idState ?? "",
          idCountry: p.idCountry ?? "",
        };
        const s2: Step2Data = {
          currentProjectName: p.currentProjectName ?? "",
          address: p.address ?? "",
          suburb: p.suburb ?? "",
          state: p.state ?? "",
          postcode: p.postcode ?? "",
          value: p.value ?? "",
          pastProjectName: p.pastProjectName ?? "",
          pastSuburb: p.pastSuburb ?? "",
          pastState: p.pastState ?? "",
          pastPostcode: p.pastPostcode ?? "",
          pastMonthYear: p.pastMonthYear ?? "",
          pastValue: p.pastValue ?? "",
        };
        const refs: Reference[] =
          Array.isArray(p.references) && p.references.length >= 2
            ? p.references.map((r: Record<string, string>) => ({
                name: r.name ?? "",
                company: r.company ?? "",
                mobile: r.mobile ?? "",
                email: r.email ?? "",
                relationship: r.relationship ?? "",
                project: r.project ?? r.projectName ?? "",
              }))
            : [emptyRef(), emptyRef()];

        setStep1Raw(s1);
        setStep2Raw(s2);
        setReferencesRaw(refs);
        saveDraft(s1, s2, refs);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WizardContext.Provider value={{ step1, step2, references, setStep1, setStep2, setReferences }}>
      {children}
    </WizardContext.Provider>
  );
}
