import { useState } from "react";
import "./AddEntry.css";

export default function AddEntry({ onAdd }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !category) {
      alert("Please fill in all fields");
      return;
    }

    const newEntry = {
      id: Date.now(),
      name: name.trim(),
      category,
      details: [],
    };

    onAdd(newEntry);

    setName("");
    setCategory("");
  };

  return (
    <div className="add-entry-page">
      <div className="popup-box">
        <h2>Add Entry</h2>

        <input
          type="text"
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <p className="label">Select Category</p>
        <div className="category">
          <button
            className={category === "salary" ? "active" : ""}
            onClick={() => setCategory("salary")}
          >
            Worker Salary
          </button>

          
        </div>

        <div className="actions">
          <button onClick={handleSubmit}>Save</button>
        </div>
      </div>
    </div>
  );
}