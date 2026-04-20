import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

// Firebase
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import Navbar     from "./components/Navbar";
import Background from "./components/Background";

import AddEntry     from "./pages/AddEntry";
import WorkerSalary from "./pages/WorkerSalary";
import DailyIncome  from "./pages/DailyIncome";
import Dashboard    from "./pages/Dashboard";

function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: "60px", color: "#fff" }}>
      <h1>Welcome to L & L</h1>
      <p>Use the menu above to manage Worker Salaries and Daily Income.</p>
    </div>
  );
}

function App() {
  const [entries, setEntries]             = useState([]);
  const [incomeRecords, setIncomeRecords] = useState([]);
  const [loading, setLoading]             = useState(true);

  // ── Real-time listener: entries (worker salary) ──────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "entries"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setEntries(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Real-time listener: incomeRecords ────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "incomeRecords"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setIncomeRecords(data);
    });
    return () => unsub();
  }, []);

  // ── Add new worker entry ─────────────────────────────────────────
  const handleAdd = async (entry) => {
    try {
      await addDoc(collection(db, "entries"), {
        ...entry,
        details: [],
      });
    } catch (err) {
      console.error("Error adding entry:", err);
    }
  };

  // ── Remove a worker entry entirely ──────────────────────────────
  const handleRemoveEntry = async (id) => {
    try {
      await deleteDoc(doc(db, "entries", id));
    } catch (err) {
      console.error("Error removing entry:", err);
    }
  };

  // ── Add salary detail to a worker ───────────────────────────────
  const handleAddDetail = async (id, amount, date) => {
    try {
      const worker = entries.find((e) => e.id === id);
      if (!worker) return;

      const updatedDetails = [...(worker.details || []), { amount, date }];

      await updateDoc(doc(db, "entries", id), {
        details: updatedDetails,
      });
    } catch (err) {
      console.error("Error adding detail:", err);
    }
  };

  // ── Remove a single salary detail from a worker ──────────────────
  const handleRemoveDetail = async (workerId, detailIndex) => {
    try {
      const worker = entries.find((e) => e.id === workerId);
      if (!worker) return;

      const updatedDetails = (worker.details || []).filter(
        (_, i) => i !== detailIndex
      );

      await updateDoc(doc(db, "entries", workerId), {
        details: updatedDetails,
      });
    } catch (err) {
      console.error("Error removing detail:", err);
    }
  };

  // ── Save daily income record ─────────────────────────────────────
  const handleSaveIncome = async (record) => {
    try {
      await addDoc(collection(db, "incomeRecords"), record);
    } catch (err) {
      console.error("Error saving income:", err);
    }
  };

  // ── Remove a daily income record ─────────────────────────────────
  const handleRemoveIncome = async (id) => {
    try {
      await deleteDoc(doc(db, "incomeRecords", id));
    } catch (err) {
      console.error("Error removing income:", err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", color: "#00e5ff", fontSize: "18px",
        background: "rgba(10,10,30,0.95)"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Background />
      <Navbar />

      <div className="page-wrapper" style={{ padding: "20px" }}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/add" element={<AddEntry onAdd={handleAdd} />} />

          <Route
            path="/salary"
            element={
              <WorkerSalary
                entries={entries}
                onAddDetail={handleAddDetail}
                onRemoveDetail={handleRemoveDetail}
                onRemoveEntry={handleRemoveEntry}
              />
            }
          />

          <Route
            path="/income"
            element={
              <DailyIncome
                incomeRecords={incomeRecords}
                onSaveIncome={handleSaveIncome}
                onRemoveIncome={handleRemoveIncome}
              />
            }
          />

          <Route
            path="/dashboard"
            element={<Dashboard entries={entries} incomeRecords={incomeRecords} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;