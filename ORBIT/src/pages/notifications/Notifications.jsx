import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import { listenToNotifications, markNotifAsRead, markAllNotifsAsRead } from "../../services/notificationService";
import { createOrGetChat } from "../../services/chatService";
import "./notifications.css";

const timeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  if (seconds < 10) return "Just now";
  return Math.floor(seconds) + "s ago";
};

const ICON_MAP = {
  friend_request: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: "friend",
  },
  friend_accepted: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    color: "friend",
  },
  diamond_gift: {
    icon: (
      <span style={{ fontSize: "20px" }}>
        💎
      </span>
    ),
    color: "success",
  },
  announcement: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    color: "warning",
  },
  event: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    color: "success",
  },
  ban: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
    color: "danger",
  },
  system: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    color: "info",
  },
  update: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
    color: "info",
  },
  maintenance: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    color: "warning",
  },
};

const getDefaultIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default function Notifications() {
  const { user } = useUser();
  const currentUserUid = user?.uid;
  const navigate = useNavigate();

  const [notifs, setNotifs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!currentUserUid) return;
    const unsub = listenToNotifications(currentUserUid, (data) => {
      setNotifs(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, [currentUserUid]);

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);
  const unreadNotifs = useMemo(() => notifs.filter((n) => !n.read), [notifs]);
  const readNotifs = useMemo(() => notifs.filter((n) => n.read), [notifs]);

  const handleAction = async (notif) => {
    try {
      if (!notif.read) {
        await markNotifAsRead(currentUserUid, notif.id);
      }
      if (notif.type === "friend_accepted" && notif.fromUserId) {
        const chat = await createOrGetChat(currentUserUid, notif.fromUserId);
        navigate(`/chats?chatId=${chat.id}`);
      } else if (notif.type === "friend_request" && notif.fromUserId) {
        navigate(`/profile/${notif.fromUserId}`);
      } else if (notif.actionUrl) {
        navigate(notif.actionUrl);
      }
    } catch (error) {
      console.error("Failed to handle notification action:", error);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotifsAsRead(currentUserUid);
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAll(false);
    }
  };

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getIconData = (type) => {
    const key = type?.toLowerCase() || "";
    return ICON_MAP[key] || { icon: getDefaultIcon(), color: "accent" };
  };

  const isLongText = (text) => text && text.length > 80;

  return (
    <Dashboard>
      <div className="noti-page">
        {/* Header */}
        <div className="noti-glass noti-header">
          <div className="noti-header-left">
            <h1>Notifications</h1>
            {unreadCount > 0 && (
              <span className="noti-badge">{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              className="noti-mark-all"
              onClick={handleMarkAll}
              disabled={markingAll}
            >
              {markingAll ? (
                <div className="noti-mark-spinner" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              Mark all as read
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="noti-list">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="noti-card noti-skeleton noti-glass">
                <div className="noti-skel-icon" />
                <div className="noti-skel-body">
                  <div className="noti-skel-line long" />
                  <div className="noti-skel-line short" />
                </div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="noti-glass noti-empty">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h3>You're all caught up!</h3>
            <p>Check back later for new updates.</p>
          </div>
        ) : (
          <div className="noti-list">
            {/* Unread */}
            {unreadNotifs.length > 0 && (
              <div className="noti-section">
                <h3 className="noti-section-title">New</h3>
                {unreadNotifs.map((notif) => {
                  const { icon, color } = getIconData(notif.type);
                  const isExpanded = expandedId === notif.id;
                  const long = isLongText(notif.subtitle);
                  return (
                    <div
                      key={notif.id}
                      className={`noti-glass noti-card unread color-${color}`}
                      onClick={() => handleAction(notif)}
                    >
                      <div className="noti-icon-box">{icon}</div>
                      <div className="noti-body">
                        <div className="noti-text">
                          <strong>{notif.title || "Notification"}</strong>
                          <div className={`noti-desc-wrap ${isExpanded ? "expanded" : ""}`}>
                            {notif.subtitle && <p>{notif.subtitle}</p>}
                          </div>
                          {long && (
                            <button
                              className="noti-expand-btn"
                              onClick={(e) => toggleExpand(e, notif.id)}
                            >
                              {isExpanded ? "Show less" : "Read more"}
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                  transition: "transform 0.25s ease",
                                }}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="noti-meta">
                          <span className="noti-time">{timeAgo(notif.timestamp)}</span>
                          <div className="noti-unread-dot" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Read */}
            {readNotifs.length > 0 && (
              <div className="noti-section">
                {unreadNotifs.length > 0 && (
                  <h3 className="noti-section-title">Earlier</h3>
                )}
                {readNotifs.map((notif) => {
                  const { icon, color } = getIconData(notif.type);
                  const isExpanded = expandedId === notif.id;
                  const long = isLongText(notif.subtitle);
                  return (
                    <div
                      key={notif.id}
                      className={`noti-glass noti-card color-${color}`}
                      onClick={() => handleAction(notif)}
                    >
                      <div className="noti-icon-box">{icon}</div>
                      <div className="noti-body">
                        <div className="noti-text">
                          <strong>{notif.title || "Notification"}</strong>
                          <div className={`noti-desc-wrap ${isExpanded ? "expanded" : ""}`}>
                            {notif.subtitle && <p>{notif.subtitle}</p>}
                          </div>
                          {long && (
                            <button
                              className="noti-expand-btn"
                              onClick={(e) => toggleExpand(e, notif.id)}
                            >
                              {isExpanded ? "Show less" : "Read more"}
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                  transition: "transform 0.25s ease",
                                }}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <span className="noti-time">{timeAgo(notif.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Dashboard>
  );
}