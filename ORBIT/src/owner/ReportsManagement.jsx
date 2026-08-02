import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./ReportsManagement.css";

import { auth } from "../firebase/auth";
import {
    deleteReport,
    dismissReport,
    listenToReports,
    resolveReport,
} from "../services/reportService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firestore";

// Simple toast
function Toast({ message, type = "info", onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return <div className={`rm-toast ${type}`}>{message}</div>;
}

// Format Firestore timestamp safely
function formatTimestamp(time) {
    if (!time) return "Unknown time";
    const date = time?.toDate ? time.toDate() : new Date(time.seconds * 1000);
    return date.toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

export default function ReportsManagement() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [actionLoading, setActionLoading] = useState({});
    const [toasts, setToasts] = useState([]);

    // Debounce search
    const debounceRef = useRef(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    // Real-time listener
    useEffect(() => {
        const unsub = listenToReports((data) => {
            setReports(data);
            setLoading(false);
        });
        return unsub;
    }, []);

    // Filter, sort, and compute stats
    const filteredReports = useMemo(() => {
        let result = reports.filter((r) => {
            const searchTerm = debouncedSearch.toLowerCase();
            // ✅ UPDATED: Now searches by Name AND UID
            const matchSearch =
                (r.reportedUserName?.toLowerCase() || "").includes(searchTerm) ||
                (r.reporterName?.toLowerCase() || "").includes(searchTerm) ||
                (r.reportedUserId?.toLowerCase() || "").includes(searchTerm) ||
                (r.reportedByUserId?.toLowerCase() || "").includes(searchTerm) ||
                (r.reason?.toLowerCase() || "").includes(searchTerm) ||
                (r.type?.toLowerCase() || "").includes(searchTerm);

            const matchFilter = filter === "all" ? true : r.status === filter;
            return matchSearch && matchFilter;
        });

        const getTime = (r) => r.createdAt?.toMillis?.() || (r.createdAt?.seconds * 1000) || 0;
        result.sort((a, b) => (sortBy === "newest" ? getTime(b) - getTime(a) : getTime(a) - getTime(b)));
        return result;
    }, [reports, debouncedSearch, filter, sortBy]);

    const stats = useMemo(() => ({
        total: reports.length,
        pending: reports.filter((r) => r.status === "pending").length,
        resolved: reports.filter((r) => r.status === "resolved").length,
        dismissed: reports.filter((r) => r.status === "dismissed").length,
    }), [reports]);

    // Toast helpers
    const addToast = (message, type = "info") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
    };
    const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

    const withLoading = async (action, actionKey, successMsg, errorMsg) => {
        setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
        try {
            await action();
            addToast(successMsg, "success");
        } catch (err) {
            console.error(err);
            addToast(errorMsg || "Operation failed.", "error");
        } finally {
            setActionLoading((prev) => ({ ...prev, [actionKey]: false }));
        }
    };

    // Handlers
    const banUser = async (uid, name) => {
        if (!uid || !window.confirm(`Ban user ${name || uid}?`)) return; // ✅ Show name in confirm box
        await withLoading(
            () => updateDoc(doc(db, "users", uid), { banned: true }),
            `ban-${uid}`, "User banned.", "Failed to ban user."
        );
    };

    const unbanUser = async (uid, name) => {
        if (!uid || !window.confirm(`Unban user ${name || uid}?`)) return; // ✅ Show name in confirm box
        await withLoading(
            () => updateDoc(doc(db, "users", uid), { banned: false }),
            `unban-${uid}`, "User unbanned.", "Failed to unban user."
        );
    };

    const handleResolve = (reportId) => {
        if (!auth.currentUser || !window.confirm("Mark this report as resolved?")) return;
        withLoading(
            () => resolveReport(reportId, auth.currentUser.uid),
            `resolve-${reportId}`, "Report resolved.", "Failed to resolve."
        );
    };

    const handleDismiss = (reportId) => {
        if (!auth.currentUser || !window.confirm("Dismiss this report?")) return;
        withLoading(
            () => dismissReport(reportId, auth.currentUser.uid),
            `dismiss-${reportId}`, "Report dismissed.", "Failed to dismiss."
        );
    };

    const handleDelete = (reportId) => {
        if (!window.confirm("Permanently delete this report?")) return;
        withLoading(
            () => deleteReport(reportId),
            `delete-${reportId}`, "Report deleted.", "Failed to delete."
        );
    };

    if (loading) {
        return (
            <div className="rm-loading">
                <div className="rm-spinner" />
                <span>Loading reports…</span>
            </div>
        );
    }

    return (
        <div className="reports-page">
            <div className="rm-toast-container">
                {toasts.map((t) => (
                    <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
                ))}
            </div>

            <div className="rm-header">
                <div className="rm-header-left">
                    <h1>📋 Reports</h1>
                    <span className="rm-badge">{stats.total} total</span>
                </div>
                <div className="rm-controls">
                    <input
                        type="text"
                        placeholder="Search by name, UID, or reason..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="rm-search"
                    />
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rm-select">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                    </select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rm-select">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="rm-stats-grid">
                <div className="rm-stat-card pending">
                    <span className="rm-stat-icon">⏳</span>
                    <div>
                        <h3>{stats.pending}</h3>
                        <p>Pending</p>
                    </div>
                </div>
                <div className="rm-stat-card resolved">
                    <span className="rm-stat-icon">✅</span>
                    <div>
                        <h3>{stats.resolved}</h3>
                        <p>Resolved</p>
                    </div>
                </div>
                <div className="rm-stat-card dismissed">
                    <span className="rm-stat-icon">🚫</span>
                    <div>
                        <h3>{stats.dismissed}</h3>
                        <p>Dismissed</p>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            {filteredReports.length === 0 ? (
                <div className="rm-empty">
                    <div className="rm-empty-icon">📭</div>
                    <h3>{reports.length === 0 ? "No reports yet" : "No matches found"}</h3>
                    <p>{reports.length === 0 ? "Reports from users will appear here." : "Try adjusting your search or filters."}</p>
                </div>
            ) : (
                <div className="rm-list">
                    {filteredReports.map((report) => {
                        const isLoading = actionLoading[`resolve-${report.id}`] ||
                            actionLoading[`dismiss-${report.id}`] ||
                            actionLoading[`delete-${report.id}`] ||
                            actionLoading[`ban-${report.reportedUserId}`] ||
                            actionLoading[`unban-${report.reportedUserId}`];

                        return (
                            <div className="rm-card" key={report.id}>
                                <div className="rm-card-top">
                                    <div className="rm-card-title">
                                        {report.type && <span className="rm-type-badge">{report.type}</span>}
                                        <h3>{report.reason || "No reason provided"}</h3>
                                    </div>
                                    <span className={`rm-status-pill ${report.status || "pending"}`}>
                                        {report.status || "pending"}
                                    </span>
                                </div>

                                {/* ✅ UPDATED META SECTION: Shows Name + UID */}
                                <div className="rm-meta">
                                    <div className="rm-meta-item">
                                        <span className="rm-label">Reported User:</span>
                                        <div className="rm-value-wrapper">
                                            <span className="rm-value">
                                                {report.reportedUserName || "Unknown User"}
                                            </span>
                                            <span className="rm-sub-value mono">
                                                {report.reportedUserId || ""}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rm-meta-item">
                                        <span className="rm-label">Reporter:</span>
                                        <div className="rm-value-wrapper">
                                            <span className="rm-value">
                                                {report.reporterName || "Unknown User"}
                                            </span>
                                            <span className="rm-sub-value mono">
                                                {report.reportedByUserId || ""}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rm-meta-item">
                                        <span className="rm-label">Submitted:</span>
                                        <span className="rm-value">{formatTimestamp(report.createdAt)}</span>
                                    </div>
                                    {report.resolvedAt && (
                                        <div className="rm-meta-item">
                                            <span className="rm-label">Resolved:</span>
                                            <span className="rm-value">{formatTimestamp(report.resolvedAt)}</span>
                                        </div>
                                    )}
                                </div>

                                {report.description && (
                                    <div className="rm-description">
                                        "{report.description}"
                                    </div>
                                )}

                                <div className="rm-actions">
                                    <div className="rm-actions-left">
                                        {/* ✅ Pass name to ban/unban confirm boxes */}
                                        <button className="rm-btn ban" onClick={() => banUser(report.reportedUserId, report.reportedUserName)} disabled={isLoading}>
                                            {isLoading === `ban-${report.reportedUserId}` ? "..." : "⛔ Ban User"}
                                        </button>
                                        <button className="rm-btn unban" onClick={() => unbanUser(report.reportedUserId, report.reportedUserName)} disabled={isLoading}>
                                            {isLoading === `unban-${report.reportedUserId}` ? "..." : "✅ Unban"}
                                        </button>
                                    </div>

                                    <div className="rm-actions-right">
                                        {report.status !== "resolved" && (
                                            <button className="rm-btn resolve" onClick={() => handleResolve(report.id)} disabled={isLoading}>
                                                ✔ Resolve
                                            </button>
                                        )}
                                        {report.status !== "dismissed" && (
                                            <button className="rm-btn dismiss" onClick={() => handleDismiss(report.id)} disabled={isLoading}>
                                                ✖ Dismiss
                                            </button>
                                        )}
                                        <button className="rm-btn delete" onClick={() => handleDelete(report.id)} disabled={isLoading} title="Delete Report">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}