import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ApiInvoice, InvoiceActionType } from "./types";
import { displayRole } from "./helpers";
import { styles } from "./styles";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import {
  BuilderMySpace,
  FinancierMySpace,
  InvoiceUploaderView,
  ObserverMySpace,
  OwnerMySpace,
  PMMySpace,
} from "./MySpaceViews";

export function MySpaceTab({
  role,
  invoices,
  userId,
  invoiceAction,
  initialInvoice,
  onInitialInvoiceOpened,
}: {
  role: string;
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  initialInvoice?: ApiInvoice | null;
  onInitialInvoiceOpened?: () => void;
}) {
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);

  useEffect(() => {
    if (initialInvoice) {
      setDetailInvoice(initialInvoice);
      onInitialInvoiceOpened?.();
    }
  }, [initialInvoice]);

  let content: React.ReactNode;
  if (role === "Builder")
    content = (
      <BuilderMySpace
        invoices={invoices}
        userId={userId}
        invoiceAction={invoiceAction}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "PM")
    content = (
      <PMMySpace
        invoices={invoices}
        userId={userId}
        invoiceAction={invoiceAction}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "Subbie" || role === "Consultant")
    content = (
      <InvoiceUploaderView
        invoices={invoices}
        userId={userId}
        invoiceAction={invoiceAction}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "Owner")
    content = (
      <OwnerMySpace
        invoices={invoices}
        userId={userId}
        invoiceAction={invoiceAction}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "Financier" || role === "VIP")
    content = (
      <FinancierMySpace
        invoices={invoices}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "Observer")
    content = (
      <ObserverMySpace
        invoices={invoices}
        onTapInvoice={setDetailInvoice}
      />
    );
  else
    content = (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>My Space</Text>
        <Text style={styles.placeholderSub}>View for {displayRole(role)} — coming soon</Text>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      {content}
      <InvoiceDetailModal
        visible={detailInvoice !== null}
        inv={detailInvoice}
        viewerRole={role}
        userId={userId}
        invoiceAction={invoiceAction}
        onClose={() => setDetailInvoice(null)}
      />
    </View>
  );
}
