import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

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
type FilterStatus = "All" | "Paid" | "Received" | "Approved" | "Pending" | "Rejected";
const FILTERS: FilterStatus[] = ["All", "Paid", "Received", "Approved", "Pending", "Rejected"];

const EVENT_LABEL: Record<AuditEventType, string> = {
  InvoiceSubmitted: "Submitted",
  InvoiceApproved: "Approved",
  InvoicePaid: "Paid",
  InvoiceReceived: "Received",
  InvoiceRejected: "Rejected",
};

const EVENT_COLOR: Record<AuditEventType, string> = {
  InvoiceSubmitted: Colors.gold,
  InvoiceApproved: Colors.green,
  InvoicePaid: Colors.green,
  InvoiceReceived: Colors.green,
  InvoiceRejected: Colors.red,
};

const STATUS_BORDER: Record<InvoiceAuditEntry["status"], string> = {
  Received: Colors.green,
  Paid: Colors.green,
  Approved: Colors.grey,
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
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1A1A2E; margin: 0; width: 100%; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #6B7280; font-size: 11px; margin-bottom: 20px; }
  .summary { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat { border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px 14px; min-width: 100px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6B7280; }
  .stat-value { font-size: 16px; font-weight: bold; color: #1A1A2E; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  th { background: #1A1A2E; color: #C9A84C; font-size: 11px; text-transform: uppercase;
       letter-spacing: 0.5px; padding: 8px 10px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .inv-cell { font-weight: 600; border-right: 1px solid #e0e0e0; max-width: 160px; word-wrap: break-word; }
  small { color: #6B7280; font-size: 10px; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 32px; font-size: 10px; color: #6B7280; border-top: 1px solid #e0e0e0;
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

function buildPlainText(data: AuditLogData): string {
  const lines: string[] = [
    "PAYMENT AUDIT LOG",
    `Project: ${data.projectName}`,
    `Generated: ${formatDateTime(data.generatedAt)}`,
    `Viewed by: ${data.viewerName} (${data.viewerRole})`,
    "",
    `Invoices: ${data.summary.totalInvoices}  |  Total: ${formatCurrency(data.summary.totalAmount)}  |  Paid: ${formatCurrency(data.summary.paidAmount)}  |  Outstanding: ${formatCurrency(data.summary.outstandingAmount)}`,
    "",
    "─".repeat(60),
  ];

  for (const entry of data.entries) {
    lines.push(`\n${entry.description} — ${formatCurrency(entry.amount)} (${entry.submittingParty})`);
    for (const ev of entry.events) {
      const rejection = ev.rejectionReason ? ` — "${ev.rejectionReason}"` : "";
      lines.push(`  ${EVENT_LABEL[ev.type].padEnd(10)} ${ev.actorName} (${ev.actorRole})  ${formatDateTime(ev.timestamp)}${rejection}`);
    }
  }

  lines.push("\n" + "─".repeat(60));
  lines.push("This record is generated from an immutable event log.");
  lines.push("Entries cannot be modified or deleted.");
  return lines.join("\n");
}

/* ─── Sub-components ─── */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
        <Text style={styles.eventType}>{EVENT_LABEL[ev.type]}</Text>
        <Text style={styles.eventActor}>
          {ev.actorName}{" "}
          <Text style={styles.eventRole}>({ev.actorRole})</Text>
        </Text>
        <Text style={styles.eventTime}>{formatDateTime(ev.timestamp)}</Text>
        {ev.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionText}>Reason: "{ev.rejectionReason}"</Text>
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
        <Text style={styles.invoiceDesc} numberOfLines={2}>
          {entry.description}
        </Text>
        <Text style={styles.invoiceAmount}>{formatCurrency(entry.amount)}</Text>
      </View>
      <Text style={styles.invoiceMeta}>
        {entry.submittingParty} · {entry.submittingCategory}
      </Text>
      <Text style={styles.invoiceDates}>Due: {formatDate(entry.dateDue)}</Text>

      <View style={styles.divider} />

      {entry.events.map((ev, i) => (
        <TimelineEvent key={i} ev={ev} isLast={i === entry.events.length - 1} />
      ))}

      {turnaround !== null && (
        <View style={styles.turnaroundBadge}>
          <Text style={styles.turnaroundText}>
            {turnaround === 0 ? "Same day" : `${turnaround}d total turnaround`}
          </Text>
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
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`http://localhost:3229/project/${projectId}/audit-log`);
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

  const filteredEntries = data?.entries.filter((e) => filter === "All" || e.status === filter) ?? [];

  async function handleCopy() {
    if (!data) return;
    await Clipboard.setStringAsync(buildPlainText(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExportPdf() {
    if (!data) return;
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml(data), width: 595, height: 842 });
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
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>
            <View style={styles.exportBtns}>
              <TouchableOpacity style={styles.exportBtn} onPress={handleCopy}>
                <Text style={styles.exportBtnText}>{copied ? "✓" : "⎘"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
                onPress={handleExportPdf}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={Colors.gold} />
                ) : (
                  <Text style={styles.exportBtnText}>↓ PDF</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerTitle}>Payment Audit Log</Text>
          <Text style={styles.headerSubtitle}>{projectName ?? data?.projectName ?? ""}</Text>
          {data && (
            <View style={styles.viewerBadge}>
              <Text style={styles.viewerBadgeText}>{data.viewerRole.toUpperCase()}</Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsRow}>
            <StatCard label="INVOICES" value={String(data.summary.totalInvoices)} />
            <StatCard label="TOTAL" value={formatCurrency(data.summary.totalAmount)} />
            <StatCard label="PAID" value={formatCurrency(data.summary.paidAmount)} />
            <StatCard label="OUTSTANDING" value={formatCurrency(data.summary.outstandingAmount)} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No invoices match this filter.</Text>
            </View>
          ) : (
            filteredEntries.map((entry) => <InvoiceCard key={entry.invoiceId} entry={entry} />)
          )}

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              This record is generated from an immutable event log. Entries cannot be modified or
              deleted.
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backArrow: { fontSize: 28, color: Colors.gold, lineHeight: 30 },
  backLabel: { fontSize: 14, color: Colors.gold, fontWeight: "600" },
  exportBtns: { flexDirection: "row", gap: 8 },
  exportBtn: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: Colors.gold, fontSize: 13, fontWeight: "700" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.white, marginBottom: 2 },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    marginBottom: 8,
  },
  viewerBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  viewerBadgeText: { color: Colors.gold, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: { color: Colors.gold, fontWeight: "700", fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: { fontSize: 13, fontWeight: "800", color: Colors.textPrimary, textAlign: "center" },
  filterScroll: { flexGrow: 0 },
  filterRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  filterChip: {
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.35)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: Colors.white,
  },
  filterChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  filterChipText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.white },
  invoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
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
  invoiceDesc: { flex: 1, fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  invoiceAmount: { fontSize: 15, fontWeight: "800", color: Colors.textPrimary },
  invoiceMeta: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500", marginBottom: 2 },
  invoiceDates: { fontSize: 11, color: Colors.textSecondary, fontWeight: "500", marginBottom: 2 },
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
  eventType: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  eventActor: { fontSize: 12, fontWeight: "500", color: Colors.textSecondary, marginTop: 1 },
  eventRole: { fontSize: 11, color: Colors.textSecondary },
  eventTime: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  rejectionBox: {
    marginTop: 4,
    backgroundColor: Colors.redBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rejectionText: { fontSize: 11, color: Colors.red, fontWeight: "600" },
  turnaroundBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.greyBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  turnaroundText: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, fontWeight: "500" },
  notice: { backgroundColor: Colors.greyBg, borderRadius: 10, padding: 12, marginTop: 8 },
  noticeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 16,
  },
});
