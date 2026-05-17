import React, { createContext, useContext, useState } from "react";

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

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [step1, setStep1] = useState<Step1Data>({
    name: "",
    abn: "",
    trade: "",
    idType: "licence",
    idNumber: "",
    idExpiry: "",
    idState: "",
    idCountry: "",
  });
  const [step2, setStep2] = useState<Step2Data>({
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
  });
  const [references, setReferences] = useState<Reference[]>([emptyRef(), emptyRef()]);

  return (
    <WizardContext.Provider value={{ step1, step2, references, setStep1, setStep2, setReferences }}>
      {children}
    </WizardContext.Provider>
  );
}
