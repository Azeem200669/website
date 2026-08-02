import { useEffect, useState, useCallback } from "react";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import "./Dashboard.css"; // ← Updated to match your CSS file name

// ============== Custom Hooks ==============

/**
 * Subscribes to a Firestore collection to get its document count.
 * Note: For extremely large collections, consider using a Cloud Function 
 * or Aggregation query to avoid reading every document.
 */
function useCollectionCount(collectionName) {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, collectionName),
            (snapshot) => {
                setCount(snapshot.size);
                setLoading(false);
            },
            (err) => {
                console.error(`Error fetching ${collectionName}:`, err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [collectionName]);

    return { count, loading, error };
}

/**
 * Subscribes to the most recent documents from a collection.
 */
function useRecentDocuments(collectionName, orderByField = "createdAt", limitCount = 5) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const q = query(
            collection(db, collectionName),
            orderBy(orderByField, "desc"),
            limit(limitCount)
        );

        const unsub = onSnapshot(
            q,
            (snapshot) => {
                setDocuments(
                    snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                );
                setLoading(false);
            },
            (err) => {
                console.error(`Error fetching recent ${collectionName}:`, err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [collectionName, orderByField, limitCount]);

    return { documents, loading, error };
}

// ============== Utility Functions ==============

function formatRelativeTime(date) {
    if (!date) return "Unknown";

    const now = new Date();
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    const diffMs = now - dateObj;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffSeconds < 60) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return dateObj.toLocaleDateString();
}

// ============== Sub-Components ==============

function StatCard({ icon, value, label, color, loading, error }) {
    return (
        <div className={`stat-card ${color}`}>
            <div className="stat-card-icon">{icon}</div>
            <div className="stat-card-content">
                {error ? (
                    <span className="stat-error">—</span>
                ) : loading ? (
                    <div className="stat-skeleton" />
                ) : (
                    <h2 className="stat-value">{value}</h2>
                )}
                <p className="stat-label">{label}</p>
            </div>
        </div>
    );
}

function UserListItem({ user }) {
    // Safely check both 'name' (new standard) and 'displayName' (old standard)
    const displayName = user.name || user.displayName || "Unknown User";
    const avatarSrc = user.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

    return (
        <div className="list-item user-item">
            <img
                src={avatarSrc}
                alt={displayName}
                className="user-avatar"
                loading="lazy"
            />
            <div className="list-item-content">
                <h4>{displayName}</h4>
                <p className="list-item-subtitle">{user.email || "No email"}</p>
            </div>
            <span className="list-item-time">
                {formatRelativeTime(user.createdAt)}
            </span>
        </div>
    );
}

function EventListItem({ event }) {
    const eventDate = event.startDate || event.createdAt;
    const isUpcoming = eventDate && new Date(eventDate?.toDate?.() || eventDate) > new Date();

    return (
        <div className="list-item event-item">
            <div className={`event-status-dot ${isUpcoming ? "upcoming" : "past"}`} />
            <div className="list-item-content">
                <h4>{event.title || "Untitled Event"}</h4>
                <p className="list-item-subtitle">
                    {event.description?.slice(0, 80) || "No description"}
                    {event.description?.length > 80 ? "..." : ""}
                </p>
            </div>
            <span className="list-item-time">
                {formatRelativeTime(event.createdAt)}
            </span>
        </div>
    );
}

function LoadingSkeleton({ count = 5, type = "user" }) {
    return Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`list-item ${type}-item skeleton`}>
            {type === "user" ? (
                <div className="skeleton-avatar" />
            ) : (
                <div className="skeleton-dot" />
            )}
            <div className="skeleton-content">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-subtitle" />
            </div>
            <div className="skeleton-line skeleton-time" />
        </div>
    ));
}

function EmptyState({ icon, message }) {
    return (
        <div className="empty-state">
            <span className="empty-icon">{icon}</span>
            <p>{message}</p>
        </div>
    );
}

function ErrorState({ message, onRetry }) {
    return (
        <div className="error-state">
            <span className="error-icon">⚠️</span>
            <p>{message}</p>
            {onRetry && (
                <button onClick={onRetry} className="retry-btn">
                    Retry
                </button>
            )}
        </div>
    );
}

// ============== Main Component ==============

