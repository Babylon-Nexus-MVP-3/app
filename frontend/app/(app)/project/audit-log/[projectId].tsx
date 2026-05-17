import { API_BASE_URL } from "@/constants/api";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { useAuth } from "@/context/AuthContext";
import { AppText } from "@/components/AppText";

/* ─── API types ─── */
type AuditEventType =
  | "InvoiceSubmitted"
  | "InvoiceApproved"
  | "InvoicePaid"
  | "InvoiceReceived"
  | "InvoiceRejected";

interface AuditEvent {
  type: AuditEventType;
  actorName: string;
  actorRole: string;
  timestamp: string;
  rejectionReason?: string;
}

interface InvoiceAuditEntry {
  invoiceId: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  status: "Pending" | "Approved" | "Paid" | "Received" | "Rejected";
  submittingParty: string;
  submittingCategory: string;
  dateSubmitted: string;
  dateDue: string;
  events: AuditEvent[];
}

interface AuditLogData {
  projectName: string;
  generatedAt: string;
  viewerName: string;
  viewerRole: string;
  summary: {
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  };
  entries: InvoiceAuditEntry[];
}

/* ─── Helpers ─── */
const EVENT_LABEL: Record<AuditEventType, string> = {
  InvoiceSubmitted: "Submitted",
  InvoiceApproved: "Approved",
  InvoicePaid: "Paid",
  InvoiceReceived: "Received",
  InvoiceRejected: "Rejected",
};

const EVENT_COLOR: Record<AuditEventType, string> = {
  InvoiceSubmitted: Colors.amber,
  InvoiceApproved: Colors.green,
  InvoicePaid: Colors.green,
  InvoiceReceived: Colors.green,
  InvoiceRejected: Colors.red,
};

const STATUS_BORDER: Record<InvoiceAuditEntry["status"], string> = {
  Received: Colors.green,
  Paid: Colors.green,
  Approved: Colors.grey300,
  Pending: Colors.amber,
  Rejected: Colors.red,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })
  );
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-AU", { minimumFractionDigits: 0 });
}

