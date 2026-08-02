import { useState } from "react";
import "./ReportModal.css";
import { createReport } from "../services/reportService";

const reasons = [
    "Spam",
    "Harassment",
    "Hate Speech",
    "Violence",
    "Scam",
    "Fake Account",
    "NSFW",
    "Copyright",
    "Other",
];

export default function ReportModal({
    open,
    onClose,
    reporter,
    reportedUser,
}) {
    const [reason, setReason] = useState("Spam");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const handleSubmit = async () => {
        try {
            setLoading(true);

            await createReport({
                reporterId: reporter.uid,
                reporterName: reporter.displayName || reporter.name,
                reportedUserId: reportedUser.uid,
                reportedUserName:
                    reportedUser.displayName ||
                    reportedUser.name,
                reason,
                description,
                contentType: "user",
            });

            alert("Report submitted successfully.");

            setReason("Spam");
            setDescription("");
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to submit report.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="report-overlay">
            <div className="report-modal">

                <h2>Report User</h2>

                <p className="report-user">
                    Reporting <b>{reportedUser.displayName || reportedUser.name}</b>
                </p>

                <label>Reason</label>

                <select
                    value={reason}
                    onChange={(e) =>
                        setReason(e.target.value)
                    }
                >
                    {reasons.map((item) => (
                        <option
                            key={item}
                            value={item}
                        >
                            {item}
                        </option>
                    ))}
                </select>

                <label>Description</label>

                <textarea
                    rows={5}
                    placeholder="Tell us what happened..."
                    value={description}
                    onChange={(e) =>
                        setDescription(e.target.value)
                    }
                />

                <div className="report-buttons">

                    <button
                        className="cancel-btn"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        className="submit-btn"
                        disabled={loading}
                        onClick={handleSubmit}
                    >
                        {loading
                            ? "Submitting..."
                            : "Submit Report"}
                    </button>

                </div>

            </div>
        </div>
    );
}