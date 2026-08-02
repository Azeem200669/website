import { useEffect, useRef, useState } from "react";
import "./RewardsManagement.css";
import { auth } from "../firebase/auth";
import {
    giveGems,
    giveXP,
    listenRewardHistory,
    searchUsers,
    getName,
} from "../services/rewardService";

export default function RewardsManagement() {
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [xp, setXp] = useState("");
    const [gems, setGems] = useState("");
    const [reason, setReason] = useState("");

    const [sending, setSending] = useState(null);
    const [lastSent, setLastSent] = useState(null);

    const [history, setHistory] = useState([]);
    const [historyTab, setHistoryTab] = useState("all");

    const debounceRef = useRef(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!search.trim()) {
            setUsers([]);
            setSearching(false);
            return;
        }

        setSearching(true);

        debounceRef.current = setTimeout(async () => {
            try {
                const result = await searchUsers(search);
                setUsers(result);
            } catch (err) {
                console.error("Search error:", err);
                setUsers([]);
            }
            setSearching(false);
        }, 350);

        return () => clearTimeout(debounceRef.current);
    }, [search]);

    useEffect(() => {
        return listenRewardHistory(setHistory);
    }, []);

    const sendXP = async () => {
        if (!selectedUser || !xp || Number(xp) <= 0) return;
        setSending("xp");
        try {
            await giveXP({
                userId: selectedUser.id,
                amount: Number(xp),
                reason: reason.trim() || "No reason provided",
                ownerId: auth.currentUser.uid,
            });
            setLastSent({ type: "XP", amount: xp });
            setXp("");
            setReason("");
            setTimeout(() => setLastSent(null), 2500);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(null);
        }
    };

    const sendGems = async () => {
        if (!selectedUser || !gems || Number(gems) <= 0) return;
        setSending("gems");
        try {
            await giveGems({
                userId: selectedUser.id,
                amount: Number(gems),
                reason: reason.trim() || "No reason provided",
                ownerId: auth.currentUser.uid,
            });
            setLastSent({ type: "Gems", amount: gems });
            setGems("");
            setReason("");
            setTimeout(() => setLastSent(null), 2500);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(null);
        }
    };

    const filteredHistory = historyTab === "all"
        ? history
        : history.filter((h) => h.type?.toLowerCase() === historyTab);

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

    return (
        <div className="rm-container">
            <div className="rm-header">
                <div>
                    <h1>Reward Management</h1>
                    <p className="rm-subtitle">Search by name or Orbit ID to distribute rewards</p>
                </div>
            </div>

            <div className="rm-layout">
                <div className="rm-left">
                    {/* Search */}
                    <div className="rm-search-wrap">
                        <svg className="rm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            className="rm-search"
                            placeholder="Name or Orbit ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="rm-search-clear" onClick={() => setSearch("")}>
                                ✕
                            </button>
                        )}
                        {searching && <div className="rm-search-spinner" />}
                    </div>

                    {/* Results */}
                    {users.length > 0 && (
                        <div className="rm-results">
                            {users.map((user) => {
                                const name = getName(user);
                                return (
                                    <div
                                        key={user.id}
                                        className={`rm-user-card ${selectedUser?.id === user.id ? "active" : ""}`}
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <div className="rm-user-avatar">
                                            {user.photoURL || user.avatar ? (
                                                <img src={user.photoURL || user.avatar} alt="" />
                                            ) : (
                                                <span>{name[0].toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="rm-user-info">
                                            <h4>{name}</h4>
                                            <p className="rm-user-orbit-id">
                                                {user.orbitId || "No Orbit ID"}
                                            </p>
                                        </div>
                                        <div className="rm-user-balance">
                                            <span className="rm-bal-xp">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                                {user.points || 0}
                                            </span>
                                            <span className="rm-bal-gems">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3l-3 9 9 9 9-9-3-9h-12zm5.5 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                                {user.gems || 0}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {search.trim() && !searching && users.length === 0 && (
                        <div className="rm-no-results">
                            <p>No users found for "{search}"</p>
                        </div>
                    )}

                    {/* Selected User */}
                    {selectedUser && (
                        <div className="rm-selected">
                            <div className="rm-selected-header">
                                <div className="rm-selected-avatar">
                                    {selectedUser.photoURL || selectedUser.avatar ? (
                                        <img src={selectedUser.photoURL || selectedUser.avatar} alt="" />
                                    ) : (
                                        <span>{getName(selectedUser)[0].toUpperCase()}</span>
                                    )}
                                </div>
                                <div>
                                    <h3>{getName(selectedUser)}</h3>
                                    <p className="rm-selected-orbit-id">
                                        {selectedUser.orbitId || "No Orbit ID"}
                                    </p>
                                </div>
                            </div>

                            <div className="rm-selected-stats">
                                <div className="rm-stat-box rm-stat-xp">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    <div>
                                        <span className="rm-stat-val">{selectedUser.points || 0}</span>
                                        <span className="rm-stat-lbl">XP</span>
                                    </div>
                                </div>
                                <div className="rm-stat-box rm-stat-gems">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3l-3 9 9 9 9-9-3-9h-12zm5.5 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                    <div>
                                        <span className="rm-stat-val">{selectedUser.gems || 0}</span>
                                        <span className="rm-stat-lbl">Gems</span>
                                    </div>
                                </div>
                            </div>

                            {lastSent && (
                                <div className="rm-toast">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    {lastSent.amount} {lastSent.type} sent successfully
                                </div>
                            )}

                            <div className="rm-field">
                                <label>Reason</label>
                                <textarea
                                    placeholder="Why are you rewarding this user?"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="rm-send-row">
                                <div className="rm-input-wrap">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="rm-input-icon"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={xp}
                                        onChange={(e) => setXp(e.target.value)}
                                        min="1"
                                    />
                                </div>
                                <button
                                    className="rm-send-btn rm-send-xp"
                                    onClick={sendXP}
                                    disabled={sending === "xp" || !xp || Number(xp) <= 0}
                                >
                                    {sending === "xp" ? (
                                        <div className="rm-btn-spinner" />
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13" />
                                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                            </svg>
                                            Send XP
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="rm-send-row">
                                <div className="rm-input-wrap">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="rm-input-icon"><path d="M6 3l-3 9 9 9 9-9-3-9h-12zm5.5 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={gems}
                                        onChange={(e) => setGems(e.target.value)}
                                        min="1"
                                    />
                                </div>
                                <button
                                    className="rm-send-btn rm-send-gems"
                                    onClick={sendGems}
                                    disabled={sending === "gems" || !gems || Number(gems) <= 0}
                                >
                                    {sending === "gems" ? (
                                        <div className="rm-btn-spinner" />
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13" />
                                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                            </svg>
                                            Send Gems
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {!selectedUser && !search && (
                        <div className="rm-placeholder">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <p>Search by name or Orbit ID</p>
                        </div>
                    )}
                </div>

                {/* History */}
                <div className="rm-right">
                    <div className="rm-history-header">
                        <h2>Recent Rewards</h2>
                        <div className="rm-history-tabs">
                            {["all", "xp", "gems"].map((tab) => (
                                <button
                                    key={tab}
                                    className={`rm-tab ${historyTab === tab ? "active" : ""}`}
                                    onClick={() => setHistoryTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rm-history-list">
                        {filteredHistory.length === 0 ? (
                            <div className="rm-history-empty">
                                <p>No reward history yet</p>
                            </div>
                        ) : (
                            filteredHistory.map((item, i) => (
                                <div
                                    key={item.id}
                                    className="rm-history-card"
                                    style={{ animationDelay: `${i * 0.04}s` }}
                                >
                                    <div className="rm-h-icon-wrap">
                                        {item.type?.toLowerCase() === "xp" ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3l-3 9 9 9 9-9-3-9h-12zm5.5 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                        )}
                                    </div>
                                    <div className="rm-h-content">
                                        <div className="rm-h-top">
                                            <span className="rm-h-type">{item.type || "Reward"}</span>
                                            <span className={`rm-h-amount ${item.type?.toLowerCase() === "gems" ? "gems" : "xp"}`}>
                                                +{item.amount}
                                            </span>
                                        </div>
                                        <p className="rm-h-reason">{item.reason || "No reason"}</p>
                                        <div className="rm-h-meta">
                                            <span>{item.userId}</span>
                                            {item.timestamp && <span>{formatTime(item.timestamp)}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}