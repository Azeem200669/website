import { useEffect, useState } from "react";
import {
    collection,
    doc,
    onSnapshot,
    query,
    orderBy,
    deleteDoc,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import "./CommunityManagement.css";

export default function CommunityManagement() {
    const [communities, setCommunities] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [actions, setActions] = useState({});
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // ─── Fetch Communities ──────────────────────
    useEffect(() => {
        // ✅ FIXED: Changed "communities" to "spaces"
        const q = query(collection(db, "spaces"), orderBy("name", "asc"));

        const unsub = onSnapshot(
            q,
            (snapshot) => {
                setCommunities(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching spaces:", err);
                setLoading(false);
            }
        );

        return () => unsub();
    }, []);

    // ─── Filter Data ────────────────────────────
    const filteredData = communities.filter((c) => {
        const searchString = `${c.name || ""} ${c.description || ""}`.toLowerCase();
        return searchString.includes(search.toLowerCase());
    });

    // ─── Handlers ───────────────────────────────
    const toggleFeatured = async (id, currentStatus) => {
        setActions((prev) => ({ ...prev, [id]: "updating" }));
        try {
            // ✅ FIXED: Changed "communities" to "spaces"
            await updateDoc(doc(db, "spaces", id), { featured: !currentStatus });
        } catch (err) {
            console.error(err);
            alert("Failed to update space.");
        } finally {
            setActions((prev) => ({ ...prev, [id]: null }));
        }
    };

    const deleteCommunity = async (id) => {
        setActions((prev) => ({ ...prev, [id]: "deleting" }));
        try {
            // ✅ FIXED: Changed "communities" to "spaces"
            await deleteDoc(doc(db, "spaces", id));
            setConfirmDeleteId(null);
        } catch (err) {
            console.error(err);
            alert("Failed to delete space.");
        } finally {
            setActions((prev) => ({ ...prev, [id]: null }));
        }
    };

    // ─── Render States ──────────────────────────
    if (loading) {
        return (
            <div className="cm-container">
                <div className="cm-loading">Loading spaces...</div>
            </div>
        );
    }

    return (
        <div className="cm-container">
            {/* Header */}
            <div className="cm-header">
                <div className="cm-header-text">
                    <h1>Community Management</h1>
                    <p>{communities.length} total spaces</p>
                </div>
                <div className="cm-search-wrapper">
                    <svg className="cm-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="cm-search"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="cm-table-container">
                {filteredData.length === 0 ? (
                    <div className="cm-empty">
                        {search ? "No spaces match your search." : "No spaces created yet."}
                    </div>
                ) : (
                    <table className="cm-table">
                        <thead>
                            <tr>
                                <th>Space</th>
                                <th>Members</th>
                                <th>Creator UID</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item) => {
                                const isLoading = actions[item.id];
                                const isConfirmingDelete = confirmDeleteId === item.id;

                                return (
                                    <tr key={item.id} className={!item.featured ? "cm-row-dimmed" : ""}>
                                        <td>
                                            <div className="cm-info">
                                                <div className="cm-icon-box">
                                                    {item.icon || "🪐"}
                                                </div>
                                                <div className="cm-text">
                                                    <span className="cm-name">{item.name || "Untitled Space"}</span>
                                                    <span className="cm-id">{item.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* ✅ FIXED: Uses memberCount from your database instead of array length */}
                                        <td className="cm-members">{item.memberCount || item.members?.length || 0}</td>
                                        <td className="cm-creator">{item.createdBy || "Unknown"}</td>
                                        <td>
                                            <span className={`cm-badge ${item.featured ? "cm-badge-featured" : "cm-badge-standard"}`}>
                                                {item.featured ? "⭐ Featured" : "Standard"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="cm-actions">
                                                <button
                                                    className={`cm-btn ${item.featured ? "cm-btn-unfeature" : "cm-btn-feature"}`}
                                                    onClick={() => toggleFeatured(item.id, item.featured)}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading === "updating" ? "..." : item.featured ? "Unfeature" : "Feature"}
                                                </button>

                                                {isConfirmingDelete ? (
                                                    <div className="cm-confirm-delete">
                                                        <span>Sure?</span>
                                                        <button className="cm-btn cm-btn-yes" onClick={() => deleteCommunity(item.id)} disabled={isLoading}>
                                                            {isLoading === "deleting" ? "..." : "Yes"}
                                                        </button>
                                                        <button className="cm-btn cm-btn-no" onClick={() => setConfirmDeleteId(null)}>
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="cm-btn cm-btn-delete"
                                                        onClick={() => setConfirmDeleteId(item.id)}
                                                        disabled={isLoading}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}