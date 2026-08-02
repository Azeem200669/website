// Sidebar.jsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { listenToFriendsList } from "../../services/friendService";
import "./Sidebar.css";

const NAV_MAIN = [
  { to: "/home", icon: "🏠", label: "Home" },
  { to: "/chats", icon: "💬", label: "Chats" },
  { to: "/search", icon: "🔍", label: "Search" },
  { to: "/communities", icon: "🪐", label: "Spaces" },
  { to: "/events", icon: "📅", label: "Events" },
  { to: "/notifications", icon: "🔔", label: "Notifications" },
];

const NAV_GROW = [
  { to: "/rewards", icon: "🎁", label: "Rewards" },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useUser();

  const [friendCount, setFriendCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  // Desktop: sidebar starts open. Mobile: sidebar starts closed.
  const [isOpen, setIsOpen] = useState(
    () => window.matchMedia("(min-width: 769px)").matches
  );
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 768px)").matches
  );

  const isActive = (path) => location.pathname === path;

  // Track viewport crossing the mobile breakpoint live (e.g. rotating a tablet)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Close the sidebar on navigation, but only on mobile — desktop users
  // expect the sidebar to stay open as they move between pages.
  useEffect(() => {
    if (isMobile) setIsOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenToFriendsList(user.uid, (friends) => {
      setFriendCount(friends.length);
      setOnlineCount(friends.filter(f => f.isOnline).length);
    });
    return () => unsub();
  }, [user?.uid]);

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        {isOpen ? "☰" : "☰"}
      </button>

      {/* Backdrop only makes sense on mobile, where the sidebar overlays
          content instead of pushing it — a permanent dark overlay behind
          a desktop sidebar would be intrusive. */}
      {isOpen && isMobile && (
        <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">🪐</span>
          <h2 className="logo-text">Orbit</h2>
        </div>

        <div className="sidebar-nav">
          <p className="nav-section-label">Main</p>
          <nav className="nav-group">
            {NAV_MAIN.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${isActive(item.to) ? "nav-link--active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.isFriend && friendCount > 0 && (
                  <span className="nav-friend-badge">
                    {onlineCount > 0 && <span className="nav-online-dot"></span>}
                    {friendCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="nav-divider" />

          <p className="nav-section-label">Grow</p>
          <nav className="nav-group">
            {NAV_GROW.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${isActive(item.to) ? "nav-link--active" : ""} ${item.highlight ? "nav-link--premium" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.highlight && <span className="nav-badge">PRO</span>}
              </Link>
            ))}
          </nav>

          <div className="nav-divider" />

          <p className="nav-section-label">Account</p>
          <nav className="nav-group">
            <Link
              to="/profile"
              className={`nav-link ${isActive("/profile") ? "nav-link--active" : ""}`}
            >
              <span className="nav-icon">👤</span>
              <span className="nav-label">Profile</span>
            </Link>
            <Link
              to="/settings"
              className={`nav-link ${isActive("/settings") ? "nav-link--active" : ""}`}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
}