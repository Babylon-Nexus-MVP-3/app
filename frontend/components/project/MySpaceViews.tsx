import React, { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { AppText } from "@/components/AppText";
import { ApiInvoice, InvoiceActionType } from "./types";
import { apiStatusToCalStatus, invoiceStatusLabel, statusBg, statusColor } from "./helpers";
import { styles } from "./styles";
import { MyInvoiceCard, ApprovalCard } from "./InvoiceCards";
import { ConfirmModal } from "./ConfirmModal";

/* â”€â”€â”€ Invoice uploader view (Subcontractor / Consultant) â”€â”€â”€ */
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
  const [subTab, setSubTab] = useState<"myInvoices" | "allInvoices">("myInvoices");
  const [myFilter, setMyFilter] = useState<FilterStatus>("All");
  const [allFilter, setAllFilter] = useState<FilterStatus>("All");
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
  const myOutstanding = myInvoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );
  const myPaid = myInvoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const allActive = invoices.filter((i) => i.status !== "Rejected");
  const allPending = allActive.filter((i) => i.status === "Pending");
  const allApproved = allActive.filter((i) => i.status === "Approved");
  const allPaid = allActive.filter((i) => i.status === "Paid" || i.status === "Received");

  const filteredMyInvoices = applyFilter(myInvoices, myFilter);
  const filteredAllInvoices = applyFilter(invoices, allFilter);

  const SUB_TABS = [
    { key: "allInvoices" as const, label: "All Invoices" },
    { key: "myInvoices" as const, label: "My Invoices" },
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
            <AppText style={[styles.innerTabText, subTab === t.key && styles.innerTabTextActive]}>
              {t.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bodyContent}>
        {subTab === "myInvoices" && (
          <>
            <View style={[styles.statRow, { flexDirection: "column" }]}>
              <View style={[styles.statBox, { flex: 0 }]}>
                <AppText style={styles.statBoxLabel}>Outstanding</AppText>
                <AppText style={[styles.statBoxNum, { color: Colors.amber }]}>
                  ${myOutstanding.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </AppText>
                <AppText style={styles.statBoxSub}>
                  {myOutstanding.length} invoice{myOutstanding.length !== 1 ? "s" : ""}
                </AppText>
              </View>
              <View style={[styles.statBox, { flex: 0 }]}>
                <AppText style={styles.statBoxLabel}>Paid</AppText>
                <AppText style={[styles.statBoxNum, { color: Colors.green }]}>
                  ${myPaid.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </AppText>
                <AppText style={styles.statBoxSub}>
                  {myPaid.length} invoice{myPaid.length !== 1 ? "s" : ""}
                </AppText>
              </View>
            </View>
            <FilterChips filter={myFilter} onChange={setMyFilter} />
            {filteredMyInvoices.length === 0 && (
              <AppText style={styles.emptyText}>No invoices yet.</AppText>
            )}
            {filteredMyInvoices.map((inv) => (
              <MyInvoiceCard
                key={inv.id}
                inv={inv}
                onReceived={() => openConfirm("received", inv)}
                onTap={() => onTapInvoice(inv)}
              />
            ))}
          </>
        )}

        {subTab === "allInvoices" && (
          <>
            <AllInvoicesStats
              allActive={allActive}
              allPending={allPending}
              allApproved={allApproved}
              allPaid={allPaid}
              canSeeAmounts={false}
            />
            <FilterChips filter={allFilter} onChange={setAllFilter} />
            {filteredAllInvoices.length === 0 && (
              <AppText style={styles.emptyText}>No invoices yet.</AppText>
            )}
            {filteredAllInvoices.map((inv) => {
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
                      <AppText style={styles.invoiceName}>{inv.submittingParty}</AppText>
                      {inv.invoiceNumber ? (
                        <View style={styles.invoiceNumPill}>
                          <AppText style={styles.invoiceNumText}>{inv.invoiceNumber}</AppText>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                      <AppText style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                        {invoiceStatusLabel(inv.status)}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.invoiceRow}>
                    {inv.submittedByUserId === userId && inv.amount != null && (
                      <AppText style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</AppText>
                    )}
                    {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                      <AppText style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                        {inv.daysOverdue} days overdue
                      </AppText>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
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

/* â”€â”€â”€ Shared dual-role view (Builder / PM): My Invoices + To Action + All Invoices â”€â”€â”€ */
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
  const [myFilter, setMyFilter] = useState<FilterStatus>("All");
  const [toActionFilter, setToActionFilter] = useState<FilterStatus>("All");
  const [allFilter, setAllFilter] = useState<FilterStatus>("All");
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
  const toAction = approvalInvoices
    .filter((i) => i.status === "Pending" || i.status === "Approved")
    .sort((a, b) => new Date(a.dateDue).getTime() - new Date(b.dateDue).getTime());
  const actionDone = approvalInvoices.filter(
    (i) => i.status === "Paid" || i.status === "Received" || i.status === "Rejected"
  );
  // All roles see all project invoices; amounts are gated per canViewAmount.
  const allInvoices = invoices;
  const allActive = allInvoices.filter((i) => i.status !== "Rejected");
  const allPending = allActive.filter((i) => i.status === "Pending");
  const allApproved = allActive.filter((i) => i.status === "Approved");
  const allPaid = allActive.filter((i) => i.status === "Paid" || i.status === "Received");

  // PM sees all amounts; Builder sees amounts on own + approved invoices
  const canSeeAllAmounts = approverRole === "PM";
  // For "To Action" tab: Builder IS the approver for all those invoices â†’ show dollar total
  const canSeeToActionAmounts = true;

  const filteredMyInvoices = applyFilter(myInvoices, myFilter);
  const filteredToAction = applyFilter(toAction, toActionFilter);
  const filteredAllInvoices = applyFilter(allInvoices, allFilter);

  const SUB_TABS = [
    { key: "allInvoices" as const, label: "All Invoices" },
    { key: "myInvoices" as const, label: "My Invoices" },
    { key: "toApprove" as const, label: "To Action" },
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
            <AppText style={[styles.innerTabText, subTab === t.key && styles.innerTabTextActive]}>
              {t.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bodyContent}>
        {subTab === "myInvoices" && (
          <>
            <View style={[styles.statRow, { flexDirection: "column" }]}>
              <View style={[styles.statBox, { flex: 0 }]}>
                <AppText style={styles.statBoxLabel}>Outstanding</AppText>
                <AppText style={[styles.statBoxNum, { color: Colors.amber }]}>
                  ${myOutstanding.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </AppText>
                <AppText style={styles.statBoxSub}>
                  {myOutstanding.length} invoice{myOutstanding.length !== 1 ? "s" : ""}
                </AppText>
              </View>
              <View style={[styles.statBox, { flex: 0 }]}>
                <AppText style={styles.statBoxLabel}>Paid</AppText>
                <AppText style={[styles.statBoxNum, { color: Colors.green }]}>
                  ${myPaid.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </AppText>
                <AppText style={styles.statBoxSub}>
                  {myPaid.length} invoice{myPaid.length !== 1 ? "s" : ""}
                </AppText>
              </View>
            </View>
            <FilterChips filter={myFilter} onChange={setMyFilter} />
            {filteredMyInvoices.length === 0 && (
              <AppText style={styles.emptyText}>No invoices submitted yet.</AppText>
            )}
            {filteredMyInvoices.map((inv) => (
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
            <View style={[styles.statRow, { flexDirection: "column" }]}>
              <View style={[styles.statBox, { flex: 0 }]}>
                <AppText style={styles.statBoxLabel}>To Action</AppText>
                <AppText style={[styles.statBoxNum, { color: Colors.amber }]}>
                  {canSeeToActionAmounts
                    ? `$${toAction.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`
                    : `${toAction.length} invoice${toAction.length !== 1 ? "s" : ""}`}
                </AppText>
                {canSeeToActionAmounts && (
                  <AppText style={styles.statBoxSub}>
                    {toAction.length} invoice{toAction.length !== 1 ? "s" : ""}
                  </AppText>
                )}
              </View>
              <View style={[styles.statBox, { flex: 0 }]}>
                <AppText style={styles.statBoxLabel}>Actioned</AppText>
                <AppText style={[styles.statBoxNum, { color: Colors.green }]}>
                  {canSeeToActionAmounts
                    ? `$${actionDone.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`
                    : `${actionDone.length} invoice${actionDone.length !== 1 ? "s" : ""}`}
                </AppText>
                {canSeeToActionAmounts && (
                  <AppText style={styles.statBoxSub}>
                    {actionDone.length} invoice{actionDone.length !== 1 ? "s" : ""}
                  </AppText>
                )}
              </View>
            </View>
            <FilterChips filter={toActionFilter} onChange={setToActionFilter} />
            {filteredToAction.length === 0 && (
              <AppText style={styles.emptyText}>No invoices to approve.</AppText>
            )}
            {filteredToAction.map((inv) => (
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
            <AllInvoicesStats
              allActive={allActive}
              allPending={allPending}
              allApproved={allApproved}
              allPaid={allPaid}
              canSeeAmounts={canSeeAllAmounts}
            />
            <FilterChips filter={allFilter} onChange={setAllFilter} />
            {filteredAllInvoices.length === 0 && (
              <AppText style={styles.emptyText}>No invoices yet.</AppText>
            )}
            {filteredAllInvoices.map((inv) => {
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
                      <AppText style={styles.invoiceName}>{inv.submittingParty}</AppText>
                      {inv.invoiceNumber ? (
                        <View style={styles.invoiceNumPill}>
                          <AppText style={styles.invoiceNumText}>{inv.invoiceNumber}</AppText>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                      <AppText style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                        {invoiceStatusLabel(inv.status)}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.invoiceRow}>
                    {showAmt && inv.amount != null && (
                      <AppText style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</AppText>
                    )}
                    {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                      <AppText style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                        {inv.daysOverdue} days overdue
                      </AppText>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={confirmInvoice}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
        showAmount={
          confirmInvoice ? canSeeAllAmounts || confirmInvoice.submittedByUserId === userId : true
        }
      />
    </>
  );
}

/* â”€â”€â”€ Builder â”€â”€â”€ */
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

/* â”€â”€â”€ Project Manager â”€â”€â”€ */
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

/* â”€â”€â”€ Owner â”€â”€â”€ */
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
  const [toActionFilter, setToActionFilter] = useState<FilterStatus>("All");
  const [allFilter, setAllFilter] = useState<FilterStatus>("All");
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
  const toAction = approvalInvoices
    .filter((i) => i.status === "Pending" || i.status === "Approved")
    .sort((a, b) => new Date(a.dateDue).getTime() - new Date(b.dateDue).getTime());
  const ownerActive = invoices.filter((i) => i.status !== "Rejected");
  const ownerPending = ownerActive.filter((i) => i.status === "Pending");
  const ownerApproved = ownerActive.filter((i) => i.status === "Approved");
  const ownerPaid = ownerActive.filter((i) => i.status === "Paid" || i.status === "Received");
  const filteredToAction = applyFilter(toAction, toActionFilter);
  const filteredAllInvoices = applyFilter(invoices, allFilter);

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
            <AppText style={[styles.innerTabText, subTab === t.key && styles.innerTabTextActive]}>
              {t.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bodyContent}>
        {subTab === "toApprove" && (
          <>
            <View style={[styles.statRow, { flexDirection: "column" }]}>
              <View style={[styles.statBox, { flex: 0 }]}>
                <AppText style={styles.statBoxLabel}>To Action</AppText>
                <AppText style={[styles.statBoxNum, { color: Colors.amber }]}>
                  ${toAction.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </AppText>
                <AppText style={styles.statBoxSub}>
                  {toAction.length} invoice{toAction.length !== 1 ? "s" : ""}
                </AppText>
              </View>
              <View style={[styles.statBox, { flex: 0 }]}>
                <AppText style={styles.statBoxLabel}>Approved/Paid</AppText>
                <AppText style={[styles.statBoxNum, { color: Colors.green }]}>
                  $
                  {approvalInvoices
                    .filter((i) => i.status === "Paid" || i.status === "Received")
                    .reduce((a, i) => a + (i.amount ?? 0), 0)
                    .toLocaleString()}
                </AppText>
                <AppText style={styles.statBoxSub}>
                  {
                    approvalInvoices.filter((i) => i.status === "Paid" || i.status === "Received")
                      .length
                  }{" "}
                  invoices
                </AppText>
              </View>
            </View>
            <FilterChips filter={toActionFilter} onChange={setToActionFilter} />
            {filteredToAction.length === 0 && (
              <AppText style={styles.emptyText}>No invoices awaiting action.</AppText>
            )}
            {filteredToAction.map((inv) => (
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
            <AllInvoicesStats
              allActive={ownerActive}
              allPending={ownerPending}
              allApproved={ownerApproved}
              allPaid={ownerPaid}
              canSeeAmounts={true}
            />
            <FilterChips filter={allFilter} onChange={setAllFilter} />
            {filteredAllInvoices.length === 0 && (
              <AppText style={styles.emptyText}>No invoices yet.</AppText>
            )}
            {filteredAllInvoices.map((inv) => {
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
                      <AppText style={styles.invoiceName}>{inv.submittingParty}</AppText>
                      {inv.invoiceNumber ? (
                        <View style={styles.invoiceNumPill}>
                          <AppText style={styles.invoiceNumText}>{inv.invoiceNumber}</AppText>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                      <AppText style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                        {invoiceStatusLabel(inv.status)}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.invoiceRow}>
                    {inv.amount != null && (
                      <AppText style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</AppText>
                    )}
                    {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                      <AppText style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                        {inv.daysOverdue} days overdue
                      </AppText>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
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

/* â”€â”€â”€ Financier / VIP â€” read-only, full amounts â”€â”€â”€ */
export function FinancierMySpace({
  invoices,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const [filter, setFilter] = useState<FilterStatus>("All");
  const finActive = invoices.filter((i) => i.status !== "Rejected");
  const finPending = finActive.filter((i) => i.status === "Pending");
  const finApproved = finActive.filter((i) => i.status === "Approved");
  const finPaid = finActive.filter((i) => i.status === "Paid" || i.status === "Received");
  const filteredInvoices = applyFilter(invoices, filter);

  return (
    <View style={styles.bodyContent}>
      <AllInvoicesStats
        allActive={finActive}
        allPending={finPending}
        allApproved={finApproved}
        allPaid={finPaid}
        canSeeAmounts={true}
      />
      <FilterChips filter={filter} onChange={setFilter} />
      {filteredInvoices.length === 0 && (
        <AppText style={styles.emptyText}>No invoices yet.</AppText>
      )}
      {filteredInvoices.map((inv) => {
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
                <AppText style={styles.invoiceName}>{inv.submittingParty}</AppText>
                {inv.invoiceNumber ? (
                  <View style={styles.invoiceNumPill}>
                    <AppText style={styles.invoiceNumText}>{inv.invoiceNumber}</AppText>
                  </View>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                <AppText style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                  {invoiceStatusLabel(inv.status)}
                </AppText>
              </View>
            </View>
            <View style={styles.invoiceRow}>
              {inv.amount != null && (
                <AppText style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</AppText>
              )}
              {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                <AppText style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                  {inv.daysOverdue} days overdue
                </AppText>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* â”€â”€â”€ Observer â€” read-only, no amounts â”€â”€â”€ */
export function ObserverMySpace({
  invoices,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const [filter, setFilter] = useState<FilterStatus>("All");
  const activeCount = invoices.filter((i) => i.status !== "Rejected").length;
  const overdueCount = invoices.filter(
    (i) =>
      i.daysOverdue > 0 && i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  ).length;
  const paidCount = invoices.filter((i) => i.status === "Paid" || i.status === "Received").length;
  const filteredInvoices = applyFilter(invoices, filter);

  return (
    <View style={styles.bodyContent}>
      <View style={[styles.statRow, { flexDirection: "column" }]}>
        {(
          [
            ["Total", activeCount, Colors.black],
            ["Overdue", overdueCount, Colors.red],
            ["Paid", paidCount, Colors.green],
          ] as const
        ).map(([label, count, color]) => (
          <View key={label} style={[styles.statBox, { flex: 0 }]}>
            <AppText style={styles.statBoxLabel}>{label}</AppText>
            <AppText style={[styles.statBoxNum, { color }]}>{count}</AppText>
            <AppText style={styles.statBoxSub}>invoices</AppText>
          </View>
        ))}
      </View>

      <FilterChips filter={filter} onChange={setFilter} />
      {filteredInvoices.length === 0 && (
        <AppText style={styles.emptyText}>No invoices yet.</AppText>
      )}
      {filteredInvoices.map((inv) => {
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
                <AppText style={styles.invoiceName}>{inv.submittingParty}</AppText>
                {inv.invoiceNumber ? (
                  <View style={styles.invoiceNumPill}>
                    <AppText style={styles.invoiceNumText}>{inv.invoiceNumber}</AppText>
                  </View>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                <AppText style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                  {invoiceStatusLabel(inv.status)}
                </AppText>
              </View>
            </View>
            <View style={styles.invoiceRow}>
              <AppText style={styles.invoiceDate}>
                Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
              </AppText>
              {inv.daysOverdue > 0 && inv.status !== "Rejected" && (
                <AppText style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                  {inv.daysOverdue} days overdue
                </AppText>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* â”€â”€â”€ Shared filter chips â”€â”€â”€ */
type FilterStatus = "All" | "Overdue" | "Pending" | "Approved" | "Paid" | "Received" | "Rejected";
const FILTER_STATUSES: FilterStatus[] = [
  "All",
  "Overdue",
  "Pending",
  "Approved",
  "Paid",
  "Received",
  "Rejected",
];

function isOverdue(inv: ApiInvoice): boolean {
  return (
    inv.daysOverdue > 0 &&
    inv.status !== "Paid" &&
    inv.status !== "Received" &&
    inv.status !== "Rejected"
  );
}

function applyFilter(invoices: ApiInvoice[], filter: FilterStatus): ApiInvoice[] {
  if (filter === "All") return invoices;
  if (filter === "Overdue") return invoices.filter(isOverdue);
  return invoices.filter((i) => i.status === filter);
}

function FilterChips({
  filter,
  onChange,
}: {
  filter: FilterStatus;
  onChange: (f: FilterStatus) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterRow}
    >
      {FILTER_STATUSES.map((f) => (
        <TouchableOpacity
          key={f}
          style={[styles.filterChip, filter === f && styles.filterChipActive]}
          onPress={() => onChange(f)}
        >
          <AppText style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
            {f}
          </AppText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/* â”€â”€â”€ Shared 3-box stats row for All Invoices views â”€â”€â”€ */
function AllInvoicesStats({
  allActive,
  allPending,
  allApproved,
  allPaid,
  canSeeAmounts,
}: {
  allActive: ApiInvoice[];
  allPending: ApiInvoice[];
  allApproved: ApiInvoice[];
  allPaid: ApiInvoice[];
  canSeeAmounts: boolean;
}) {
  function amt(arr: ApiInvoice[]) {
    return arr.reduce((a, i) => a + (i.amount ?? 0), 0);
  }
  function val(arr: ApiInvoice[], color: string) {
    return canSeeAmounts
      ? { text: `$${amt(arr).toLocaleString()}`, color }
      : { text: `${arr.length} invoice${arr.length !== 1 ? "s" : ""}`, color };
  }

  const outstanding = [...allPending, ...allApproved];
  const paidVal = val(allPaid, Colors.green);
  const outstandingVal = val(outstanding, Colors.amber);

  return (
    <View style={[styles.statRow, { flexDirection: "column" }]}>
      <View style={[styles.statBox, { flex: 0 }]}>
        <AppText style={styles.statBoxLabel}>Total</AppText>
        <AppText style={[styles.statBoxNum, { color: Colors.black, fontSize: 16 }]}>
          {val(allActive, Colors.black).text}
        </AppText>
        {canSeeAmounts && (
          <AppText style={styles.statBoxSub}>
            {allActive.length} invoice{allActive.length !== 1 ? "s" : ""}
          </AppText>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={[styles.statBox, { flex: 1 }]}>
          <AppText style={styles.statBoxLabel}>Paid</AppText>
          <AppText style={[styles.statBoxNum, { color: paidVal.color, fontSize: 16 }]}>
            {paidVal.text}
          </AppText>
          {canSeeAmounts && (
            <AppText style={styles.statBoxSub}>
              {allPaid.length} invoice{allPaid.length !== 1 ? "s" : ""}
            </AppText>
          )}
        </View>
        <View style={[styles.statBox, { flex: 1 }]}>
          <AppText style={styles.statBoxLabel}>Outstanding</AppText>
          <AppText style={[styles.statBoxNum, { color: outstandingVal.color, fontSize: 16 }]}>
            {outstandingVal.text}
          </AppText>
          {canSeeAmounts && (
            <AppText style={styles.statBoxSub}>
              {outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""}
            </AppText>
          )}
        </View>
      </View>
    </View>
  );
}
