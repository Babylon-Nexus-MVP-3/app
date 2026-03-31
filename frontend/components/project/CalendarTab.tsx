import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { Colors } from "@/constants/colors";
import { ApiInvoice, InvoiceActionType, InvoiceStatus, SEVERITY } from "./types";
import {
  apiStatusToCalStatus,
  canViewAmount,
  invoiceStatusLabel,
  statusColor,
  statusBg,
  statusLabel,
} from "./helpers";
import { styles } from "./styles";
import { InvoiceDetailModal } from "./InvoiceDetailModal";

export function CalendarTab({
  invoices,
  role,
  userId,
  invoiceAction,
}: {
  invoices: ApiInvoice[];
  role: string;
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
}) {
  const _t = new Date();
  const todayStr = `${_t.getFullYear()}-${String(_t.getMonth() + 1).padStart(2, "0")}-${String(_t.getDate()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);

  // Build worst-status dot per date (YYYY-MM-DD key)
  const dayStatusMap = new Map<string, InvoiceStatus>();
  for (const inv of invoices.filter((i) => i.status !== "Rejected")) {
    const dateStr = inv.dateDue.split("T")[0];
    const calStatus = apiStatusToCalStatus(inv);
    const existing = dayStatusMap.get(dateStr);
    if (!existing || SEVERITY[calStatus] > SEVERITY[existing]) {
      dayStatusMap.set(dateStr, calStatus);
    }
  }

  // Build markedDates for react-native-calendars (multi-dot)
  const markedDates: Record<string, any> = {};
  for (const [dateStr, calStatus] of dayStatusMap) {
    markedDates[dateStr] = {
      dots: [{ key: dateStr, color: statusColor(calStatus) }],
      ...(selectedDate === dateStr && { selected: true, selectedColor: Colors.navy }),
    };
  }
  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: Colors.navy };
  }

  // Invoices due on the selected date
  const selectedInvoices = selectedDate
    ? invoices.filter((i) => i.status !== "Rejected" && i.dateDue.split("T")[0] === selectedDate)
    : [];

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day) =>
          setSelectedDate(day.dateString === selectedDate ? null : day.dateString)
        }
        theme={{
          backgroundColor: Colors.offWhite,
          calendarBackground: Colors.offWhite,
          textSectionTitleColor: Colors.textSecondary,
          selectedDayBackgroundColor: Colors.navy,
          selectedDayTextColor: Colors.white,
          todayTextColor: Colors.white,
          todayBackgroundColor: Colors.gold,
          dayTextColor: Colors.textPrimary,
          textDisabledColor: "rgba(0,0,0,0.2)",
          dotColor: Colors.navy,
          selectedDotColor: Colors.white,
          arrowColor: Colors.navy,
          monthTextColor: Colors.textPrimary,
          textMonthFontWeight: "bold",
          textMonthFontSize: 16,
          textDayFontSize: 13,
        }}
        style={styles.calendarWidget}
      />

      {/* Legend */}
      <View style={styles.legend}>
        {(["green", "issued", "grey", "amber", "red"] as InvoiceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: statusColor(s) }]} />
            <Text style={styles.legendLabel}>{statusLabel(s)}</Text>
          </View>
        ))}
      </View>

      {/* Selected date invoice list */}
      {selectedDate && (
        <>
          <Text style={styles.sectionLabel}>{selectedDateLabel}</Text>
          {selectedInvoices.length === 0 ? (
            <Text style={styles.emptyText}>No invoices due on this date.</Text>
          ) : (
            selectedInvoices.map((inv) => {
              const calStatus = apiStatusToCalStatus(inv);
              return (
                <TouchableOpacity
                  key={inv.id}
                  onPress={() => setDetailInvoice(inv)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}>
                    <View style={styles.invoiceRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                        {inv.invoiceNumber ? (
                          <View style={styles.invoiceNumPill}>
                            <Text style={styles.invoiceNumText}>{inv.invoiceNumber}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View
                        style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}
                      >
                        <Text
                          style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}
                        >
                          {invoiceStatusLabel(inv.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.invoiceDate} numberOfLines={1}>
                      {inv.description}
                    </Text>
                    {canViewAmount(role, inv, userId) && inv.amount != null && (
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
            })
          )}
        </>
      )}

      <InvoiceDetailModal
        visible={detailInvoice !== null}
        inv={detailInvoice}
        viewerRole={role}
        userId={userId}
        invoiceAction={invoiceAction}
        onClose={() => setDetailInvoice(null)}
      />
    </ScrollView>
  );
}
