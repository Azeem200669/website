import { useEffect, useMemo, useState } from "react";

import {
    assignBadge,
    createBadge,
    deleteBadge,
    getUsers,
    removeBadge,
    subscribeToBadges,
    updateBadge,
} from "../services/badgeService";

import "./BadgeManagement.css";

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const CATEGORIES = ["Achievement", "Participation", "Skill", "Special", "Event"];
const ICON_OPTIONS = [
    "🏆", "⭐", "🔥", "💎", "🎯", "🚀", "👑", "🛡️",
    "⚡", "🌟", "🎵", "🎨", "📚", "💻", "🎮", "🏅",
];

export default function BadgeManagement() {

    // ===========================
    // Badge Form
    // ===========================

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [icon, setIcon] = useState("🏆");
    const [color, setColor] = useState("#FFD700");
    const [rarity, setRarity] = useState("Common");
    const [category, setCategory] = useState("Achievement");

    // ===========================
    // Badge Data
    // ===========================

    const [badges, setBadges] = useState([]);
    const [users, setUsers] = useState([]);
    const [editingBadge, setEditingBadge] = useState(null);

    // ===========================
    // Search
    // ===========================

    const [badgeSearch, setBadgeSearch] = useState("");
    const [userSearch, setUserSearch] = useState("");

    // ===========================
    // Assign
    // ===========================

    const [selectedBadge, setSelectedBadge] = useState("");
    const [selectedUser, setSelectedUser] = useState("");

    // ===========================
    // UI State
    // ===========================

    const [activeTab, setActiveTab] = useState("create");
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [expandedUser, setExpandedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [assignLoading, setAssignLoading] = useState(false);

    // ===========================
    // Load Badges
    // ===========================

    useEffect(() => {
        const unsubscribe = subscribeToBadges(setBadges);
        loadUsers();
        return unsubscribe;
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ===========================
    // Statistics
    // ===========================

    const totalAssigned = useMemo(() => {
        let count = 0;
        users.forEach((user) => {
            count += user.badges?.length || 0;
        });
        return count;
    }, [users]);

    const legendaryCount = useMemo(() => {
        return badges.filter((b) => b.rarity === "Legendary").length;
    }, [badges]);

    const uniqueRecipients = useMemo(() => {
        return users.filter((u) => u.badges?.length > 0).length;
    }, [users]);

    const mostPopularBadge = useMemo(() => {
        if (users.length === 0) return null;
        const countMap = {};
        users.forEach((user) => {
            user.badges?.forEach((badgeId) => {
                countMap[badgeId] = (countMap[badgeId] || 0) + 1;
            });
        });
        let maxCount = 0;
        let popularId = null;
        Object.entries(countMap).forEach(([id, count]) => {
            if (count > maxCount) {
                maxCount = count;
                popularId = id;
            }
        });
        if (!popularId) return null;
        return badges.find((b) => b.id === popularId) || null;
    }, [users, badges]);

    // ===========================
    // Search Filters
    // ===========================

    const filteredBadges = badges.filter((badge) => {
        const text = badgeSearch.toLowerCase();
        return (
            badge.name?.toLowerCase().includes(text) ||
            badge.category?.toLowerCase().includes(text) ||
            badge.rarity?.toLowerCase().includes(text)
        );
    });

    const filteredUsers = users.filter((user) => {
        const text = userSearch.toLowerCase();
        return (
            user.displayName?.toLowerCase().includes(text) ||
            user.username?.toLowerCase().includes(text) ||
            user.email?.toLowerCase().includes(text)
        );
    });

    // ===========================
    // Helpers
    // ===========================

    const getBadgeById = (badgeId) => {
        return badges.find((b) => b.id === badgeId) || null;
    };

    const getRarityClass = (rarity) => {
        switch (rarity) {
            case "Common": return "rarity-common";
            case "Uncommon": return "rarity-uncommon";
            case "Rare": return "rarity-rare";
            case "Epic": return "rarity-epic";
            case "Legendary": return "rarity-legendary";
            default: return "";
        }
    };

    // ===========================
    // Clear Form
    // ===========================

    const clearForm = () => {
        setName("");
        setDescription("");
        setIcon("🏆");
        setColor("#FFD700");
        setRarity("Common");
        setCategory("Achievement");
        setEditingBadge(null);
    };

    // ===========================
    // Save Badge
    // ===========================

    const saveBadge = async () => {
        if (!name.trim()) {
            alert("Badge name is required.");
            return;
        }

        const badge = {
            name: name.trim(),
            description: description.trim(),
            icon,
            color,
            rarity,
            category,
        };

        try {
            if (editingBadge) {
                await updateBadge(editingBadge, badge);
            } else {
                await createBadge(badge);
            }
            clearForm();
        } catch (err) {
            console.error(err);
        }
    };

    // ===========================
    // Edit Badge
    // ===========================

    const editBadge = (badge) => {
        setEditingBadge(badge.id);
        setName(badge.name);
        setDescription(badge.description);
        setIcon(badge.icon);
        setColor(badge.color);
        setCategory(badge.category);
        setRarity(badge.rarity);
        setActiveTab("create");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ===========================
    // Delete Badge
    // ===========================

    const removeBadgeDoc = async (id) => {
        if (!window.confirm("Are you sure you want to delete this badge? This action cannot be undone.")) return;

        setDeleteLoading(id);
        try {
            await deleteBadge(id);
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteLoading(null);
        }
    };

    // ===========================
    // Assign Badge
    // ===========================

    const assign = async () => {
        if (!selectedBadge || !selectedUser) {
            alert("Please select both a badge and a user.");
            return;
        }

        const user = users.find((u) => u.id === selectedUser);
        if (user?.badges?.includes(selectedBadge)) {
            alert("This user already has this badge.");
            return;
        }

        setAssignLoading(true);
        try {
            await assignBadge(selectedUser, selectedBadge);
            await loadUsers();
            setSelectedBadge("");
            setSelectedUser("");
            alert("Badge assigned successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to assign badge.");
        } finally {
            setAssignLoading(false);
        }
    };

    // ===========================
    // Remove Badge from User
    // ===========================

    const remove = async (uid, badgeId) => {
        if (!window.confirm("Remove this badge from the user?")) return;

        try {
            await removeBadge(uid, badgeId);
            await loadUsers();
        } catch (err) {
            console.error(err);
        }
    };

    // ===========================
    // Render
    // ===========================

    return (
        <div className="badge-management">
            {/* Header */}
            <div className="bm-header">
                <div className="bm-header-content">
                    <h1>Badge Management</h1>
                    <p>Create, assign, and manage badges for your community</p>
                </div>
            </div>

            {/* Statistics */}
            <div className="bm-stats-grid">
                <div className="bm-stat-card">
                    <div className="bm-stat-icon">🏅</div>
                    <div className="bm-stat-info">
                        <span className="bm-stat-value">{badges.length}</span>
                        <span className="bm-stat-label">Total Badges</span>
                    </div>
                </div>
                <div className="bm-stat-card">
                    <div className="bm-stat-icon">👥</div>
                    <div className="bm-stat-info">
                        <span className="bm-stat-value">{totalAssigned}</span>
                        <span className="bm-stat-label">Assigned</span>
                    </div>
                </div>
                <div className="bm-stat-card">
                    <div className="bm-stat-icon">✨</div>
                    <div className="bm-stat-info">
                        <span className="bm-stat-value">{legendaryCount}</span>
                        <span className="bm-stat-label">Legendary</span>
                    </div>
                </div>
                <div className="bm-stat-card">
                    <div className="bm-stat-icon">🎯</div>
                    <div className="bm-stat-info">
                        <span className="bm-stat-value">{uniqueRecipients}</span>
                        <span className="bm-stat-label">Recipients</span>
                    </div>
                </div>
                {mostPopularBadge && (
                    <div className="bm-stat-card bm-stat-card-wide">
                        <div className="bm-stat-icon" style={{ fontSize: "1.5rem" }}>
                            {mostPopularBadge.icon}
                        </div>
                        <div className="bm-stat-info">
                            <span className="bm-stat-value" style={{ fontSize: "1rem" }}>
                                {mostPopularBadge.name}
                            </span>
                            <span className="bm-stat-label">Most Popular Badge</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="bm-tabs">
                <button
                    className={`bm-tab ${activeTab === "create" ? "active" : ""}`}
                    onClick={() => setActiveTab("create")}
                >
                    <span>✏️</span> {editingBadge ? "Edit Badge" : "Create Badge"}
                </button>
                <button
                    className={`bm-tab ${activeTab === "browse" ? "active" : ""}`}
                    onClick={() => setActiveTab("browse")}
                >
                    <span>📋</span> Browse Badges
                </button>
                <button
                    className={`bm-tab ${activeTab === "assign" ? "active" : ""}`}
                    onClick={() => setActiveTab("assign")}
                >
                    <span>🔗</span> Assign Badge
                </button>
                <button
                    className={`bm-tab ${activeTab === "users" ? "active" : ""}`}
                    onClick={() => setActiveTab("users")}
                >
                    <span>👥</span> User Badges
                </button>
            </div>

            {/* Tab Content */}
            <div className="bm-tab-content">
                {/* Create / Edit Badge */}
                {activeTab === "create" && (
                    <div className="bm-panel">
                        <div className="bm-panel-header">
                            <h2>{editingBadge ? "Edit Badge" : "Create New Badge"}</h2>
                            {editingBadge && (
                                <button className="bm-btn bm-btn-ghost" onClick={clearForm}>
                                    Cancel Edit
                                </button>
                            )}
                        </div>

                        <div className="bm-form-grid">
                            <div className="bm-form-preview">
                                <div
                                    className="bm-preview-badge"
                                    style={{
                                        backgroundColor: color + "20",
                                        borderColor: color,
                                        boxShadow: `0 0 30px ${color}40`,
                                    }}
                                >
                                    <span className="bm-preview-icon" style={{ fontSize: "3rem" }}>
                                        {icon}
                                    </span>
                                    <span className="bm-preview-name">{name || "Badge Name"}</span>
                                    <span className={`bm-preview-rarity ${getRarityClass(rarity)}`}>
                                        {rarity}
                                    </span>
                                    <span className="bm-preview-category">{category}</span>
                                    {description && (
                                        <span className="bm-preview-desc">{description}</span>
                                    )}
                                </div>
                            </div>

                            <div className="bm-form-fields">
                                <div className="bm-field">
                                    <label className="bm-label">Badge Name *</label>
                                    <input
                                        type="text"
                                        className="bm-input"
                                        placeholder="Enter badge name..."
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        maxLength={50}
                                    />
                                    <span className="bm-field-hint">{name.length}/50 characters</span>
                                </div>

                                <div className="bm-field">
                                    <label className="bm-label">Description</label>
                                    <textarea
                                        className="bm-textarea"
                                        placeholder="Describe what this badge represents..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        maxLength={200}
                                    />
                                    <span className="bm-field-hint">{description.length}/200 characters</span>
                                </div>

                                <div className="bm-field">
                                    <label className="bm-label">Icon</label>
                                    <div className="bm-icon-picker-wrapper">
                                        <button
                                            type="button"
                                            className="bm-icon-selected"
                                            onClick={() => setShowIconPicker(!showIconPicker)}
                                        >
                                            <span style={{ fontSize: "1.5rem" }}>{icon}</span>
                                            <span className="bm-icon-change-text">Change</span>
                                        </button>
                                        {showIconPicker && (
                                            <div className="bm-icon-picker-grid">
                                                {ICON_OPTIONS.map((ic) => (
                                                    <button
                                                        key={ic}
                                                        type="button"
                                                        className={`bm-icon-option ${icon === ic ? "selected" : ""}`}
                                                        onClick={() => {
                                                            setIcon(ic);
                                                            setShowIconPicker(false);
                                                        }}
                                                    >
                                                        {ic}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bm-field">
                                    <label className="bm-label">Color</label>
                                    <div className="bm-color-row">
                                        <input
                                            type="color"
                                            className="bm-color-input"
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                        />
                                        <span className="bm-color-value">{color}</span>
                                        <div className="bm-color-presets">
                                            {[
                                                "#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1",
                                                "#96CEB4", "#FF8C42", "#A855F7", "#EC4899",
                                            ].map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    className={`bm-color-preset ${color === c ? "selected" : ""}`}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => setColor(c)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bm-field-row">
                                    <div className="bm-field">
                                        <label className="bm-label">Rarity</label>
                                        <select
                                            className="bm-select"
                                            value={rarity}
                                            onChange={(e) => setRarity(e.target.value)}
                                        >
                                            {RARITIES.map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="bm-field">
                                        <label className="bm-label">Category</label>
                                        <select
                                            className="bm-select"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                        >
                                            {CATEGORIES.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="bm-form-actions">
                                    <button className="bm-btn bm-btn-secondary" onClick={clearForm}>
                                        Clear
                                    </button>
                                    <button className="bm-btn bm-btn-primary" onClick={saveBadge}>
                                        {editingBadge ? "Update Badge" : "Create Badge"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Browse Badges */}
                {activeTab === "browse" && (
                    <div className="bm-panel">
                        <div className="bm-panel-header">
                            <h2>All Badges ({badges.length})</h2>
                            <div className="bm-search-box">
                                <span className="bm-search-icon">🔍</span>
                                <input
                                    type="text"
                                    className="bm-input"
                                    placeholder="Search badges..."
                                    value={badgeSearch}
                                    onChange={(e) => setBadgeSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {filteredBadges.length === 0 ? (
                            <div className="bm-empty">
                                <span className="bm-empty-icon">🏅</span>
                                <p>
                                    {badgeSearch
                                        ? "No badges match your search."
                                        : "No badges created yet."}
                                </p>
                                <button
                                    className="bm-btn bm-btn-primary"
                                    onClick={() => {
                                        setActiveTab("create");
                                        clearForm();
                                    }}
                                >
                                    Create First Badge
                                </button>
                            </div>
                        ) : (
                            <div className="bm-badge-grid">
                                {filteredBadges.map((badge) => {
                                    const assignCount = users.filter((u) =>
                                        u.badges?.includes(badge.id)
                                    ).length;

                                    return (
                                        <div
                                            key={badge.id}
                                            className={`bm-badge-card ${getRarityClass(badge.rarity)}`}
                                            style={{
                                                borderColor: badge.color,
                                                boxShadow: `0 4px 20px ${badge.color}25`,
                                            }}
                                        >
                                            <div
                                                className="bm-badge-card-header"
                                                style={{ backgroundColor: badge.color + "15" }}
                                            >
                                                <span className="bm-badge-card-icon">{badge.icon}</span>
                                                <span
                                                    className="bm-badge-card-dot"
                                                    style={{ backgroundColor: badge.color }}
                                                />
                                            </div>
                                            <div className="bm-badge-card-body">
                                                <h3 className="bm-badge-card-name">{badge.name}</h3>
                                                <p className="bm-badge-card-desc">
                                                    {badge.description || "No description"}
                                                </p>
                                                <div className="bm-badge-card-meta">
                                                    <span
                                                        className={`bm-rarity-tag ${getRarityClass(badge.rarity)}`}
                                                    >
                                                        {badge.rarity}
                                                    </span>
                                                    <span className="bm-category-tag">{badge.category}</span>
                                                </div>
                                                <div className="bm-badge-card-stats">
                                                    <span>👥 {assignCount} assigned</span>
                                                </div>
                                            </div>
                                            <div className="bm-badge-card-actions">
                                                <button
                                                    className="bm-btn bm-btn-sm bm-btn-ghost"
                                                    onClick={() => editBadge(badge)}
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="bm-btn bm-btn-sm bm-btn-danger"
                                                    onClick={() => removeBadgeDoc(badge.id)}
                                                    disabled={deleteLoading === badge.id}
                                                >
                                                    {deleteLoading === badge.id ? "..." : "🗑️ Delete"}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Assign Badge */}
                {activeTab === "assign" && (
                    <div className="bm-panel">
                        <div className="bm-panel-header">
                            <h2>Assign Badge to User</h2>
                        </div>

                        {badges.length === 0 ? (
                            <div className="bm-empty">
                                <span className="bm-empty-icon">⚠️</span>
                                <p>You need to create badges first before assigning them.</p>
                                <button
                                    className="bm-btn bm-btn-primary"
                                    onClick={() => setActiveTab("create")}
                                >
                                    Create a Badge
                                </button>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="bm-empty">
                                <span className="bm-empty-icon">👥</span>
                                <p>No users found in the system.</p>
                            </div>
                        ) : (
                            <div className="bm-assign-section">
                                <div className="bm-assign-grid">
                                    <div className="bm-assign-col">
                                        <label className="bm-label">Select Badge</label>
                                        <div className="bm-assign-list">
                                            {badges.map((badge) => (
                                                <button
                                                    key={badge.id}
                                                    className={`bm-assign-option ${selectedBadge === badge.id ? "selected" : ""
                                                        }`}
                                                    style={{
                                                        borderColor:
                                                            selectedBadge === badge.id ? badge.color : undefined,
                                                        backgroundColor:
                                                            selectedBadge === badge.id
                                                                ? badge.color + "15"
                                                                : undefined,
                                                    }}
                                                    onClick={() => setSelectedBadge(badge.id)}
                                                >
                                                    <span className="bm-assign-option-icon">
                                                        {badge.icon}
                                                    </span>
                                                    <div className="bm-assign-option-info">
                                                        <span className="bm-assign-option-name">
                                                            {badge.name}
                                                        </span>
                                                        <span
                                                            className={`bm-rarity-tag ${getRarityClass(
                                                                badge.rarity
                                                            )} bm-rarity-tag-sm`}
                                                        >
                                                            {badge.rarity}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bm-assign-col">
                                        <label className="bm-label">Select User</label>
                                        <div className="bm-search-box mb-3">
                                            <span className="bm-search-icon">🔍</span>
                                            <input
                                                type="text"
                                                className="bm-input"
                                                placeholder="Search users..."
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="bm-assign-list">
                                            {filteredUsers.length === 0 ? (
                                                <p className="bm-no-results">No users found.</p>
                                            ) : (
                                                filteredUsers.map((user) => {
                                                    const hasBadge = user.badges?.includes(selectedBadge);
                                                    return (
                                                        <button
                                                            key={user.id}
                                                            className={`bm-assign-option ${selectedUser === user.id ? "selected" : ""
                                                                } ${hasBadge ? "has-badge" : ""}`}
                                                            onClick={() => setSelectedUser(user.id)}
                                                        >
                                                            <div className="bm-assign-user-avatar">
                                                                {user.displayName?.[0]?.toUpperCase() ||
                                                                    user.username?.[0]?.toUpperCase() ||
                                                                    "?"}
                                                            </div>
                                                            <div className="bm-assign-option-info">
                                                                <span className="bm-assign-option-name">
                                                                    {user.displayName ||
                                                                        user.username ||
                                                                        "Unknown"}
                                                                </span>
                                                                <span className="bm-assign-option-email">
                                                                    {user.email || ""}
                                                                    {hasBadge && (
                                                                        <span className="bm-already-has">
                                                                            {" "}
                                                                            — Already has this badge
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <span className="bm-badge-count-badge">
                                                                {user.badges?.length || 0} 🏅
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bm-assign-footer">
                                    {selectedBadge && selectedUser && (
                                        <div className="bm-assign-preview">
                                            <span className="bm-assign-preview-icon">
                                                {getBadgeById(selectedBadge)?.icon}
                                            </span>
                                            <span className="bm-assign-preview-text">
                                                <strong>
                                                    {getBadgeById(selectedBadge)?.name}
                                                </strong>
                                                {" → "}
                                                <strong>
                                                    {users.find((u) => u.id === selectedUser)
                                                        ?.displayName ||
                                                        users.find((u) => u.id === selectedUser)?.username}
                                                </strong>
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        className="bm-btn bm-btn-primary bm-btn-lg"
                                        onClick={assign}
                                        disabled={!selectedBadge || !selectedUser || assignLoading}
                                    >
                                        {assignLoading ? "Assigning..." : "🔗 Assign Badge"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* User Badges */}
                {activeTab === "users" && (
                    <div className="bm-panel">
                        <div className="bm-panel-header">
                            <h2>User Badges ({uniqueRecipients} with badges)</h2>
                            <div className="bm-search-box">
                                <span className="bm-search-icon">🔍</span>
                                <input
                                    type="text"
                                    className="bm-input"
                                    placeholder="Search users..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {filteredUsers.length === 0 ? (
                            <div className="bm-empty">
                                <span className="bm-empty-icon">👥</span>
                                <p>
                                    {userSearch
                                        ? "No users match your search."
                                        : "No users found."}
                                </p>
                            </div>
                        ) : (
                            <div className="bm-user-list">
                                {filteredUsers.map((user) => {
                                    const userBadges = (user.badges || [])
                                        .map((badgeId) => getBadgeById(badgeId))
                                        .filter(Boolean);
                                    const isExpanded = expandedUser === user.id;

                                    return (
                                        <div
                                            key={user.id}
                                            className={`bm-user-card ${isExpanded ? "expanded" : ""}`}
                                        >
                                            <div
                                                className="bm-user-card-header"
                                                onClick={() =>
                                                    setExpandedUser(isExpanded ? null : user.id)
                                                }
                                            >
                                                <div className="bm-user-card-left">
                                                    <div className="bm-user-avatar">
                                                        {user.displayName?.[0]?.toUpperCase() ||
                                                            user.username?.[0]?.toUpperCase() ||
                                                            "?"}
                                                    </div>
                                                    <div className="bm-user-card-info">
                                                        <h3>
                                                            {user.displayName ||
                                                                user.username ||
                                                                "Unknown User"}
                                                        </h3>
                                                        <p>{user.email || ""}</p>
                                                    </div>
                                                </div>
                                                <div className="bm-user-card-right">
                                                    <span className="bm-user-badge-count">
                                                        {userBadges.length} badge
                                                        {userBadges.length !== 1 ? "s" : ""}
                                                    </span>
                                                    <span
                                                        className={`bm-chevron ${isExpanded ? "rotated" : ""}`}
                                                    >
                                                        ▼
                                                    </span>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="bm-user-card-body">
                                                    {userBadges.length === 0 ? (
                                                        <p className="bm-no-badges">
                                                            This user has no badges yet.
                                                        </p>
                                                    ) : (
                                                        <div className="bm-user-badges-grid">
                                                            {userBadges.map((badge) => (
                                                                <div
                                                                    key={badge.id}
                                                                    className={`bm-user-badge-item ${getRarityClass(
                                                                        badge.rarity
                                                                    )}`}
                                                                    style={{ borderColor: badge.color }}
                                                                >
                                                                    <span className="bm-user-badge-icon">
                                                                        {badge.icon}
                                                                    </span>
                                                                    <span className="bm-user-badge-name">
                                                                        {badge.name}
                                                                    </span>
                                                                    <button
                                                                        className="bm-remove-badge-btn"
                                                                        onClick={() =>
                                                                            remove(user.id, badge.id)
                                                                        }
                                                                        title="Remove badge"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <button
                                                        className="bm-btn bm-btn-sm bm-btn-secondary mt-3"
                                                        onClick={() => {
                                                            setSelectedUser(user.id);
                                                            setActiveTab("assign");
                                                        }}
                                                    >
                                                        + Assign Badge
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}