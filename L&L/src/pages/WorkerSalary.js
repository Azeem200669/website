import { useState } from "react";
import "./Pages.css";

export default function WorkerSalary({ entries, onAddDetail, onRemoveDetail, onRemoveEntry }) {
  const salaryData = entries.filter((e) => e.category === "salary");

  const [amounts, setAmounts] = useState({});
  const [selectedWorker, setSelectedWorker] = useState(null);

  const handleChange = (id, value) => {
    setAmounts({ ...amounts, [id]: value });
  };

  const handleSave = (id) => {
    if (!amounts[id]) return;

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    onAddDetail(id, amounts[id], formattedDate);
    setAmounts({ ...amounts, [id]: "" });
  };

  const handleOpenDetail = (item) => {
    setSelectedWorker(item);
  };

  const handleCloseDetail = () => {
    setSelectedWorker(null);
  };

  const getTotal = (details) =>
    details.reduce((sum, d) => sum + Number(d.amount), 0);

  // ── Detail Page ──────────────────────────────────────────────────
  if (selectedWorker) {
    const liveWorker =
      salaryData.find((w) => w.id === selectedWorker.id) || selectedWorker;

    // If worker was deleted while detail page is open, go back
    if (!salaryData.find((w) => w.id === selectedWorker.id)) {
      handleCloseDetail();
      return null;
    }

    return (
      <div className="page detail-page">
        <div className="detail-header">
          <button className="back-btn" onClick={handleCloseDetail}>
            ← Back
          </button>
          <h2 className="detail-title">{liveWorker.name}</h2>
        </div>

        <div className="detail-add-row">
          <input
            type="number"
            placeholder="Enter amount"
            value={amounts[liveWorker.id] || ""}
            onChange={(e) => handleChange(liveWorker.id, e.target.value)}
          />
          <button
            className="save-btn"
            onClick={() => handleSave(liveWorker.id)}
          >
            Save
          </button>
        </div>

        {liveWorker.details.length === 0 ? (
          <p className="empty-msg">No payments recorded yet.</p>
        ) : (
          <>
            <div className="details-list">
              {liveWorker.details.map((d, i) => (
                <div key={i} className="detail-box">
                  <span className="detail-amount">₹{d.amount}</span>
                  <span className="detail-date">{d.date}</span>
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveDetail(liveWorker.id, i)}
                    title="Remove payment"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="total-row">
              <span>Total Paid:</span>
              <span className="total-amount">
                ₹{getTotal(liveWorker.details)}
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Main List ────────────────────────────────────────────────────
  return (
    <div className="page">
      <h2>Worker Salary</h2>

      {salaryData.length === 0 && (
        <p className="empty-msg">
          No workers added yet. Go to Add Entry to add one.
        </p>
      )}

      {salaryData.map((item) => (
        <div className="card" key={item.id}>
          <div className="row">
            <h3 className="worker-name">{item.name}</h3>

            <button
              className="remove-btn remove-worker-btn"
              onClick={() => onRemoveEntry(item.id)}
              title="Remove worker"
            >
              ✕ Remove
            </button>
          </div>

          <div className="row">
            <input
              type="number"
              placeholder="Enter amount"
              value={amounts[item.id] || ""}
              onChange={(e) => handleChange(item.id, e.target.value)}
            />

            <button
              className="save-btn"
              onClick={() => handleSave(item.id)}
            >
              Save
            </button>

            <button
              className="detail-btn"
              onClick={() => handleOpenDetail(item)}
            >
              Details
            </button>
          </div>

          {item.details.length > 0 && (
            <div className="total-row">
              <span>Total Paid:</span>
              <span className="total-amount">₹{getTotal(item.details)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}