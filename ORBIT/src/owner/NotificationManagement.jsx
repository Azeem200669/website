import { useEffect, useState, useCallback } from "react";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    writeBatch,
} from "firebase/firestore";

import { db } from "../firebase/firestore";
import "./NotificationManagement.css";

const TYPE_COLORS = {
    Announcement: { bg: "rgba(124, 58, 237, 0.12)", border: "rgba(124, 58, 237, 0.3)", text: "#a78bfa" },
    System: { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", text: "#f59e0b" },
    Update: { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa" },
    Event: { bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.3)", text: "#22c55e" },
    Maintenance: { bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)", text: "#ef4444" },
};

const EXPIRY_PRESETS = [
    { label: "1 Hour", value: 60 },
    { label: "6 Hours", value: 360 },
    { label: "12 Hours", value: 720 },
    { label: "1 Day", value: 1440 },
    { label: "3 Days", value: 4320 },
    { label: "7 Days", value: 10080 },
    { label: "30 Days", value: 43200 },
    { label: "Never", value: null },
];

function getMinDatetimeString() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
}

function toLocalDatetimeString(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

/**
 * Firestore batches are limited to 500 operations.
 * This helper chunks operations and commits them sequentially.
 */
async function commitBatched(ops) {
    if (ops.length === 0) return;
    const BATCH_LIMIT = 500;
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        ops.slice(i, i + BATCH_LIMIT).forEach((fn) => fn(batch));
        await batch.commit();
    }
}

export default function NotificationManagement() {
    const [notifications, setNotifications] = useState([]);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("Announcement");
    const [expiresAt, setExpiresAt] = useState("");
    const [expiryPreset, setExpiryPreset] = useState("Never");
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState(null);
    const [cleaning, setCleaning] = useState(false);
    const [cleanStats, setCleanStats] = useState(null);
    const [showCleanStats, setShowCleanStats] = useState(false);

    // ─── Cleanup expired notifications ───────────────────────────
    // Uses stored userNotifIds to delete by direct path — NO reads on user subcollections
    const cleanExpiredNotifications = useCallback(async (silent = false) => {
        if (!silent) setCleaning(true);
        let totalDeleted = 0;
        let logsRemoved = 0;

        try {
            const now = new Date();
            const topSnapshot = await getDocs(collection(db, "notifications"));

            const deleteOps = [];

            for (const docSnap of topSnapshot.docs) {
                const data = docSnap.data();
                if (!data.expiresAt) continue;

                const expiryDate = data.expiresAt?.toDate
                    ? data.expiresAt.toDate()
                    : new Date(data.expiresAt);
                if (expiryDate > now) continue;

                // Delete user subcollection copies by direct path (no read needed)
                if (Array.isArray(data.userNotifIds)) {
                    for (const item of data.userNotifIds) {
                        deleteOps.push((batch) =>
                            batch.delete(doc(db, "users", item.uid, "notifications", item.nid))
                        );
                        totalDeleted++;
                    }
                }

                // Delete the top-level log doc
                deleteOps.push((batch) => batch.delete(docSnap.ref));
                logsRemoved++;
                totalDeleted++;
            }

            await commitBatched(deleteOps);

            if (!silent && totalDeleted > 0) {
                setCleanStats({ deleted: totalDeleted, logs: logsRemoved });
                setShowCleanStats(true);
                setTimeout(() => setShowCleanStats(false), 4000);
            }
        } catch (err) {
            if (!silent) console.error("Cleanup error:", err);
        } finally {
            if (!silent) setCleaning(false);
        }
    }, []);

    // Run cleanup on mount and every 60 seconds
    useEffect(() => {
        cleanExpiredNotifications(true);
        const interval = setInterval(() => cleanExpiredNotifications(true), 60000);
        return () => clearInterval(interval);
    }, [cleanExpiredNotifications]);

    // ─── Listen to notifications ─────────────────────────────────
    useEffect(() => {
        const q = query(
            collection(db, "notifications"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotifications(
                snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }))
            );
        });

        return unsubscribe;
    }, []);

    // ─── Expiry preset handler ───────────────────────────────────
    const handleExpiryPreset = (preset) => {
        setExpiryPreset(preset.label);
        if (preset.value === null) {
            setExpiresAt("");
            return;
        }
        const future = new Date(Date.now() + preset.value * 60 * 1000);
        setExpiresAt(toLocalDatetimeString(future));
    };

    // ─── Send notification ───────────────────────────────────────
    const sendNotification = async () => {
        if (!title.trim() || !message.trim()) return;
        setSending(true);

        try {
            const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

            // 1. Create top-level log entry (placeholder userNotifIds)
            const topRef = await addDoc(collection(db, "notifications"), {
                title,
                message,
                type,
                audience: "all",
                createdAt: serverTimestamp(),
                expiresAt: expiresAtDate,
                userNotifIds: [],
            });

            // 2. Create a notification doc in every user's subcollection
            //    Using doc() to pre-generate IDs so we can batch them
            const usersSnapshot = await getDocs(collection(db, "users"));
            const userNotifIds = [];
            const writeOps = [];

            for (const userDoc of usersSnapshot.docs) {
                const notifRef = doc(collection(db, "users", userDoc.id, "notifications"));
                const notifData = {
                    title,
                    subtitle: message,
                    type,
                    read: false,
                    timestamp: serverTimestamp(),
                    expiresAt: expiresAtDate,
                    logId: topRef.id,
                };
                writeOps.push((batch) => batch.set(notifRef, notifData));
                userNotifIds.push({ uid: userDoc.id, nid: notifRef.id });
            }

            // 3. Batch-write all user notification docs (500 per batch)
            await commitBatched(writeOps);

            // 4. Store the ID mapping back in the top-level doc
            //    so cleanup/delete can target exact paths without reading
            await updateDoc(topRef, { userNotifIds });

            setTitle("");
            setMessage("");
            setType("Announcement");
            setExpiresAt("");
            setExpiryPreset("Never");

            setToast({
                type: "success",
                text: expiresAt
                    ? `Notification sent — expires ${new Date(expiresAt).toLocaleString()}`
                    : "Notification sent to all users (no expiry)",
            });
            setTimeout(() => setToast(null), 4000);
        } catch (err) {
            console.error("Notification Error:", err);
            setToast({ type: "error", text: "Failed to send notification" });
            setTimeout(() => setToast(null), 4000);
        } finally {
            setSending(false);
        }
    };

    // ─── Delete notification ─────────────────────────────────────
    // Uses stored userNotifIds to delete by direct path — NO reads on user subcollections
    const deleteNotification = async (notif) => {
        if (!window.confirm("Delete this notification? This will also remove it from all users."))
            return;

        try {
            const deleteOps = [];

            // Delete user subcollection copies by direct path
            if (Array.isArray(notif.userNotifIds)) {
                for (const item of notif.userNotifIds) {
                    deleteOps.push((batch) =>
                        batch.delete(doc(db, "users", item.uid, "notifications", item.nid))
                    );
                }
            }

            // Delete top-level log doc
            deleteOps.push((batch) => batch.delete(doc(db, "notifications", notif.id)));

            await commitBatched(deleteOps);

            setToast({ type: "success", text: "Notification deleted" });
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            console.error(err);
            setToast({ type: "error", text: "Failed to delete" });
            setTimeout(() => setToast(null), 3000);
        }
    };

    // ─── Helpers ─────────────────────────────────────────────────
    const formatTime = (ts) => {
        if (!ts) return "";
        try {
            return new Date(ts).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            });
        } catch {
            return "";
        }
    };

    const getExpiryStatus = (notif) => {
        if (!notif.expiresAt) return null;
        const now = new Date();
        const expiry = notif.expiresAt?.toDate ? notif.expiresAt.toDate() : new Date(notif.expiresAt);
        const diff = expiry - now;

        if (diff <= 0) return "expired";
        if (diff <= 3600000) return "expiring-soon";
        return "active";
    };

    const getTimeUntilExpiry = (notif) => {
        if (!notif.expiresAt) return null;
        const now = new Date();
        const expiry = notif.expiresAt?.toDate ? notif.expiresAt.toDate() : new Date(notif.expiresAt);
        const diff = expiry - now;

        if (diff <= 0) return "Expired";

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h remaining`;
        if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
        return `${minutes}m remaining`;
    };

    return (
        <div className="nm-container">
            {/* Header */}
            <div className="nm-header">
                <div>
                    <h1>Notification Management</h1>
                    <p className="nm-subtitle">
                        Send announcements with expiration and manage notification history
                    </p>
                </div>
                <button
                    className="nm-clean-btn"
                    onClick={() => cleanExpiredNotifications(false)}
                    disabled={cleaning}
                >
                    {cleaning ? (
                        <div className="nm-btn-spinner" />
                    ) : (
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                    )}
                    {cleaning ? "Cleaning..." : "Clean Expired"}
                </button>
            </div>

            {/* Clean Stats Banner */}
            {showCleanStats && cleanStats && (
                <div className="nm-clean-stats">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Removed <strong>{cleanStats.deleted}</strong> notification
                    {cleanStats.deleted !== 1 ? "s" : ""} ({cleanStats.logs} log
                    {cleanStats.logs !== 1 ? "s" : ""} cleared)
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`nm-toast nm-toast--${toast.type}`}>
                    {toast.type === "success" ? (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    )}
                    {toast.text}
                </div>
            )}

            {/* Compose */}
            <div className="nm-compose">
                <h2>Compose Notification</h2>

                <div className="nm-form-grid">
                    <div className="nm-field">
                        <label>Title</label>
                        <input
                            type="text"
                            placeholder="Notification title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="nm-field">
                        <label>Type</label>
                        <div className="nm-type-select">
                            {["Announcement", "System", "Update", "Event", "Maintenance"].map((t) => {
                                const colors = TYPE_COLORS[t];
                                return (
                                    <button
                                        key={t}
                                        className={`nm-type-btn ${type === t ? "active" : ""}`}
                                        onClick={() => setType(t)}
                                        style={
                                            type === t
                                                ? {
                                                    background: colors.bg,
                                                    borderColor: colors.border,
                                                    color: colors.text,
                                                }
                                                : {}
                                        }
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="nm-field">
                    <label>Message</label>
                    <textarea
                        placeholder="Write your notification message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Expiration Section */}
                <div className="nm-expiry-section">
                    <label>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Expiration
                    </label>

                    <div className="nm-expiry-presets">
                        {EXPIRY_PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                className={`nm-preset-btn ${expiryPreset === preset.label ? "active" : ""
                                    }`}
                                onClick={() => handleExpiryPreset(preset)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {expiresAt && (
                        <div className="nm-expiry-datetime">
                            <input
                                type="datetime-local"
                                value={expiresAt}
                                min={getMinDatetimeString()}
                                onChange={(e) => {
                                    setExpiresAt(e.target.value);
                                    setExpiryPreset("Custom");
                                }}
                            />
                            <button
                                className="nm-expiry-clear"
                                onClick={() => {
                                    setExpiresAt("");
                                    setExpiryPreset("Never");
                                }}
                            >
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {expiresAt && (
                        <p className="nm-expiry-hint">
                            Notification will be automatically removed at{" "}
                            <strong>{new Date(expiresAt).toLocaleString()}</strong>
                        </p>
                    )}
                </div>

                <button
                    className="nm-send-btn"
                    onClick={sendNotification}
                    disabled={sending || !title.trim() || !message.trim()}
                >
                    {sending ? (
                        <div className="nm-btn-spinner" />
                    ) : (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    )}
                    {sending ? "Sending..." : "Send to All Users"}
                </button>
            </div>

            {/* History */}
            <div className="nm-history">
                <div className="nm-history-header">
                    <h2>Notification History</h2>
                    <span className="nm-count">{notifications.length} total</span>
                </div>

                <div className="nm-list">
                    {notifications.length === 0 ? (
                        <div className="nm-empty">
                            <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            <p>No notifications sent yet</p>
                        </div>
                    ) : (
                        notifications.map((item, i) => {
                            const colors = TYPE_COLORS[item.type] || TYPE_COLORS.Announcement;
                            const expiryStatus = getExpiryStatus(item);
                            const timeUntil = getTimeUntilExpiry(item);

                            return (
                                <div
                                    key={item.id}
                                    className={`nm-card ${expiryStatus === "expired" ? "nm-card--expired" : ""
                                        } ${expiryStatus === "expiring-soon"
                                            ? "nm-card--expiring"
                                            : ""
                                        }`}
                                    style={{ animationDelay: `${i * 0.04}s` }}
                                >
                                    <div className="nm-card-top">
                                        <h3>{item.title}</h3>
                                        <div className="nm-card-badges">
                                            {expiryStatus === "expired" && (
                                                <span className="nm-expiry-badge nm-expiry-badge--expired">
                                                    <svg
                                                        width="10"
                                                        height="10"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="15" y1="9" x2="9" y2="15" />
                                                        <line x1="9" y1="9" x2="15" y2="15" />
                                                    </svg>
                                                    Expired
                                                </span>
                                            )}
                                            {expiryStatus === "expiring-soon" && (
                                                <span className="nm-expiry-badge nm-expiry-badge--soon">
                                                    <svg
                                                        width="10"
                                                        height="10"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                                        <line x1="12" y1="9" x2="12" y2="13" />
                                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                                    </svg>
                                                    {timeUntil}
                                                </span>
                                            )}
                                            {expiryStatus === "active" && (
                                                <span className="nm-expiry-badge nm-expiry-badge--active">
                                                    <svg
                                                        width="10"
                                                        height="10"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    {timeUntil}
                                                </span>
                                            )}
                                            <span
                                                className="nm-type-badge"
                                                style={{
                                                    background: colors.bg,
                                                    border: `1px solid ${colors.border}`,
                                                    color: colors.text,
                                                }}
                                            >
                                                {item.type}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="nm-card-msg">{item.message}</p>
                                    <div className="nm-card-footer">
                                        <div className="nm-card-meta">
                                            <span className="nm-card-time">
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <circle cx="12" cy="12" r="10" />
                                                    <polyline points="12 6 12 12 16 14" />
                                                </svg>
                                                {formatTime(item.createdAt)}
                                            </span>
                                            {item.expiresAt && (
                                                <span className="nm-card-expires">
                                                    <svg
                                                        width="12"
                                                        height="12"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M1 4v6h6" />
                                                        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                                                    </svg>
                                                    Expires: {formatTime(item.expiresAt)}
                                                </span>
                                            )}
                                            {!item.expiresAt && (
                                                <span className="nm-card-no-expiry">
                                                    <svg
                                                        width="12"
                                                        height="12"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                    </svg>
                                                    No expiry
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            className="nm-delete-btn"
                                            onClick={() => deleteNotification(item)}
                                        >
                                            <svg
                                                width="13"
                                                height="13"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}