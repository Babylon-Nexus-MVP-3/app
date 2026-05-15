import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { Colors } from "@/constants/colors";
import { AppText } from "@/components/AppText";
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

  const dayStatusMap = new Map<string, InvoiceStatus>();
  for (const inv of invoices.filter((i) => i.status !== "Rejected")) {
    const dateStr = inv.dateDue.split("T")[0];
    const calStatus = apiStatusToCalStatus(inv);
    const existing = dayStatusMap.get(dateStr);
    if (!existing || SEVERITY[calStatus] > SEVERITY[existing]) {
      dayStatusMap.set(dateStr, calStatus);
    }
  }

  const allMarkedDates = new Set([
    ...dayStatusMap.keys(),
    todayStr,
    ...(selectedDate ? [selectedDate] : []),
  ]);

  const markedDates: Record<string, any> = {};
  for (const dateStr of allMarkedDates) {
    const isSelected = selectedDate === dateStr;
    const isToday = dateStr === todayStr;
    const calStatus = dayStatusMap.get(dateStr);

    let container: Record<string, any> = { borderRadius: 16 };
    let textColor: string;

    if (isSelected) {
      container = { ...container, backgroundColor: Colors.vouchGreen };
      textColor = Colors.white;
    } else if (calStatus) {
      container = { ...container, backgroundColor: statusColor(calStatus) };
      textColor = Colors.white;
    } else if (isToday) {
      container = {
        ...container,
        backgroundColor: Colors.grey100,
        borderWidth: 2,
        borderColor: Colors.vouchGreen,
      };
      textColor = Colors.black;
    } else {
      continue;
    }

    markedDates[dateStr] = {
      customStyles: {
        container,
        text: { color: textColor, fontWeight: "bold" },
      },
    };
  }

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
    <View style={styles.bodyContent}>
      <Calendar
        markingType="custom"
        markedDates={markedDates}
        onDayPress={(day) =>
          setSelectedDate(day.dateString === selectedDate ? null : day.dateString)
        }
        theme={{
          backgroundColor: Colors.grey100,
          calendarBackground: Colors.grey100,
          textSectionTitleColor: Colors.grey500,
          dayTextColor: Colors.black,
          textDisabledColor: "rgba(0,0,0,0.2)",
          arrowColor: Colors.vouchGreen,
          monthTextColor: Colors.black,
          textMonthFontWeight: "bold",
          textMonthFontSize: 16,
          textDayFontSize: 13,
        }}
        style={styles.calendarWidget}
      />

      <View style={styles.legend}>
        {(["green", "issued", "grey", "amber", "red"] as InvoiceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: statusColor(s) }]} />
            <AppText style={styles.legendLabel}>{statusLabel(s)}</AppText>
          </View>
        ))}
      </View>

      {selectedDate && (
        <>
          <AppText style={styles.sectionLabel}>{selectedDateLabel}</AppText>
          {selectedInvoices.length === 0 ? (
            <AppText style={styles.emptyText}>No invoices due on this date.</AppText>
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
                        <AppText style={styles.invoiceName}>{inv.submittingParty}</AppText>
                        {inv.invoiceNumber ? (
                          <View style={styles.invoiceNumPill}>
                            <AppText style={styles.invoiceNumText}>{inv.invoiceNumber}</AppText>
                          </View>
                        ) : null}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                        <AppText
                          style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}
                        >
                          {invoiceStatusLabel(inv.status)}
                        </AppText>
                      </View>
                    </View>
                    <AppText style={styles.invoiceDate} numberOfLines={1}>
                      {inv.description}
                    </AppText>
                    {canViewAmount(role, inv, userId) && inv.amount != null && (
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
    </View>
  );
}
