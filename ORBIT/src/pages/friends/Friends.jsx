import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import { listenToFriendsList } from "../../services/friendService";
import { createOrGetChat } from "../../services/chatService";
import "./friends.css";

export default function Friends() {
    const { user } = useUser();
    const navigate = useNavigate();
    const currentUserUid = user?.uid;

    const [allFriends, setAllFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [openingChat, setOpeningChat] = useState(null);

    useEffect(() => {
        if (!currentUserUid) return;
        const unsub = listenToFriendsList(currentUserUid, (friends) => {
            setAllFriends(friends);
        });
        return () => unsub();
    }, [currentUserUid]);

    const handleOpenChat = async (friend) => {
        setOpeningChat(friend.uid);
        try {
            const chat = await createOrGetChat(currentUserUid, friend.uid);
            navigate(`/chats?chatId=${chat.id}`);
        } catch (err) {
            console.error("Failed to open chat:", err);
            // Optionally trigger a toast notification here
        } finally {
            setOpeningChat(null);
        }
    };

    // Memoized filtering for performance
    const filteredFriends = useMemo(() => {
        if (!searchQuery.trim()) return allFriends;
        return allFriends.filter(f =>
            f.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allFriends, searchQuery]);

    const onlineFriends = useMemo(() => filteredFriends.filter(f => f.isOnline), [filteredFriends]);
    const offlineFriends = useMemo(() => filteredFriends.filter(f => !f.isOnline), [filteredFriends]);

    return (
        <Dashboard>
            <div className="friends-page">
                <div className="friends-header">
                    <div>
                        <h1>Friends 👥</h1>
                        <p className="friends-subtitle">
                            {allFriends.length} total friends · {onlineFriends.length} online
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="friends-search-wrap">
                    <svg
                        className="friends-search-icon"
                        width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="friends-search"
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search friends"
                    />
                    {searchQuery && (
                        <button
                            className="friends-search-clear"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Online Section */}
                {onlineFriends.length > 0 && (
                    <div className="friends-section">
                        <h3 className="friends-section-title">
                            <span className="status-dot status-dot--online"></span>
                            Online — {onlineFriends.length}
                        </h3>
                        <div className="friends-list">
                            {onlineFriends.map(friend => (
                                <FriendCard
                                    key={friend.uid}
                                    friend={friend}
                                    openingChat={openingChat === friend.uid}
                                    onChat={() => handleOpenChat(friend)}
                                    onViewProfile={() => navigate(`/profile/${friend.uid}`)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Offline Section */}
                {offlineFriends.length > 0 && (
                    <div className="friends-section">
                        <h3 className="friends-section-title">
                            <span className="status-dot status-dot--offline"></span>
                            Offline — {offlineFriends.length}
                        </h3>
                        <div className="friends-list">
                            {offlineFriends.map(friend => (
                                <FriendCard
                                    key={friend.uid}
                                    friend={friend}
                                    openingChat={openingChat === friend.uid}
                                    onChat={() => handleOpenChat(friend)}
                                    onViewProfile={() => navigate(`/profile/${friend.uid}`)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty States */}
                {allFriends.length === 0 && (
                    <div className="friends-empty">
                        <span className="friends-empty-icon">🔍</span>
                        <h3>No friends yet</h3>
                        <p>Search for people to start building your Orbit.</p>
                        <button className="friends-add-btn" onClick={() => navigate('/search')}>
                            Find Friends
                        </button>
                    </div>
                )}

                {allFriends.length > 0 && filteredFriends.length === 0 && (
                    <div className="friends-empty friends-empty--search">
                        <p>No friends found matching "<strong>{searchQuery}</strong>"</p>
                    </div>
                )}
            </div>
        </Dashboard>
    );
}

// ─── Friend Card Component ────────────────────────────
function FriendCard({ friend, openingChat, onChat, onViewProfile }) {
    // Added encodeURIComponent to safely handle names with spaces/special chars
    const avatarUrl = friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || 'User')}&background=7c3aed&color=fff`;

    return (
        <div className="friend-card">
            <img
                src={avatarUrl}
                alt={`${friend.name}'s avatar`}
                className="friend-avatar"
                loading="lazy" // Added lazy loading for better performance
            />
            <div className="friend-info">
                <h4>{friend.name}</h4>
                <p className="friend-status-text">
                    {friend.isOnline ? "Active now" : "Offline"}
                </p>
            </div>
            <div className="friend-actions">
                <button
                    className="friend-btn friend-btn--profile"
                    onClick={onViewProfile}
                    aria-label={`View ${friend.name}'s profile`}
                    title="View Profile"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </button>
                <button
                    className="friend-btn friend-btn--chat"
                    onClick={onChat}
                    disabled={openingChat}
                    aria-label={`Message ${friend.name}`}
                    title="Message"
                >
                    {openingChat ? (
                        <div className="mini-spinner" role="status" aria-label="Loading" />
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}