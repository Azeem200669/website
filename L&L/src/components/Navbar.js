import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();

  const links = [
    { label: "Home",          path: "/",          icon: "🏠" },
    { label: "Add Entry",     path: "/add",        icon: "➕" },
    { label: "Worker Salary", path: "/salary",     icon: "👷" },
    { label: "Daily Income",  path: "/income",     icon: "💰" },
    { label: "Dashboard",     path: "/dashboard",  icon: "📊" },
  ];

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="navbar">
        <div className="brand">L & L</div>

        {/* Desktop links — hidden on mobile via CSS */}
        <div className="nav-links">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={location.pathname === link.path ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="bottom-nav">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={location.pathname === link.path ? "active" : ""}
          >
            <span className="nav-icon">{link.icon}</span>
            {link.label === "Worker Salary" ? "Workers" :
             link.label === "Daily Income"  ? "Income"  :
             link.label === "Add Entry"     ? "Add"     :
             link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}