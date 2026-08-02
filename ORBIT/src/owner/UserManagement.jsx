import { useEffect, useState, useCallback } from "react";
import {
    collection,
    doc,
    onSnapshot,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import "./UserManagement.css";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Track ongoing actions per user (e.g., { uid: 'banning' })
    const [actions, setActions] = useState({});
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // ─── Fetch Users ──────────────────────────
    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("name", "asc"));

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setUsers(data);
            setLoading(false);
        }, (error) => {
            console.error("Failed to fetch users:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // ─── Handlers ─────────────────────────────
    const updateRole = async (uid, newRole) => {
        const user = users.find((u) => u.id === uid);

        // CRITICAL: Prevent changing Owner role
        if (user?.role === "owner") return;
        // Prevent setting someone else to owner from UI
        if (newRole === "owner") return;

        setActions((prev) => ({ ...prev, [uid]: "updating" }));
        try {
            await updateDoc(doc(db, "users", uid), { role: newRole });
        } catch (err) {
            console.error("Failed to update role:", err);
            alert("Failed to update role.");
        } finally {
            setActions((prev) => ({ ...prev, [uid]: null }));
        }
    };

    const toggleBan = async (uid, currentBanStatus) => {
        const user = users.find((u) => u.id === uid);

        // CRITICAL: Prevent banning owners
        if (user?.role === "owner") {
            alert("Cannot ban an owner.");
            return;
        }

        setActions((prev) => ({ ...prev, [uid]: "banning" }));
        try {
            await updateDoc(doc(db, "users", uid), {
                banned: !currentBanStatus,
                // Optionally force them offline if banned
                online: currentBanStatus ? true : false
            });
            setConfirmDeleteId(null);
        } catch (err) {
            console.error("Failed to toggle ban:", err);
            alert("Failed to update ban status.");
        } finally {
            setActions((prev) => ({ ...prev, [uid]: null }));
        }
    };

    const deleteUser = async (uid) => {
        const user = users.find((u) => u.id === uid);

        // CRITICAL: Prevent deleting owners
        if (user?.role === "owner") {
            alert("Cannot delete an owner account.");
            setConfirmDeleteId(null);
            return;
        }

        setActions((prev) => ({ ...prev, [uid]: "deleting" }));
        try {
            // ⚠️ WARNING: This only deletes the Firestore document.
            // It DOES NOT delete the user from Firebase Authentication.
            // To fully delete a user, you must use a Cloud Function or Firebase Admin SDK.
            await deleteDoc(doc(db, "users", uid));
            setConfirmDeleteId(null);
        } catch (err) {
            console.error("Failed to delete user:", err);
            alert("Failed to delete user.");
        } finally {
            setActions((prev) => ({ ...prev, [uid]: null }));
        }
    };

    // ─── Filtering ────────────────────────────
    // Safely check both 'name' and 'displayName' in case of data inconsistencies
    const filteredUsers = users.filter((user) => {
        const name = (user.name || user.displayName || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const query = search.toLowerCase();
        return name.includes(query) || email.includes(query);
    });

    // ─── Render Helpers ───────────────────────
    const isActionLoading = (uid) => !!actions[uid];

    return (
        <div className="user-management">
            <div className="um-header">
                <div className="um-header-text">
                    <h1>User Management</h1>
                    <p>{users.length} total users</p>
                </div>

                <div className="um-search-wrapper">
                    <svg className="um-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="um-search"
                    />
                </div>
            </div>

            <div className="um-table-container">
                {loading ? (
                    <div className="um-loading">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="um-empty">
                        {search ? "No users match your search." : "No users found."}
                    </div>
                ) : (
                    <table className="um-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => {
                                const isOwner = user.role === "owner";
                                const isBanned = user.banned;
                                const isLoading = isActionLoading(user.id);
                                const isConfirmingDelete = confirmDeleteId === user.id;

                                return (
                                    <tr key={user.id} className={isBanned ? "um-row-banned" : ""}>
                                        <td>
                                            <div className="um-user-info">
                                                <img
                                                    src={user.photoURL || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.displayName || "U")}&background=random`}
                                                    alt=""
                                                    className="um-avatar"
                                                />
                                                <div className="um-user-text">
                                                    <span className="um-name">
                                                        {user.name || user.displayName || "Unknown User"}
                                                        {isOwner && <span className="um-owner-badge">OWNER</span>}
                                                    </span>
                                                    <span className="um-orbit-id">{user.orbitId || "—"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="um-email">{user.email}</td>
                                        <td>
                                            <select
                                                value={user.role || "user"}
                                                onChange={(e) => updateRole(user.id, e.target.value)}
                                                disabled={isOwner || isLoading}
                                                className={`um-role-select um-role-${user.role || "user"}`}
                                            >
                                                <option value="user">User</option>
                                                <option value="moderator">Moderator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <span className={`um-status ${isBanned ? "um-status-banned" : "um-status-active"}`}>
                                                {isBanned ? "Banned" : "Active"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="um-actions">
                                                {!isOwner && (
                                                    <>
                                                        <button
                                                            className={`um-btn um-btn-ban ${isBanned ? "um-btn-unban" : ""}`}
                                                            onClick={() => toggleBan(user.id, isBanned)}
                                                            disabled={isLoading}
                                                        >
                                                            {isLoading === "banning" ? "..." : isBanned ? "Unban" : "Ban"}
                                                        </button>

                                                        {isConfirmingDelete ? (
                                                            <div className="um-confirm-delete">
                                                                <span>Sure?</span>
                                                                <button className="um-btn um-btn-yes" onClick={() => deleteUser(user.id)} disabled={isLoading}>
                                                                    {isLoading === "deleting" ? "..." : "Yes"}
                                                                </button>
                                                                <button className="um-btn um-btn-no" onClick={() => setConfirmDeleteId(null)} disabled={isLoading}>
                                                                    No
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="um-btn um-btn-delete"
                                                                onClick={() => setConfirmDeleteId(user.id)}
                                                                disabled={isLoading}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {isOwner && <span className="um-protected">Protected</span>}
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