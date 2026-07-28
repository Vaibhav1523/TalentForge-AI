"use client";

import { useEffect, useMemo, useState } from "react";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import styles from "./page.module.css";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BASE_SLOTS = ["10:00", "11:30", "14:00", "15:30", "17:00"];

function formatMonthYear(date: Date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function formatTimeLabel(value24: string) {
  const [hourRaw, minuteRaw] = value24.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function toMinutes(value24: string) {
  const [hour, minute] = value24.split(":").map(Number);
  return hour * 60 + minute;
}

export default function RecruiterCalendarPage() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const today = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const daysInMonth = useMemo(
    () => new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate(),
    [monthCursor]
  );
  const firstDayOffset = useMemo(
    () => new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).getDay(),
    [monthCursor]
  );

  const calendarCells = useMemo(() => {
    const cells: Array<{ date: Date | null; key: string; disabled: boolean }> = [];
    for (let i = 0; i < firstDayOffset; i += 1) {
      cells.push({ date: null, key: `empty-${i}`, disabled: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
      const isPast = date < today;
      cells.push({ date, key: `day-${day}`, disabled: isPast });
    }
    return cells;
  }, [daysInMonth, firstDayOffset, monthCursor, today]);

  const availableSlots = useMemo(() => {
    const isToday =
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate();

    if (!isToday) {
      return BASE_SLOTS;
    }

    const cutoff = now.getHours() * 60 + now.getMinutes() + 15;
    return BASE_SLOTS.filter((slot) => toMinutes(slot) > cutoff);
  }, [selectedDate, today, now]);

  if (submitted) {
    return (
      <main className={styles.page}>
        <AuroraCanvas />
        <div className={styles.homeSmoke} aria-hidden="true" />
        <section className={styles.successStage}>
          <div className={styles.successCard}>
            <div className={styles.tickCircle} aria-hidden="true">
              <span className={styles.tickMark}>✓</span>
            </div>
            <h1 className={styles.successTitle}>Booking Confirmed!</h1>
            <p className={styles.successText}>
              Thanks for scheduling with us. We will get back to you shortly with call details.
            </p>
            <a href="/" className={styles.successBtn}>
              Back to Home
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <AuroraCanvas />
      <div className={styles.homeSmoke} aria-hidden="true" />

      <section className={styles.stage}>
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <h1 className={styles.heading}>Schedule a Call</h1>
            <div className={styles.monthPill}>
              <button
                type="button"
                className={styles.monthBtn}
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                aria-label="Previous month"
              >
                &#8249;
              </button>
              <span>{formatMonthYear(monthCursor)}</span>
              <button
                type="button"
                className={styles.monthBtn}
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                aria-label="Next month"
              >
                &#8250;
              </button>
            </div>
          </div>

          <div className={styles.calendarWrap}>
            <div>
              <div className={styles.weekRow}>
                {WEEK_DAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className={styles.grid}>
                {calendarCells.map((cell) => {
                  if (!cell.date) {
                    return <div key={cell.key} className={styles.emptyCell} />;
                  }

                  const isSelected =
                    selectedDate.getFullYear() === cell.date.getFullYear() &&
                    selectedDate.getMonth() === cell.date.getMonth() &&
                    selectedDate.getDate() === cell.date.getDate();

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      disabled={cell.disabled}
                      className={`${styles.dayCell} ${isSelected ? styles.daySelected : ""}`}
                      style={cell.disabled ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                      onClick={() => {
                        if (cell.disabled) return;
                        setSelectedDate(cell.date!);
                        setSelectedSlot(null);
                      }}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.slotCol}>
              {availableSlots.length === 0 ? (
                <div className={styles.noSlots}>No slots left today</div>
              ) : (
                availableSlots.map((slot) => {
                  const label = formatTimeLabel(slot);
                  const active = selectedSlot === slot;
                  return (
                    <button
                      type="button"
                      key={slot}
                      className={`${styles.slotBtn} ${active ? styles.slotActive : ""}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {label}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={styles.bottomRow}>
            <p className={styles.jobHint}>
              Looking for a job? <a href="/sign-in">Apply here</a>
            </p>
            <button
              type="button"
              className={styles.confirmBtn}
              disabled={!selectedSlot}
              onClick={() => {
                if (!selectedSlot) return;
                if (selectedDate < today) return;
                // TODO: persist booking via API (e.g., POST to /api/bookings) before showing confirmation
                setSubmitted(true);
              }}
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
