import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import { listenToSpaces } from "../../services/spaceService";
import { listenToFriendsList } from "../../services/friendService";
import "./home.css";

export default function Home() {
  const { user, stats } = useUser();
  const navigate = useNavigate();
  const currentUserUid = user?.uid;

  const [mySpaces, setMySpaces] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState([]);

  const formatNumber = (num) => num?.toLocaleString() || "0";

  useEffect(() => {
    if (!currentUserUid) return;
    const unsub = listenToSpaces((allSpaces) => {
      const joined = allSpaces.filter((s) => s.members?.includes(currentUserUid));
      setMySpaces(joined);
    });
    return () => unsub();
  }, [currentUserUid]);

  useEffect(() => {
    if (!currentUserUid) return;
    const unsub = listenToFriendsList(currentUserUid, (friends) => {
      const online = friends.filter((f) => f.isOnline);
      setOnlineFriends(online);
    });
    return () => unsub();
  }, [currentUserUid]);

  const handleOpenChat = (friendUid) => {
    navigate("/chats", { state: { targetUserId: friendUid } });
  };

  return (
    <Dashboard>
      <div className="topbar">
        <input
          type="text"
          placeholder="Search Orbit..."
          className="home-search"
          onFocus={() => navigate("/search")}
          readOnly
        />
        <div className="stats">
          <span>💎 {formatNumber(stats.gems)}</span>
          <span>🪙 {formatNumber(stats.points)}</span>
        </div>
      </div>

      <div className="home-page">
        <div className="main-area">
          <h1 className="welcome-title">Welcome Back! 🚀</h1>
          <p className="welcome-subtitle">
            Here&apos;s what&apos;s happening in your universe today.
          </p>

          <div className="stats-grid">
            <div className="card">
              <h2>🪙 {formatNumber(stats.points)}</h2>
              <p>Points Earned</p>
            </div>
            <div className="card">
              <h2>💎 {formatNumber(stats.gems)}</h2>
              <p>Gems Collected</p>
            </div>
          </div>

          <h3 className="section-title">Quick Actions</h3>
          <div className="actions">
            <button onClick={() => navigate("/search")}>Find Friends</button>
            <button onClick={() => navigate("/communities")}>Join Space</button>
            <button onClick={() => navigate("/chats")}>New Chat</button>
            <button onClick={() => navigate("/Events")}>Check Events</button>
          </div>

          <h3 className="section-title">Your Spaces</h3>
          <div className="spaces">
            {mySpaces.length === 0 ? (
              <div className="empty-state-small">
                <p>You haven&apos;t joined any Spaces yet.</p>
                <button
                  className="find-btn"
                  onClick={() => navigate("/communities")}
                >
                  Discover Spaces
                </button>
              </div>
            ) : (
              mySpaces.map((space) => (
                <div
                  key={space.id}
                  className="space-card"
                  onClick={() => navigate(`/spaces/${space.id}`)}
                >
                  <div className="space-avatar small">
                    {space.avatar ? (
                      <img src={space.avatar} alt={space.name} />
                    ) : (
                      space.name?.charAt(0)
                    )}
                  </div>
                  <h4>{space.name}</h4>
                  <p style={{ color: "#94a3b8", fontSize: "12px" }}>
                    {space.memberCount || 0} members
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="panel-card">
            <h3>🟢 Active Now</h3>
            {onlineFriends.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>
                No friends online right now.
              </p>
            ) : (
              onlineFriends.map((friend) => (
                <div
                  key={friend.uid}
                  className="online-friend-item"
                  onClick={() => handleOpenChat(friend.uid)}
                >
                  <div style={{ position: "relative", marginRight: "10px" }}>
                    <img
                      src={
                        friend.avatar ||
                        `https://ui-avatars.com/api/?name=${friend.name}&background=7c3aed&color=fff`
                      }
                      alt={friend.name}
                      className="online-avatar"
                    />
                    <span className="online-dot"></span>
                  </div>
                  <span>{friend.name}</span>
                </div>
              ))
            )}
          </div>

          <div className="panel-card">
            <h3>✨ Grow Your Orbit</h3>
            <p onClick={() => navigate("/search")}>🔍 Find new friends</p>
            <p onClick={() => navigate("/communities")}>
              🪐 Explore new spaces
            </p>
            <p onClick={() => navigate("/settings")}>⚙️ Customize profile</p>
          </div>
        </div>
      </div>
    </Dashboard>
  );
}