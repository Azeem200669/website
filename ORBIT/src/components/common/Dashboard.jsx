import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Toast from './Toast';
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../contexts/ToastContext";
import { listenToNotifications } from "../../services/notificationService";
import { createOrGetChat } from "../../services/chatService";
import "./Dashboard.css";

export default function DashboardLayout({ children }) {
  const { user } = useUser();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Prevent spamming toasts for old notifications when the page first loads
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = listenToNotifications(user.uid, (notifs) => {
      // 1. Skip the very first load (existing notifications)
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      // 2. Find unread notifications
      const unreadNotifs = notifs.filter(n => !n.read);

      if (unreadNotifs.length > 0) {
        // We only show a toast for the absolute newest one to avoid spam
        const newest = unreadNotifs[0];

        addToast({
          title: newest.title,
          subtitle: newest.subtitle,
          type: newest.type,
          onClick: async () => {
            // Handle click action based on notification type
            if (newest.type === 'friend_accepted' && newest.fromUserId) {
              const chat = await createOrGetChat(user.uid, newest.fromUserId);
              navigate(`/chats?chatId=${chat.id}`);
            } else if (newest.type === 'friend_request' && newest.fromUserId) {
              navigate(`/profile/${newest.fromUserId}`);
            } else if (newest.actionUrl) {
              navigate(newest.actionUrl);
            }
          }
        });
      }
    });

    return () => unsub();
  }, [user?.uid, addToast, navigate]);

  return (
    <div className="dashboard">
      <Sidebar />

      {/* Offset for the fixed sidebar is handled responsively by the
          .content class in home.css / Sidebar.css — do NOT hardcode
          marginLeft here, it overrides the mobile media query. */}
      <div className="content">
        <Topbar />
        {children}
      </div>

      <Toast /> {/* ✅ Global Popups live here */}
    </div>
  );
}