export default function Dashboard() {
    // Collection counts
    const users = useCollectionCount("users");
    const communities = useCollectionCount("communities");
    const events = useCollectionCount("events");
    const reports = useCollectionCount("reports");
    const rewards = useCollectionCount("rewards");

    // Recent documents
    const recentUsers = useRecentDocuments("users", "createdAt", 5);
    const recentEvents = useRecentDocuments("events", "createdAt", 5);

    // Calculate overall loading state
    const isLoading =
        users.loading ||
        communities.loading ||
        events.loading ||
        reports.loading ||
        rewards.loading ||
        recentUsers.loading ||
        recentEvents.loading;

    // Check for any errors
    const hasErrors =
        users.error ||
        communities.error ||
        events.error ||
        reports.error ||
        rewards.error ||
        recentUsers.error ||
        recentEvents.error;

    // Stats configuration
    const statsConfig = [
        { icon: "👥", value: users.count, label: "Total Users", color: "blue", loading: users.loading, error: users.error },
        { icon: "🏠", value: communities.count, label: "Communities", color: "green", loading: communities.loading, error: communities.error },
        { icon: "📅", value: events.count, label: "Events", color: "purple", loading: events.loading, error: events.error },
        { icon: "🚩", value: reports.count, label: "Reports", color: "red", loading: reports.loading, error: reports.error },
        { icon: "🎁", value: rewards.count, label: "Rewards", color: "amber", loading: rewards.loading, error: rewards.error },
    ];

    // Error recovery trigger (Forces hooks to re-evaluate by toggling a dummy state)
    const [retryTick, setRetryTick] = useState(0);
    const handleRetry = useCallback(() => {
        setRetryTick((prev) => prev + 1);
    }, []);

    return (
        <div className="owner-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>Orbit Owner Dashboard</h1>
                    <p className="dashboard-subtitle">
                        Overview of your platform activity
                    </p>
                </div>

                {/* Only show refresh if there's an error, since data is real-time */}
                {hasErrors && (
                    <button
                        className="refresh-btn"
                        onClick={handleRetry}
                        disabled={isLoading}
                        title="Retry loading data"
                    >
                        <span className={`refresh-icon ${isLoading ? "spinning" : ""}`}>
                            🔄
                        </span>
                    </button>
                )}
            </div>

            {/* Error Banner */}
            {hasErrors && (
                <div className="error-banner">
                    <span>⚠️</span>
                    <p>Some data failed to load. Check your permissions or connection.</p>
                    <button onClick={handleRetry} className="retry-btn-small">
                        Retry
                    </button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
                {statsConfig.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                ))}
            </div>

            {/* Dashboard Sections */}
            <div className="dashboard-sections">
                {/* Recent Users */}
                <div className="dashboard-box">
                    <div className="box-header">
                        <h3>Recent Users</h3>
                        <span className="box-count">{users.loading ? "..." : users.count} total</span>
                    </div>

                    <div className="box-content">
                        {recentUsers.error ? (
                            <ErrorState message="Failed to load users" onRetry={handleRetry} />
                        ) : recentUsers.loading ? (
                            <LoadingSkeleton count={5} type="user" />
                        ) : recentUsers.documents.length === 0 ? (
                            <EmptyState icon="👤" message="No users yet" />
                        ) : (
                            <div className="list-items">
                                {recentUsers.documents.map((user) => (
                                    <UserListItem key={user.id} user={user} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Events */}
                <div className="dashboard-box">
                    <div className="box-header">
                        <h3>Recent Events</h3>
                        <span className="box-count">{events.loading ? "..." : events.count} total</span>
                    </div>

                    <div className="box-content">
                        {recentEvents.error ? (
                            <ErrorState message="Failed to load events" onRetry={handleRetry} />
                        ) : recentEvents.loading ? (
                            <LoadingSkeleton count={5} type="event" />
                        ) : recentEvents.documents.length === 0 ? (
                            <EmptyState icon="📅" message="No events yet" />
                        ) : (
                            <div className="list-items">
                                {recentEvents.documents.map((event) => (
                                    <EventListItem key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="dashboard-footer">
                <p>Real-time updates enabled • Data refreshes automatically</p>
            </div>
        </div>
    );
}