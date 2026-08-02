import { useEffect, useMemo, useState } from "react";
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firestore";
import "./EventManagement.css";

export default function EventManagement() {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, "events"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                setEvents(
                    snapshot.docs.map((d) => ({
                        id: d.id,
                        ...d.data(),
                    }))
                );
                setLoading(false);
            },
            (error) => {
                console.error("EventManagement fetch events error:", error);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, []);

    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            const q = search.toLowerCase();
            const matchSearch =
                event.title?.toLowerCase().includes(q) ||
                event.createdByName?.toLowerCase().includes(q) ||
                event.location?.toLowerCase().includes(q);

            const matchFilter =
                filter === "all" ? true : event.status === filter;

            return matchSearch && matchFilter;
        });
    }, [events, search, filter]);

    const stats = useMemo(() => {
        const pending = events.filter((e) => e.status === "pending").length;
        const approved = events.filter((e) => e.status === "approved").length;
        const rejected = events.filter((e) => e.status === "rejected").length;
        return { total: events.length, pending, approved, rejected };
    }, [events]);

    const handleAction = async (id, status) => {
        try {
            await updateDoc(doc(db, "events", id), { status });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete "${title}"?`)) return;
        try {
            await deleteDoc(doc(db, "events", id));
        } catch (err) {
            console.error(err);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        try {
            return new Date(dateStr).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="em-container">

            {/* Header */}
            <div className="em-header">
                <div>
                    <h1>Event Management</h1>
                    <p className="em-subtitle">
                        Review, approve, and manage submitted events
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="em-stats">
                <div className="em-stat">
                    <span className="em-stat-num">{stats.total}</span>
                    <span className="em-stat-label">Total</span>
                </div>
                <div className="em-stat em-stat--pending">
                    <span className="em-stat-num">{stats.pending}</span>
                    <span className="em-stat-label">Pending</span>
                </div>
                <div className="em-stat em-stat--approved">
                    <span className="em-stat-num">{stats.approved}</span>
                    <span className="em-stat-label">Approved</span>
                </div>
                <div className="em-stat em-stat--rejected">
                    <span className="em-stat-num">{stats.rejected}</span>
                    <span className="em-stat-label">Rejected</span>
                </div>
            </div>

            {/* Tools */}
            <div className="em-tools">
                <div className="em-search-wrap">
                    <svg className="em-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="em-search"
                        placeholder="Search by title, organizer, or location..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className="em-search-clear"
                            onClick={() => setSearch("")}
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="em-filters">
                    {["all", "pending", "approved", "rejected"].map((f) => (
                        <button
                            key={f}
                            className={`em-filter-btn ${filter === f ? "active" : ""}`}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            {f !== "all" && (
                                <span className="em-filter-count">
                                    {stats[f]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Event List */}
            <div className="em-list">
                {loading ? (
                    <div className="em-loading">
                        <div className="em-spinner" />
                        <span>Loading events...</span>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="em-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <p>No events found</p>
                        <span>Try adjusting your search or filter</span>
                    </div>
                ) : (
                    filteredEvents.map((event, i) => (
                        <div
                            key={event.id}
                            className="em-card"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            {/* Card top */}
                            <div className="em-card-top">
                                <div className="em-card-title-row">
                                    <h3>{event.title || "Untitled Event"}</h3>
                                    <span className={`em-status em-status--${event.status || "pending"}`}>
                                        {(event.status || "pending").charAt(0).toUpperCase() +
                                            (event.status || "pending").slice(1)}
                                    </span>
                                </div>

                                <div className="em-card-meta">
                                    <span className="em-meta-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        {event.createdByName || "Unknown"}
                                    </span>
                                    <span className="em-meta-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        {formatDate(event.date)}
                                    </span>
                                    <span className="em-meta-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                        {event.location || "No location"}
                                    </span>
                                    {event.eventType === "online" && (
                                        <span className="em-meta-item em-meta-online">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M23 7l-7 5 7 5V7z" />
                                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                            </svg>
                                            Online
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            {event.description && (
                                <p className="em-card-desc">
                                    {event.description}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="em-card-actions">
                                {event.status !== "approved" && (
                                    <button
                                        className="em-btn em-btn--approve"
                                        onClick={() => handleAction(event.id, "approved")}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Approve
                                    </button>
                                )}
                                {event.status !== "rejected" && (
                                    <button
                                        className="em-btn em-btn--reject"
                                        onClick={() => handleAction(event.id, "rejected")}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                        Reject
                                    </button>
                                )}
                                <button
                                    className="em-btn em-btn--delete"
                                    onClick={() => handleDelete(event.id, event.title)}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}