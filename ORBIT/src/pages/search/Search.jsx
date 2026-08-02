import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import {
  searchUsers,
  searchCommunities,
  searchEvents
} from "../../services/searchService";
import { sendFriendRequest } from "../../services/friendService";
import { createOrGetChat } from "../../services/chatService";
import "./search.css";

export default function Search() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [users, setUsers] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState({}); 

  const navigate = useNavigate();
  const { user: currentUser } = useUser();

  // ✅ Faster Debounce (150ms instead of 300ms for instant reaction)
  useEffect(() => {
    if (query.trim() === "") {
      setDebouncedQuery("");
      setUsers([]);
      setCommunities([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150); // ⚡ 150ms feels instant but protects Firestore limits
    
    return () => clearTimeout(timer);
  }, [query]);

  // Live Search Listeners
  useEffect(() => {
    if (debouncedQuery.trim() === "") {
      setLoading(false);
      return;
    }

    const unsubUsers = searchUsers(debouncedQuery, (data) => {
      setUsers(data);
      setLoading(false); // ✅ Stop loading as soon as data returns
    });

    const unsubCommunities = searchCommunities(debouncedQuery, (data) => {
      setCommunities(data);
    });

    const unsubEvents = searchEvents(debouncedQuery, (data) => {
      setEvents(data);
    });

    return () => {
      unsubUsers();
      unsubCommunities();
      unsubEvents();
    };
  }, [debouncedQuery]);

  const hasResults = users.length > 0 || communities.length > 0 || events.length > 0;

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleAddFriend = async (targetUserId) => {
    if (!currentUser?.uid) return;
    try {
      await sendFriendRequest(currentUser.uid, targetUserId);
      setSentRequests(prev => ({ ...prev, [targetUserId]: true }));
    } catch (error) {
      console.error("Error sending request:", error);
    }
  };

  // ✅ Updated to pass targetUserId to Chat.jsx via state
  const handleMessage = async (targetUserId) => {
    try {
      if (!currentUser?.uid) return;
      await createOrGetChat(currentUser.uid, targetUserId);
      // Navigate using state so Chat.jsx instantly opens their conversation
      navigate('/chats', { state: { targetUserId } });
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  return (
    <Dashboard>
      <div className="search-container">
        <h1 className="search-title">🔍 Search Orbit</h1>

        {/* Search Box */}
        <div className="search-card">
          <div className="search-input-wrapper">
            <span className="search-icon-main">🔍</span>
            <input
              type="text"
              placeholder="Search name or ORBIT-ID..."
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus // ✅ Auto-focus so they can type instantly
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery("")}>✕</button>
            )}
          </div>
        </div>

        {/* Results */}
        {debouncedQuery !== "" && (
          <div className="results-wrapper">
            {/* ✅ Only show empty loading state if we have NO results yet */}
            {loading && !hasResults ? (
              <div className="no-results"><p>Searching Orbit...</p></div>
            ) : !hasResults && !loading ? (
              <div className="no-results">
                <p>No results found for <strong>{debouncedQuery}</strong></p>
              </div>
            ) : (
              <>
                {/* USERS */}
                {users.length > 0 && (
                  <div className="search-card">
                    <h3 className="category-title">People</h3>
                    {users.map((user) => {
                      const isOwnProfile = currentUser?.uid === user.uid;
                      const isFriend = currentUser?.friends?.includes(user.uid);
                      const isPending = sentRequests[user.uid];

                      return (
                        <div key={user.uid} className="result-item user-result-item">
                          <div className="user-info-clickable" onClick={() => handleViewProfile(user.uid)}>
                            <img
                              src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=7c3aed&color=fff`}
                              alt={user.name}
                              className="result-avatar"
                            />
                            <div>
                              <h4>{user.name}</h4>
                              <p className="orbit-id-text">{user.orbitId || "ORBIT-00000"}</p>
                            </div>
                          </div>

                          {!isOwnProfile && (
                            <div className="user-actions">
                              {isFriend ? (
                                <button className="action-btn already-friends-btn" title="Already Friends">✓</button>
                              ) : isPending ? (
                                <button className="action-btn pending-btn" title="Pending">⏳</button>
                              ) : (
                                <button className="action-btn add-friend-btn" onClick={() => handleAddFriend(user.uid)} title="Add Friend">+</button>
                              )}
                              <button className="action-btn msg-btn" onClick={() => handleMessage(user.uid)} title="Message">✉</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* COMMUNITIES */}
                {communities.length > 0 && (
                  <div className="search-card">
                    <h3 className="category-title">Spaces</h3>
                    {communities.map((community) => (
                      <div key={community.id} className="result-item" onClick={() => navigate(`/spaces/${community.id}`)} style={{cursor: 'pointer'}}>
                        <div className="result-icon-box">{community.icon || "🪐"}</div>
                        <div>
                          <h4>{community.name}</h4>
                          <p>{community.members?.length || 0} members</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* EVENTS */}
                {events.length > 0 && (
                  <div className="search-card">
                    <h3 className="category-title">Events</h3>
                    {events.map((event) => (
                      <div key={event.id} className="result-item" onClick={() => navigate('/events')} style={{cursor: 'pointer'}}>
                        <div className="result-icon-box">{event.icon || "📅"}</div>
                        <div>
                          <h4>{event.title || event.name}</h4> {/* ✅ Fixed to check title first */}
                          <p>{event.date || "Upcoming"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Dashboard>
  );
}