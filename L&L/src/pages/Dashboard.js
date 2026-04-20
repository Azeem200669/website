import { useState } from "react";
import "./Dashboard.css";

// ── helpers ──────────────────────────────────────────────────────────────────

// Parse "20 Apr 2025" → { day:20, month:3, year:2025 }
function parseDate(str = "") {
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const parts = str.trim().split(" ");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = months[parts[1]];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return { day, month, year };
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

// ── History Page ─────────────────────────────────────────────────────────────

function HistoryPage({ entries, incomeRecords, onClose }) {
  const today = new Date();
  const [selectedYear, setSelectedYear]   = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay]     = useState(null);

  // Collect all years that exist in data
  const allDates = [
    ...incomeRecords.map((r) => parseDate(r.date)),
    ...entries
      .filter((e) => e.category === "salary")
      .flatMap((e) => e.details.map((d) => parseDate(d.date))),
  ].filter(Boolean);

  const years = [...new Set(allDates.map((d) => d.year))].sort((a, b) => b - a);
  if (!years.includes(selectedYear) && years.length > 0) {
    // handled via select, no need to force
  }
  const yearList = years.length > 0 ? years : [today.getFullYear()];

  // Days that have data in the current month/year
  const activeDays = new Set(
    allDates
      .filter((d) => d.year === selectedYear && d.month === selectedMonth)
      .map((d) => d.day)
  );

  // Filter records
  const filteredIncome = incomeRecords.filter((r) => {
    const d = parseDate(r.date);
    if (!d) return false;
    if (d.year !== selectedYear || d.month !== selectedMonth) return false;
    if (selectedDay !== null && d.day !== selectedDay) return false;
    return true;
  });

  const salaryEntries = entries.filter((e) => e.category === "salary");
  const filteredSalaryRows = salaryEntries.flatMap((worker) =>
    worker.details
      .filter((det) => {
        const d = parseDate(det.date);
        if (!d) return false;
        if (d.year !== selectedYear || d.month !== selectedMonth) return false;
        if (selectedDay !== null && d.day !== selectedDay) return false;
        return true;
      })
      .map((det) => ({ name: worker.name, amount: det.amount, date: det.date }))
  );

  const totalIncome = filteredIncome.reduce((s, r) => s + r.phonePe + r.cash, 0);
  const totalSalary = filteredSalaryRows.reduce((s, r) => s + Number(r.amount), 0);
  const profitLoss  = totalIncome - totalSalary;
  const isProfit    = profitLoss >= 0;
  const hasData     = filteredIncome.length > 0 || filteredSalaryRows.length > 0;

  // Calendar grid
  const totalDays  = daysInMonth(selectedYear, selectedMonth);
  const startDay   = firstDayOfMonth(selectedYear, selectedMonth);
  const calCells   = [];
  for (let i = 0; i < startDay; i++) calCells.push(null);
  for (let d = 1; d <= totalDays; d++) calCells.push(d);

  return (
    <div className="page history-page">
      {/* Header */}
      <div className="history-header">
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h2 className="history-title">📅 History</h2>
      </div>

      {/* Year selector */}
      <div className="history-year-row">
        {yearList.map((y) => (
          <button
            key={y}
            className={`year-chip ${y === selectedYear ? "active" : ""}`}
            onClick={() => { setSelectedYear(y); setSelectedDay(null); }}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Month selector */}
      <div className="history-month-row">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            className={`month-chip ${i === selectedMonth ? "active" : ""}`}
            onClick={() => { setSelectedMonth(i); setSelectedDay(null); }}
          >
            {m.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="cal-card">
        <div className="cal-month-label">
          {MONTHS[selectedMonth]} {selectedYear}
          {selectedDay !== null && (
            <button className="clear-day-btn" onClick={() => setSelectedDay(null)}>
              ✕ Clear day
            </button>
          )}
        </div>
        <div className="cal-weekdays">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
            <span key={d} className="cal-weekday">{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {calCells.map((day, idx) => (
            <button
              key={idx}
              className={[
                "cal-day",
                day === null        ? "cal-empty"   : "",
                activeDays.has(day) ? "has-data"    : "",
                day === selectedDay ? "selected-day" : "",
              ].join(" ")}
              disabled={day === null}
              onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
            >
              {day || ""}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {!hasData ? (
        <p className="empty-msg" style={{ textAlign: "center", marginTop: 24 }}>
          No records found for {selectedDay ? `${selectedDay} ` : ""}
          {MONTHS[selectedMonth]} {selectedYear}.
        </p>
      ) : (
        <>
          {/* Summary chips */}
          <div className="hist-summary-row">
            <div className="hist-chip income-chip">
              <span>💰 Income</span>
              <strong>₹{totalIncome.toLocaleString("en-IN")}</strong>
            </div>
            <div className="hist-chip salary-chip">
              <span>👷 Paid</span>
              <strong>₹{totalSalary.toLocaleString("en-IN")}</strong>
            </div>
            <div className={`hist-chip ${isProfit ? "profit-chip" : "loss-chip"}`}>
              <span>{isProfit ? "📈 Profit" : "📉 Loss"}</span>
              <strong>{isProfit ? "+" : "-"}₹{Math.abs(profitLoss).toLocaleString("en-IN")}</strong>
            </div>
          </div>

          {/* Income table */}
          {filteredIncome.length > 0 && (
            <div className="summary-table" style={{ marginTop: 16 }}>
              <h3>Income Records</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>📱 PhonePe</th>
                    <th>💵 Cash</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncome.map((r) => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.phonePe > 0 ? `₹${r.phonePe}` : "—"}</td>
                      <td>{r.cash > 0    ? `₹${r.cash}`    : "—"}</td>
                      <td className="table-amount">
                        ₹{(r.phonePe + r.cash).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Salary table */}
          {filteredSalaryRows.length > 0 && (
            <div className="summary-table" style={{ marginTop: 16 }}>
              <h3>Worker Salary Records</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalaryRows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.date}</td>
                      <td className="table-amount">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ entries, incomeRecords }) {
  const [showHistory, setShowHistory] = useState(false);

  if (showHistory) {
    return (
      <HistoryPage
        entries={entries}
        incomeRecords={incomeRecords}
        onClose={() => setShowHistory(false)}
      />
    );
  }

  const totalPhonePe   = incomeRecords.reduce((sum, r) => sum + r.phonePe, 0);
  const totalCash      = incomeRecords.reduce((sum, r) => sum + r.cash, 0);
  const totalIncome    = totalPhonePe + totalCash;
  const totalWorkerPaid = entries
    .filter((e) => e.category === "salary")
    .flatMap((e) => e.details)
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const profitLoss = totalIncome - totalWorkerPaid;
  const isProfit   = profitLoss >= 0;

  return (
    <div className="dashboard">
      <div className="dash-top-row">
        <h2 className="dash-title">Dashboard</h2>
        <button className="history-btn" onClick={() => setShowHistory(true)}>
          🗓 History
        </button>
      </div>

      <div className="dash-grid">
        <div className="dash-card income-card">
          <div className="dash-icon">💰</div>
          <div className="dash-info">
            <span className="dash-label">Total Income</span>
            <span className="dash-value">₹{totalIncome.toLocaleString("en-IN")}</span>
            <div className="dash-breakdown">
              <span>📱 PhonePe: ₹{totalPhonePe.toLocaleString("en-IN")}</span>
              <span>💵 Cash: ₹{totalCash.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <div className="dash-card salary-card">
          <div className="dash-icon">👷</div>
          <div className="dash-info">
            <span className="dash-label">Total Worker Paid</span>
            <span className="dash-value">₹{totalWorkerPaid.toLocaleString("en-IN")}</span>
            <div className="dash-breakdown">
              <span>{entries.filter((e) => e.category === "salary").length} worker(s)</span>
            </div>
          </div>
        </div>

        <div className={`dash-card ${isProfit ? "profit-card" : "loss-card"}`}>
          <div className="dash-icon">{isProfit ? "📈" : "📉"}</div>
          <div className="dash-info">
            <span className="dash-label">{isProfit ? "Total Profit" : "Total Loss"}</span>
            <span className={`dash-value ${isProfit ? "profit-value" : "loss-value"}`}>
              {isProfit ? "+" : "-"}₹{Math.abs(profitLoss).toLocaleString("en-IN")}
            </span>
            <div className="dash-breakdown">
              <span>Income − Worker Pay</span>
            </div>
          </div>
        </div>
      </div>

      {incomeRecords.length > 0 && (
        <div className="summary-table">
          <h3>Income Records</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>📱 PhonePe</th><th>💵 Cash</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {incomeRecords.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.phonePe > 0 ? `₹${r.phonePe}` : "—"}</td>
                  <td>{r.cash > 0    ? `₹${r.cash}`    : "—"}</td>
                  <td className="table-amount">₹{(r.phonePe + r.cash).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.filter((e) => e.category === "salary").length > 0 && (
        <div className="summary-table" style={{ marginTop: "16px" }}>
          <h3>Worker Salary Records</h3>
          <table>
            <thead>
              <tr><th>Name</th><th>Total Paid (₹)</th></tr>
            </thead>
            <tbody>
              {entries.filter((e) => e.category === "salary").map((item) => {
                const total = item.details.reduce(
                  (sum, d) => sum + Number(d.amount || 0), 0
                );
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="table-amount">₹{total.toLocaleString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {incomeRecords.length === 0 && entries.length === 0 && (
        <p className="empty-msg" style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: "40px" }}>
          No data yet. Add entries to see your dashboard.
        </p>
      )}
    </div>
  );
}