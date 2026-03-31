import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { ApiInvoice, InvoiceActionType } from "./types";
import { apiStatusToCalStatus, invoiceStatusLabel, statusBg, statusColor } from "./helpers";
import { styles } from "./styles";
import { MyInvoiceCard, ApprovalCard } from "./InvoiceCards";
import { ConfirmModal } from "./ConfirmModal";

/* ─── Invoice uploader view (Subcontractor / Consultant) ─── */
export function InvoiceUploaderView({
  invoices,
  userId,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const [confirmAction, setConfirmAction] = useState<InvoiceActionType | null>(null);
  const [confirmInvoice, setConfirmInvoice] = useState<ApiInvoice | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openConfirm(action: InvoiceActionType, inv: ApiInvoice) {
    setConfirmAction(action);
    setConfirmInvoice(inv);
    setConfirmError(null);
  }
  function closeConfirm() {
    setConfirmAction(null);
    setConfirmInvoice(null);
  }
  async function handleConfirm(reason?: string) {
    if (!confirmAction || !confirmInvoice) return;
    setConfirmLoading(true);
    setConfirmError(null);
    const err = await invoiceAction(confirmAction, confirmInvoice.id, reason);
    setConfirmLoading(false);
    if (err) setConfirmError(err);
    else closeConfirm();
  }

  const myInvoices = invoices.filter((i) => i.submittedByUserId === userId);
  const outstanding = myInvoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );
  const paid = myInvoices.filter((i) => i.status === "Paid" || i.status === "Received");

  return (
    <>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Outstanding</Text>
            <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
              ${outstanding.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.statBoxSub}>
              {outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Paid</Text>
            <Text style={[styles.statBoxNum, { color: Colors.green }]}>
              ${paid.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.statBoxSub}>
              {paid.length} invoice{paid.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionLabel}>MY INVOICES</Text>
        {myInvoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
        {myInvoices.map((inv) => (
          <MyInvoiceCard
            key={inv.id}
            inv={inv}
            onReceived={() => openConfirm("received", inv)}
            onTap={() => onTapInvoice(inv)}
          />
        ))}
      </ScrollView>
      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={confirmInvoice}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
      />
    </>
  );
}

/* ─── Shared dual-role view (Builder / PM): My Invoices + To Action + All Invoices ─── */
export function DualRoleMySpace({
  invoices,
  userId,
  approverRole,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  approverRole: "Builder" | "PM";
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const [subTab, setSubTab] = useState<"myInvoices" | "toApprove" | "allInvoices">("myInvoices");
  const [confirmAction, setConfirmAction] = useState<InvoiceActionType | null>(null);
  const [confirmInvoice, setConfirmInvoice] = useState<ApiInvoice | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openConfirm(action: InvoiceActionType, inv: ApiInvoice) {
    setConfirmAction(action);
    setConfirmInvoice(inv);
    setConfirmError(null);
  }
  function closeConfirm() {
    setConfirmAction(null);
    setConfirmInvoice(null);
  }
  async function handleConfirm(reason?: string) {
    if (!confirmAction || !confirmInvoice) return;
    setConfirmLoading(true);
    setConfirmError(null);
    const err = await invoiceAction(confirmAction, confirmInvoice.id, reason);
    setConfirmLoading(false);
    if (err) setConfirmError(err);
    else closeConfirm();
  }

  const myInvoices = invoices.filter((i) => i.submittedByUserId === userId);
  const approvalInvoices = invoices.filter((i) => i.approverRole === approverRole);
  const myOutstanding = myInvoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );
  const myPaid = myInvoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const toAction = approvalInvoices.filter(
    (i) => i.status === "Pending" || i.status === "Approved"
  );
  const actionDone = approvalInvoices.filter(
    (i) => i.status === "Paid" || i.status === "Received" || i.status === "Rejected"
  );
  // All roles see all project invoices; amounts are gated per canViewAmount.
  const allInvoices = invoices;
  const allPaid = allInvoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const allOut = allInvoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );

  // PM sees all amounts; Builder sees amounts on own + approved invoices
  const canSeeAllAmounts = approverRole === "PM";
  // For "To Action" tab: Builder IS the approver for all those invoices → show dollar total
  const canSeeToActionAmounts = true;

  const SUB_TABS = [
    { key: "myInvoices" as const, label: "My Invoices" },
    { key: "toApprove" as const, label: "To Action" },
    { key: "allInvoices" as const, label: "All Invoices" },
  ];

  return (
    <>
      <View style={styles.innerTabBar}>
        {SUB_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.innerTab, subTab === t.key && styles.innerTabActive]}
            onPress={() => setSubTab(t.key)}
          >
            <Text style={[styles.innerTabText, subTab === t.key && styles.innerTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {subTab === "myInvoices" && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Outstanding</Text>
                <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
                  ${myOutstanding.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </Text>
                <Text style={styles.statBoxSub}>
                  {myOutstanding.length} invoice{myOutstanding.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Paid</Text>
                <Text style={[styles.statBoxNum, { color: Colors.green }]}>
                  ${myPaid.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </Text>
                <Text style={styles.statBoxSub}>
                  {myPaid.length} invoice{myPaid.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            {myInvoices.length === 0 && (
              <Text style={styles.emptyText}>No invoices submitted yet.</Text>
            )}
            {myInvoices.map((inv) => (
              <MyInvoiceCard
                key={`my-${inv.id}`}
                inv={inv}
                onReceived={() => openConfirm("received", inv)}
                onTap={() => onTapInvoice(inv)}
              />
            ))}
          </>
        )}

        {subTab === "toApprove" && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>To Action</Text>
                <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
                  {canSeeToActionAmounts
                    ? `$${toAction.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`
                    : `${toAction.length} invoice${toAction.length !== 1 ? "s" : ""}`}
                </Text>
                {canSeeToActionAmounts && (
                  <Text style={styles.statBoxSub}>
                    {toAction.length} invoice{toAction.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Actioned</Text>
                <Text style={[styles.statBoxNum, { color: Colors.green }]}>
                  {canSeeToActionAmounts
                    ? `$${actionDone.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`
                    : `${actionDone.length} invoice${actionDone.length !== 1 ? "s" : ""}`}
                </Text>
                {canSeeToActionAmounts && (
                  <Text style={styles.statBoxSub}>
                    {actionDone.length} invoice{actionDone.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </View>
            </View>
            {toAction.length === 0 && (
              <Text style={styles.emptyText}>No invoices to approve.</Text>
            )}
            {toAction.map((inv) => (
              <ApprovalCard
                key={`ap-${inv.id}`}
                inv={inv}
                onApprove={() => openConfirm("approve", inv)}
                onPaid={() => openConfirm("paid", inv)}
                onReject={() => openConfirm("reject", inv)}
                onTap={() => onTapInvoice(inv)}
                showAmount={canSeeAllAmounts || inv.submittedByUserId === userId}
              />
            ))}
          </>
        )}

        {subTab === "allInvoices" && (
          <>
            <View style={styles.statRow}>
              {(
                [
                  [
                    "Total",
                    allInvoices.length,
                    allInvoices.reduce((a, i) => a + (i.amount ?? 0), 0),
                    Colors.textPrimary,
                  ],
                  [
                    "Paid",
                    allPaid.length,
                    allPaid.reduce((a, i) => a + (i.amount ?? 0), 0),
                    Colors.green,
                  ],
                  [
                    "Outstanding",
                    allOut.length,
                    allOut.reduce((a, i) => a + (i.amount ?? 0), 0),
                    Colors.amber,
                  ],
                ] as const
              ).map(([label, count, val, color]) => (
                <View key={label} style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>{label}</Text>
                  <Text style={[styles.statBoxNum, { color, fontSize: 16 }]}>
                    {canSeeAllAmounts
                      ? `$${val.toLocaleString()}`
                      : `${count} invoice${count !== 1 ? "s" : ""}`}
                  </Text>
                  {canSeeAllAmounts && <Text style={styles.statBoxSub}>{count} invoices</Text>}
                </View>
              ))}
            </View>
            {allInvoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
            {allInvoices.map((inv) => {
              const calStatus = apiStatusToCalStatus(inv);
              const showAmt = canSeeAllAmounts || inv.submittedByUserId === userId;
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
                  onPress={() => onTapInvoice(inv)}
                  activeOpacity={0.85}
                >
                  <View style={styles.invoiceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                      {inv.invoiceNumber ? (
                        <View style={styles.invoiceNumPill}>
                          <Text style={styles.invoiceNumText}>{inv.invoiceNumber}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                        {invoiceStatusLabel(inv.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.invoiceRow}>
                    {showAmt && inv.amount != null && (
                      <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
                    )}
                    {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                      <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                        {inv.daysOverdue} days overdue
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={confirmInvoice}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
        showAmount={
          confirmInvoice
            ? canSeeAllAmounts || confirmInvoice.submittedByUserId === userId
            : true
        }
      />
    </>
  );
}

/* ─── Builder ─── */
export function BuilderMySpace({
  invoices,
  userId,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  return (
    <DualRoleMySpace
      invoices={invoices}
      userId={userId}
      approverRole="Builder"
      invoiceAction={invoiceAction}
      onTapInvoice={onTapInvoice}
    />
  );
}

/* ─── Project Manager ─── */
export function PMMySpace({
  invoices,
  userId,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  return (
    <DualRoleMySpace
      invoices={invoices}
      userId={userId}
      approverRole="PM"
      invoiceAction={invoiceAction}
      onTapInvoice={onTapInvoice}
    />
  );
}

/* ─── Owner ─── */
export function OwnerMySpace({
  invoices,
  userId: _userId,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const [subTab, setSubTab] = useState<"toApprove" | "allInvoices">("allInvoices");
  const [confirmAction, setConfirmAction] = useState<InvoiceActionType | null>(null);
  const [confirmInvoice, setConfirmInvoice] = useState<ApiInvoice | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openConfirm(action: InvoiceActionType, inv: ApiInvoice) {
    setConfirmAction(action);
    setConfirmInvoice(inv);
    setConfirmError(null);
  }
  function closeConfirm() {
    setConfirmAction(null);
    setConfirmInvoice(null);
  }
  async function handleConfirm(reason?: string) {
    if (!confirmAction || !confirmInvoice) return;
    setConfirmLoading(true);
    setConfirmError(null);
    const err = await invoiceAction(confirmAction, confirmInvoice.id, reason);
    setConfirmLoading(false);
    if (err) setConfirmError(err);
    else closeConfirm();
  }

  const approvalInvoices = invoices.filter((i) => i.approverRole === "Owner");
  const toAction = approvalInvoices.filter(
    (i) => i.status === "Pending" || i.status === "Approved"
  );
  const paidInvs = invoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const outInvs = invoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );

  const OWNER_TABS = [
    { key: "allInvoices" as const, label: "All Invoices" },
    { key: "toApprove" as const, label: "To Action" },
  ];

  return (
    <>
      <View style={styles.innerTabBar}>
        {OWNER_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.innerTab, subTab === t.key && styles.innerTabActive]}
            onPress={() => setSubTab(t.key)}
          >
            <Text style={[styles.innerTabText, subTab === t.key && styles.innerTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {subTab === "toApprove" && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>To Action</Text>
                <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
                  ${toAction.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </Text>
                <Text style={styles.statBoxSub}>
                  {toAction.length} invoice{toAction.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Approved/Paid</Text>
                <Text style={[styles.statBoxNum, { color: Colors.green }]}>
                  $
                  {approvalInvoices
                    .filter((i) => i.status === "Paid" || i.status === "Received")
                    .reduce((a, i) => a + (i.amount ?? 0), 0)
                    .toLocaleString()}
                </Text>
                <Text style={styles.statBoxSub}>
                  {
                    approvalInvoices.filter((i) => i.status === "Paid" || i.status === "Received")
                      .length
                  }{" "}
                  invoices
                </Text>
              </View>
            </View>
            {toAction.length === 0 && (
              <Text style={styles.emptyText}>No invoices awaiting action.</Text>
            )}
            {toAction.map((inv) => (
              <ApprovalCard
                key={`ap-${inv.id}`}
                inv={inv}
                onApprove={() => openConfirm("approve", inv)}
                onPaid={() => openConfirm("paid", inv)}
                onReject={() => openConfirm("reject", inv)}
                onTap={() => onTapInvoice(inv)}
              />
            ))}
          </>
        )}

        {subTab === "allInvoices" && (
          <>
            <View style={styles.statRow}>
              {(
                [
                  [
                    "Total Raised",
                    invoices.length,
                    `$${invoices.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`,
                    Colors.textPrimary,
                  ],
                  [
                    "Paid",
                    paidInvs.length,
                    `$${paidInvs.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`,
                    Colors.green,
                  ],
                  [
                    "Outstanding",
                    outInvs.length,
                    `$${outInvs.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`,
                    Colors.amber,
                  ],
                ] as const
              ).map(([label, count, val, color]) => (
                <View key={label} style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>{label}</Text>
                  <Text style={[styles.statBoxNum, { color, fontSize: 16 }]}>{val}</Text>
                  <Text style={styles.statBoxSub}>{count} invoices</Text>
                </View>
              ))}
            </View>
            {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
            {invoices.map((inv) => {
              const calStatus = apiStatusToCalStatus(inv);
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
                  onPress={() => onTapInvoice(inv)}
                  activeOpacity={0.85}
                >
                  <View style={styles.invoiceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                      {inv.invoiceNumber ? (
                        <View style={styles.invoiceNumPill}>
                          <Text style={styles.invoiceNumText}>{inv.invoiceNumber}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                        {invoiceStatusLabel(inv.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.invoiceRow}>
                    {inv.amount != null && (
                      <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
                    )}
                    {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                      <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                        {inv.daysOverdue} days overdue
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={confirmInvoice}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
      />
    </>
  );
}

/* ─── Financier / VIP — read-only, full amounts ─── */
export function FinancierMySpace({
  invoices,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const paidInvs = invoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const outInvs = invoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );
  const valTotal = invoices.reduce((a, i) => a + (i.amount ?? 0), 0);
  const valPaid = paidInvs.reduce((a, i) => a + (i.amount ?? 0), 0);
  const valOut = outInvs.reduce((a, i) => a + (i.amount ?? 0), 0);

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statRow}>
        {(
          [
            ["Total Raised", invoices.length, `$${valTotal.toLocaleString()}`, Colors.textPrimary],
            ["Paid", paidInvs.length, `$${valPaid.toLocaleString()}`, Colors.green],
            ["Outstanding", outInvs.length, `$${valOut.toLocaleString()}`, Colors.amber],
          ] as const
        ).map(([label, count, val, color]) => (
          <View key={label} style={styles.statBox}>
            <Text style={styles.statBoxLabel}>{label}</Text>
            <Text style={[styles.statBoxNum, { color, fontSize: 18 }]}>{val}</Text>
            <Text style={styles.statBoxSub}>{count} invoices</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>ALL INVOICES</Text>
      {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
      {invoices.map((inv) => {
        const calStatus = apiStatusToCalStatus(inv);
        return (
          <TouchableOpacity
            key={inv.id}
            style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
            onPress={() => onTapInvoice(inv)}
            activeOpacity={0.85}
          >
            <View style={styles.invoiceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                {inv.invoiceNumber ? (
                  <View style={styles.invoiceNumPill}>
                    <Text style={styles.invoiceNumText}>{inv.invoiceNumber}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                  {invoiceStatusLabel(inv.status)}
                </Text>
              </View>
            </View>
            <View style={styles.invoiceRow}>
              {inv.amount != null && (
                <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
              )}
              {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                  {inv.daysOverdue} days overdue
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/* ─── Observer — read-only, no amounts ─── */
export function ObserverMySpace({
  invoices,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const pendingCount = invoices.filter((i) => i.status === "Pending").length;
  const overdueCount = invoices.filter(
    (i) =>
      i.daysOverdue > 0 &&
      i.status !== "Paid" &&
      i.status !== "Received" &&
      i.status !== "Rejected"
  ).length;
  const paidCount = invoices.filter((i) => i.status === "Paid" || i.status === "Received").length;

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statRow}>
        {(
          [
            ["Total", invoices.length, Colors.textPrimary],
            ["Overdue", overdueCount, Colors.red],
            ["Pending", pendingCount, Colors.purple],
            ["Paid", paidCount, Colors.green],
          ] as const
        ).map(([label, count, color]) => (
          <View key={label} style={styles.statBox}>
            <Text style={styles.statBoxLabel}>{label}</Text>
            <Text style={[styles.statBoxNum, { color, fontSize: 22 }]}>{count}</Text>
            <Text style={styles.statBoxSub}>invoices</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>ALL INVOICES</Text>
      {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
      {invoices.map((inv) => {
        const calStatus = apiStatusToCalStatus(inv);
        return (
          <TouchableOpacity
            key={inv.id}
            style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
            onPress={() => onTapInvoice(inv)}
            activeOpacity={0.85}
          >
            <View style={styles.invoiceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                {inv.invoiceNumber ? (
                  <View style={styles.invoiceNumPill}>
                    <Text style={styles.invoiceNumText}>{inv.invoiceNumber}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                  {invoiceStatusLabel(inv.status)}
                </Text>
              </View>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceDate}>
                Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
              </Text>
              {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                  {inv.daysOverdue} days overdue
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
