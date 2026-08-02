import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Home from "./pages/home/Home";
import Chat from "./pages/chats/Chat";
import Search from "./pages/search/Search";
import Communities from "./pages/communities/Communities";
import Events from "./pages/events/Events";
import Notifications from "./pages/notifications/Notifications";
import Profile from "./pages/profile/Profile";
import Settings from "./pages/settings/Settings";
import SpaceDetail from "./pages/SpaceDetail/SpaceDetail";
import Reward from "./pages/rewards/Reward";
import Friends from "./pages/friends/Friends";
// Owner Pages
import OwnerLayout from "./owner/OwnerLayout";
import Dashboard from "./owner/Dashboard";
import UserManagement from "./owner/UserManagement";

// Future Pages
import ReportsManagement from "./owner/ReportsManagement";
import CommunityManagement from "./owner/CommunityManagement";
import EventManagement from "./owner/EventManagement";
import RewardsManagement from "./owner/RewardsManagement";
import NotificationManagement from "./owner/NotificationManagement";
import BadgeManagement from "./owner/BadgeManagement";
// import Analytics from "./owner/Analytics";

// ─── Protection Wrapper ───────────────────────
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route path="/" element={<Login />} />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* Main App */}
        <Route
          path="/home"
          element={<Home />}
        />

        <Route
          path="/chats"
          element={<Chat />}
        />

        <Route
          path="/search"
          element={<Search />}
        />

        <Route
          path="/communities"
          element={<Communities />}
        />

        <Route
          path="/events"
          element={<Events />}
        />

        <Route
          path="/rewards"
          element={<Reward />}
        />

        <Route
          path="/friends"
          element={<Friends />}
        />

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/profile/:uid"
          element={<Profile />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/spaces/:spaceId"
          element={<SpaceDetail />}
        />

        {/* Owner Panel */}
        <Route
          path="/owner"
          element={<OwnerLayout />}
        >
          {/* Dashboard */}
          <Route
            index
            element={<Dashboard />}
          />

          {/* Users */}
          <Route
            path="users"
            element={<UserManagement />}
          />

          {/* Reports */}
          <Route
            path="reports"
            element={<ReportsManagement />}
          />

          {/* Communities */}
          <Route
            path="communities"
            element={<CommunityManagement />}
          />

          {/*Events*/}
          <Route
            path="events"
            element={<EventManagement />}
          />

          {/*Rewards*/}
          <Route
            path="rewards"
            element={<RewardsManagement />}
          />

          {/*Notifications*/}
          <Route
            path="notifications"
            element={<NotificationManagement />}
          />
          {/*Badges*/}
          <Route
            path="badges"
            element={<BadgeManagement />}
          />

          {/* <Route
            path="analytics"
            element={<Analytics />}
          /> */}

        </Route>
      </Routes>
    </BrowserRouter>
  );
}