/* ─── PDF generation ─── */
function buildHtml(data: AuditLogData): string {
  const rows = data.entries
    .flatMap((entry) =>
      entry.events.map(
        (ev, i) => `
        <tr>
          ${i === 0 ? `<td rowspan="${entry.events.length}" class="inv-cell">${entry.description}<br/><small>${entry.submittingParty} · ${formatCurrency(entry.amount)}</small></td>` : ""}
          <td>${EVENT_LABEL[ev.type]}</td>
          <td>${ev.actorName}<br/><small>${ev.actorRole}</small></td>
          <td>${formatDateTime(ev.timestamp)}</td>
          <td>${ev.rejectionReason ?? "—"}</td>
        </tr>`
      )
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1A1A1A; margin: 0; width: 100%; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #9B9B9B; font-size: 11px; margin-bottom: 20px; }
  .summary { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat { border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px 14px; min-width: 100px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9B9B9B; }
  .stat-value { font-size: 16px; font-weight: bold; color: #1A1A1A; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  th { background: #1B5C38; color: #ffffff; font-size: 11px; text-transform: uppercase;
       letter-spacing: 0.5px; padding: 8px 10px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .inv-cell { font-weight: 600; border-right: 1px solid #e0e0e0; max-width: 160px; word-wrap: break-word; }
  small { color: #9B9B9B; font-size: 10px; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 32px; font-size: 10px; color: #9B9B9B; border-top: 1px solid #e0e0e0;
            padding-top: 12px; page-break-inside: avoid; }
</style>
</head>
<body>
  <h1>Payment Audit Log</h1>
  <div class="meta">
    ${data.projectName} &nbsp;|&nbsp;
    Generated: ${formatDateTime(data.generatedAt)} &nbsp;|&nbsp;
    Viewed by: ${data.viewerName} (${data.viewerRole})
  </div>
  <div class="summary">
    <div class="stat"><div class="stat-label">Invoices</div><div class="stat-value">${data.summary.totalInvoices}</div></div>
    <div class="stat"><div class="stat-label">Total</div><div class="stat-value">${formatCurrency(data.summary.totalAmount)}</div></div>
    <div class="stat"><div class="stat-label">Paid</div><div class="stat-value">${formatCurrency(data.summary.paidAmount)}</div></div>
    <div class="stat"><div class="stat-label">Outstanding</div><div class="stat-value">${formatCurrency(data.summary.outstandingAmount)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Invoice</th><th>Event</th><th>Actor</th><th>Date &amp; Time</th><th>Rejection Reason</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    This record is generated from an immutable event log. Entries cannot be modified or deleted.
    Retain as a permanent project document.
  </div>
</body>
</html>`;
}

/* ─── Sub-components ─── */
function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statCard}>
      <AppText style={styles.statLabel}>{label}</AppText>
      <AppText style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </AppText>
    </View>
  );
}

function TimelineEvent({ ev, isLast }: { ev: AuditEvent; isLast: boolean }) {
  const dot = EVENT_COLOR[ev.type];
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventLine}>
        <View style={[styles.eventDot, { backgroundColor: dot }]} />
        {!isLast && <View style={styles.eventConnector} />}
      </View>
      <View style={styles.eventContent}>
        <AppText style={styles.eventType}>{EVENT_LABEL[ev.type]}</AppText>
        <AppText style={styles.eventActor}>
          {ev.actorName} <AppText style={styles.eventRole}>({ev.actorRole})</AppText>
        </AppText>
        <AppText style={styles.eventTime}>{formatDateTime(ev.timestamp)}</AppText>
        {ev.rejectionReason && (
          <View style={styles.rejectionBox}>
            <AppText style={styles.rejectionText}>Reason: &quot;{ev.rejectionReason}&quot;</AppText>
          </View>
        )}
      </View>
    </View>
  );
}

function InvoiceCard({ entry }: { entry: InvoiceAuditEntry }) {
  const borderColor = STATUS_BORDER[entry.status];
  const firstEvent = entry.events[0];
  const lastEvent = entry.events[entry.events.length - 1];
  const turnaround =
    entry.events.length > 1 && firstEvent && lastEvent
      ? daysBetween(firstEvent.timestamp, lastEvent.timestamp)
      : null;

  return (
    <View style={[styles.invoiceCard, { borderLeftColor: borderColor }]}>
      <View style={styles.invoiceCardHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.invoiceDesc} numberOfLines={2}>
            {entry.description}
          </AppText>
          {entry.invoiceNumber && (
            <View style={styles.invoiceNumPill}>
              <AppText style={styles.invoiceNumPillText}>{entry.invoiceNumber}</AppText>
            </View>
          )}
        </View>
        <AppText style={styles.invoiceAmount}>{formatCurrency(entry.amount)}</AppText>
      </View>
      <AppText style={styles.invoiceMeta}>
        {entry.submittingParty} · {entry.submittingCategory}
      </AppText>
      <AppText style={styles.invoiceDates}>Due: {formatDate(entry.dateDue)}</AppText>

      <View style={styles.divider} />

      {entry.events.map((ev, i) => (
        <TimelineEvent key={i} ev={ev} isLast={i === entry.events.length - 1} />
      ))}

      {turnaround !== null && (
        <View style={styles.turnaroundBadge}>
          <AppText style={styles.turnaroundText}>
            {turnaround === 0 ? "Same day" : `${turnaround}d total turnaround`}
          </AppText>
        </View>
      )}
    </View>
  );
}

/* ─── Main screen ─── */
export default function AuditLog() {
  const { projectId, name: rawName } = useLocalSearchParams<{
    projectId: string;
    name: string;
  }>();
  const projectName = rawName ? decodeURIComponent(rawName) : undefined;
  const { fetchWithAuth } = useAuth();

  const [data, setData] = useState<AuditLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/project/${projectId}/audit-log`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load audit log");
      } else {
        setData(json);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchWithAuth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleExportPdf() {
    if (!data) return;
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildHtml(data),
        width: 595,
        height: 842,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch {
      // sharing cancelled or unavailable — do nothing
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={{ backgroundColor: Colors.vouchGreen }}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(app)/project/[id]",
                  params: { id: projectId, name: projectName ?? "" },
                } as any)
              }
              style={styles.backBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Back to project"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
              <AppText style={styles.backLabel}>Back</AppText>
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>Payment Audit Log</AppText>
            <AppText style={styles.headerSubtitle}>
              {projectName ?? data?.projectName ?? ""}
            </AppText>
            {data && (
              <View style={styles.viewerBadge}>
                <AppText style={styles.viewerBadgeText}>{data.viewerRole.toUpperCase()}</AppText>
              </View>
            )}
            <View style={styles.exportBtns}>
              <TouchableOpacity
                style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
                onPress={handleExportPdf}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <AppText style={styles.exportBtnText}>↓ PDF</AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.vouchGreen} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <AppText style={styles.errorText}>{error}</AppText>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <AppText style={styles.retryBtnText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard label="TOTAL INVOICES" value={String(data.summary.totalInvoices)} />
              <StatCard label="TOTAL AMOUNT" value={formatCurrency(data.summary.totalAmount)} />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="PAID"
                value={formatCurrency(data.summary.paidAmount)}
                valueColor={Colors.green}
              />
              <StatCard
                label="OUTSTANDING"
                value={formatCurrency(data.summary.outstandingAmount)}
                valueColor={data.summary.outstandingAmount > 0 ? Colors.amber : undefined}
              />
            </View>
          </View>

          {data.entries.length === 0 ? (
            <View style={styles.emptyState}>
              <AppText style={styles.emptyText}>No invoices on this project yet.</AppText>
            </View>
          ) : (
            data.entries.map((entry) => <InvoiceCard key={entry.invoiceId} entry={entry} />)
          )}

          <View style={styles.notice}>
            <AppText style={styles.noticeText}>
              This record is generated from an immutable event log. Entries cannot be modified or
              deleted.
            </AppText>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grey100 },
  header: { paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 44,
    minWidth: 44,
    marginBottom: 10,
    alignSelf: "flex-start",
    direction: "ltr",
  },
  backLabel: { fontSize: 13, color: Colors.white, fontFamily: Fonts.semiBold },
  exportBtns: { flexDirection: "row", gap: 8, marginTop: 14 },
  exportBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: Colors.white, fontSize: 13, fontFamily: Fonts.bold },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 18,
    color: Colors.white,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  viewerBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  viewerBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: { color: Colors.vouchGreen, fontFamily: Fonts.bold, fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },
  statsGrid: { gap: 8, marginBottom: 4 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  statLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 13,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    textAlign: "center",
  },
  invoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  invoiceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 2,
  },
  invoiceDesc: { flex: 1, fontSize: 15, fontFamily: Fonts.bold, color: Colors.black },
  invoiceAmount: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.black },
  invoiceNumPill: {
    alignSelf: "flex-start",
    backgroundColor: Colors.grey100,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    marginBottom: 2,
  },
  invoiceNumPillText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.black },
  invoiceMeta: { fontSize: 12, color: Colors.grey700, fontFamily: Fonts.medium, marginBottom: 2 },
  invoiceDates: { fontSize: 11, color: Colors.grey700, fontFamily: Fonts.medium, marginBottom: 2 },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.07)", marginVertical: 10 },
  eventRow: { flexDirection: "row", marginBottom: 2 },
  eventLine: { width: 20, alignItems: "center" },
  eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  eventConnector: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginTop: 2,
    marginBottom: -4,
  },
  eventContent: { flex: 1, paddingLeft: 8, paddingBottom: 12 },
  eventType: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.black },
  eventActor: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.grey700, marginTop: 1 },
  eventRole: { fontSize: 11, color: Colors.grey700 },
  eventTime: { fontSize: 11, color: Colors.grey700, marginTop: 1 },
  rejectionBox: {
    marginTop: 4,
    backgroundColor: Colors.redBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rejectionText: { fontSize: 11, color: Colors.red, fontFamily: Fonts.semiBold },
  turnaroundBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.grey100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  turnaroundText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.grey700 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: Colors.grey500, fontFamily: Fonts.medium },
  notice: { backgroundColor: Colors.grey100, borderRadius: 10, padding: 12, marginTop: 8 },
  noticeText: {
    fontSize: 11,
    color: Colors.grey500,
    fontFamily: Fonts.medium,
    textAlign: "center",
    lineHeight: 16,
  },
});
