import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

export type Step1Data = {
  name: string;
  abn: string;
  trade: string;
  idType: "passport" | "licence";
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

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const { fetchWithAuth } = useAuth();
  const [step1, setStep1] = useState<Step1Data>(emptyStep1);
  const [step2, setStep2] = useState<Step2Data>(emptyStep2);
  const [references, setReferences] = useState<Reference[]>([emptyRef(), emptyRef()]);

  // Pre-populate from any previously saved profile
  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        setStep1({
          name: p.name ?? "",
          abn: p.abn ?? "",
          trade: p.trade ?? "",
          idType: p.idType === "licence" ? "licence" : "passport",
          idNumber: p.idNumber ?? "",
          idExpiry: p.idExpiry ?? "",
          idState: p.idState ?? "",
          idCountry: p.idCountry ?? "",
        });
        setStep2({
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
        });
        if (Array.isArray(p.references) && p.references.length >= 2) {
          setReferences(
            p.references.map((r: Record<string, string>) => ({
              name: r.name ?? "",
              company: r.company ?? "",
              mobile: r.mobile ?? "",
              email: r.email ?? "",
              relationship: r.relationship ?? "",
              project: r.project ?? r.projectName ?? "",
            }))
          );
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WizardContext.Provider value={{ step1, step2, references, setStep1, setStep2, setReferences }}>
      {children}
    </WizardContext.Provider>
  );
}
