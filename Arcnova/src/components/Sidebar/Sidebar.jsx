import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";
import ProfileModal from "../Profile/ProfileModal";
import SettingsModal from "../Settings/SettingsModal";

const Sidebar = ({ clearChat, toggleSidebar, activeChatId, onSelectChat }) => {
  const { user, userName, avatarLetter } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // 👈 ADDED STATE
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 🔥 NEW: Context Menu State
  const [contextMenu, setContextMenu] = useState(null); // { x, y, chat }

  const menuRef = useRef(null);

  // 1. Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. 🔥 NEW: Close context menu on global click or scroll
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  // 3. 🔥 REAL-TIME FIRESTORE LISTENER
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }

    const q = query(
      collection(db, "chats"),
      where("uid", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChats(userChats);
    }, (error) => {
      console.error("Error fetching real-time chats:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const logout = async () => {
    try {
      await signOut(auth);
      setOpenMenu(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // 🔥 NEW: Context Menu Actions
  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chat });
  };

  const handleDelete = async (chatId) => {
    try {
      await deleteDoc(doc(db, "chats", chatId));
      if (activeChatId === chatId) clearChat(); // Clear view if deleting active chat
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handlePin = async (chat) => {
    try {
      await updateDoc(doc(db, "chats", chat.id), {
        pinned: !chat.pinned // Toggle pin state
      });
    } catch (error) {
      console.error("Error pinning chat:", error);
    }
  };

  const handleRename = (chat) => {
    const newName = prompt("Enter new chat name:", chat.title);
    if (newName) {
      updateDoc(doc(db, "chats", chat.id), { title: newName });
    }
  };

  const handleShare = (chat) => {
    alert(`Sharing functionality for "${chat.title}" coming soon!`);
    // In the future: Generate a public read-only link here
  };

  // Helper to format dates for grouping
  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp.seconds * 1000);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWithin7Days = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp.seconds * 1000);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return date > sevenDaysAgo;
  };

  const filteredChats = chats.filter((chat) =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate Pinned chats
  const pinnedChats = filteredChats.filter((chat) => chat.pinned);
  const todayChats = filteredChats.filter((chat) => !chat.pinned && isToday(chat.updatedAt || chat.createdAt));
  const weekChats = filteredChats.filter((chat) => !chat.pinned && !isToday(chat.updatedAt || chat.createdAt) && isWithin7Days(chat.updatedAt || chat.createdAt));

  // Reusable Chat Button Component
  const ChatButton = ({ chat }) => (
    <button
      key={chat.id}
      onClick={() => onSelectChat(chat.id)}
      onContextMenu={(e) => handleContextMenu(e, chat)}
      className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeChatId === chat.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
        }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="truncate flex-1">{chat.title || "New Chat"}</span>
      {chat.pinned && <span className="text-yellow-400">📌</span>}
    </button>
  );

  return (
    <div className="flex h-screen w-72 flex-col justify-between border-r border-white/10 bg-white/5 backdrop-blur-2xl">

      {/* TOP SECTION */}
      <div className="flex flex-col h-full overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="logo" className="h-10 w-10 rounded-full border border-white/20 object-cover shadow-lg" />
            <h1 className="text-xl font-bold text-white">ArcNova</h1>
          </div>
          <button
            onClick={toggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 17l-5-5 5-5" />
              <path d="M18 17l-5-5 5-5" />
            </svg>
          </button>
        </div>

        {/* NEW CHAT & SEARCH */}
        <div className="space-y-3 p-4">
          <button
            onClick={clearChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 py-3 font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:bg-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-white/20"
            />
          </div>
        </div>

        {/* REAL-TIME HISTORY LIST */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
          {!user ? (
            <div className="mt-10 text-center text-sm text-gray-500">
              Please log in to save and view your chat history.
            </div>
          ) : chats.length === 0 ? (
            <div className="mt-10 text-center text-sm text-gray-500">
              No chats yet. Start a new conversation!
            </div>
          ) : (
            <>
              {/* PINNED CHATS */}
              {pinnedChats.length > 0 && (
                <>
                  <p className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-yellow-400/80">Pinned</p>
                  {pinnedChats.map((chat) => <ChatButton key={chat.id} chat={chat} />)}
                </>
              )}

              {/* TODAY CHATS */}
              {todayChats.length > 0 && (
                <>
                  <p className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-gray-500">Today</p>
                  {todayChats.map((chat) => <ChatButton key={chat.id} chat={chat} />)}
                </>
              )}

              {/* PREVIOUS 7 DAYS CHATS */}
              {weekChats.length > 0 && (
                <>
                  <p className="px-2 py-2 mt-4 text-xs font-medium uppercase tracking-wider text-gray-500">Previous 7 Days</p>
                  {weekChats.map((chat) => <ChatButton key={chat.id} chat={chat} />)}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="border-t border-white/10 p-4">

        {/* PROFILE & DROPDOWN */}
        <div className="relative" ref={menuRef}>
          <div
            onClick={() => setOpenMenu((prev) => !prev)}
            className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-lg font-bold text-white shadow-lg">
              {avatarLetter}
            </div>
            <div className="flex-1 overflow-hidden">
              <span className="block truncate font-semibold text-white">{userName}</span>
              <span className="block text-xs text-gray-400">{userName === "Guest" ? "Not logged in" : "Online"}</span>
            </div>
            {openMenu ? (
              <svg className="text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
            ) : (
              <svg className="text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            )}
          </div>

          {openMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]/95 shadow-2xl backdrop-blur-xl">
              <button
                onClick={() => { setShowProfile(true); setOpenMenu(false); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                Profile
              </button>

              {/* 👈 ADDED ONCLICK TO SETTINGS BUTTON */}
              <button
                onClick={() => { setShowSettings(true); setOpenMenu(false); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                Settings
              </button>

              {user && (
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 border-t border-white/5 px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🔥 NEW: RIGHT-CLICK CONTEXT MENU */}
      {contextMenu && (
        <div
          className="fixed z-50 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#0f172a]/95 py-1 shadow-2xl backdrop-blur-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} // Prevent immediate close
        >
          <button
            onClick={() => { handlePin(contextMenu.chat); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white"
          >
            📌 {contextMenu.chat.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => { handleRename(contextMenu.chat); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white"
          >
            ✏️ Rename
          </button>
          <button
            onClick={() => { handleShare(contextMenu.chat); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white"
          >
            🔗 Share
          </button>
          <div className="my-1 border-t border-white/10" />
          <button
            onClick={() => { handleDelete(contextMenu.chat.id); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
          >
            🗑️ Delete
          </button>
        </div>
      )}

      {/* 👈 ADDED SETTINGS MODAL RENDER */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default Sidebar;