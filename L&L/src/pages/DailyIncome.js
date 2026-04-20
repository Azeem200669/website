import { useState } from "react";
import "./Pages.css";

export default function DailyIncome({ onSaveIncome, onRemoveIncome, incomeRecords }) {
  const [phonePe, setPhonePe] = useState("");
  const [cash, setCash] = useState("");

  const handleSave = () => {
    if (!phonePe && !cash) {
      alert("Please enter PhonePe or Cash amount");
      return;
    }

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    onSaveIncome({
      phonePe: Number(phonePe) || 0,
      cash: Number(cash) || 0,
      date: formattedDate,
    });

    setPhonePe("");
    setCash("");
  };

  const totalPhonePe = incomeRecords.reduce((sum, r) => sum + r.phonePe, 0);
  const totalCash = incomeRecords.reduce((sum, r) => sum + r.cash, 0);
  const grandTotal = totalPhonePe + totalCash;

  return (
    <div className="page">
      <h2>Daily Income</h2>

      {/* Input Card */}
      <div className="income-entry-card">
        <h3 className="entry-title">Enter Today's Income</h3>

        <div className="income-boxes">
          <div className="income-box phonepe-box">
            <label>📱 PhonePe</label>
            <input
              type="number"
              placeholder="₹ 0"
              value={phonePe}
              onChange={(e) => setPhonePe(e.target.value)}
            />
          </div>
          <div className="income-box cash-box">
            <label>💵 Cash</label>
            <input
              type="number"
              placeholder="₹ 0"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
          </div>
        </div>

        <button className="save-income-btn" onClick={handleSave}>
          Save
        </button>
      </div>

      {/* Records List */}
      {incomeRecords.length === 0 ? (
        <p className="empty-msg">No records yet. Enter income above and click Save.</p>
      ) : (
        <div className="card">
          <div className="details-list">
            {incomeRecords.map((r) => (
              <div key={r.id} className="detail-box">
                <div className="detail-amounts">
                  {r.phonePe > 0 && (
                    <span className="detail-amount phonepe-tag">📱 ₹{r.phonePe}</span>
                  )}
                  {r.cash > 0 && (
                    <span className="detail-amount cash-tag">💵 ₹{r.cash}</span>
                  )}
                </div>
                <span className="detail-date">{r.date}</span>
                <button
                  className="remove-btn"
                  onClick={() => onRemoveIncome(r.id)}
                  title="Remove record"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="total-row">
            <span>Grand Total:</span>
            <span className="total-amount">₹{grandTotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="sub-totals">
            <span className="phonepe-tag">📱 ₹{totalPhonePe.toLocaleString("en-IN")}</span>
            <span className="cash-tag">💵 ₹{totalCash.toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}
    </div>
  );
}