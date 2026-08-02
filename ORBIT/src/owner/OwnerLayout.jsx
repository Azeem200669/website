import { NavLink, Outlet } from "react-router-dom";
import "./OwnerLayout.css";

export default function OwnerLayout() {
    return (
        <div className="owner-layout">
            <aside className="owner-sidebar">
                <div className="owner-logo">
                    <h2>🚀 Orbit</h2>
                    <span>Owner Panel</span>
                </div>

                <nav>
                    <NavLink to="/owner" end>
                        📊 Dashboard
                    </NavLink>

                    <NavLink to="/owner/users">
                        👥 Users
                    </NavLink>

                    <NavLink to="/owner/reports">
                        🚩 Reports
                    </NavLink>

                    <NavLink to="/owner/communities">
                        🏠 Communities
                    </NavLink>

                    <NavLink to="/owner/events">
                        📅 Events
                    </NavLink>

                    <NavLink to="/owner/rewards">
                        🎁 Rewards
                    </NavLink>

                    <NavLink to="/owner/notifications">
                        🔔 Notifications
                    </NavLink>

                    <NavLink to="/owner/badges">
                        🏅 Badges
                    </NavLink>

                    <NavLink to="/owner/analytics">
                        📈 Analytics
                    </NavLink>
                </nav>
            </aside>

            <main className="owner-content">
                <Outlet />
            </main>
        </div>
    );
}