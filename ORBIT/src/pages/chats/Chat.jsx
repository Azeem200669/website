import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom"; // ✅ Import useLocation
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import {
  listenToUserChats,
  listenToChatMessages,
  sendMessage,
  pinChat,
  markChatAsRead,
  clearChat,
  deleteChat,
  editMessage,
  deleteMessage,
  pinMessage,
  createOrGetChat // ✅ Import the new function
} from "../../services/chatService";
import { awardPoints } from "../../services/rewardService";
import { listenToUser, listenToUserStatus } from "../../services/userService";
import { listenToIncomingRequests, acceptFriendRequest, declineFriendRequest } from "../../services/friendService";
import { db } from "../../firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import "./chat.css";

export default function Chat() {
  const { user } = useUser();
  const location = useLocation(); // ✅ Get location state
  const currentUserUid = user?.uid || "dummy_uid";

  const [chats, setChats] = useState([]);
  const [chatUsers, setChatUsers] = useState({});
  const [userStatuses, setUserStatuses] = useState({});
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChatData, setSelectedChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);

  const [activeMsg, setActiveMsg] = useState(null);
  const [msgMenuPos, setMsgMenuPos] = useState({ x: 0, y: 0 });

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false); // ✅ Prevent multiple triggers
  const [sidebarOpen, setSidebarOpen] = useState(true); // ✅ Mobile: controls chat list overlay

  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const longPressTimer = useRef(null);

  // ─── Close menus on outside click ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
        setActiveMsg(null);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // ─── Listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUserUid || currentUserUid === "dummy_uid") return;
    const unsubscribe = listenToUserChats(currentUserUid, async (updatedChats) => {
      setChats(updatedChats);
      const usersData = {};
      for (let chat of updatedChats) {
        const otherUserId = chat.members?.find(id => id !== currentUserUid);
        if (otherUserId && !usersData[otherUserId]) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) usersData[otherUserId] = userDoc.data();
        }
      }
      setChatUsers(prev => ({ ...prev, ...usersData }));
    });
    return () => unsubscribe();
  }, [currentUserUid]);

  useEffect(() => {
    if (chats.length === 0) return;
    const unsubs = [];
    const seenIds = new Set();
    chats.forEach((chat) => {
      const otherUserId = chat.members?.find(id => id !== currentUserUid);
      if (!otherUserId || seenIds.has(otherUserId)) return;
      seenIds.add(otherUserId);
      const unsub = listenToUserStatus(otherUserId, (status) => {
        setUserStatuses(prev => ({ ...prev, [otherUserId]: status }));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(unsub => unsub());
  }, [chats, currentUserUid]);


  useEffect(() => {
    if (!selectedChatId) return;
    const unsubscribe = listenToChatMessages(selectedChatId, (updatedMessages) => setMessages(updatedMessages));
    return () => unsubscribe();
  }, [selectedChatId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!currentUserUid || currentUserUid === "dummy_uid") return;
    const unsub = listenToIncomingRequests(currentUserUid, (requests) => {
      setFriendRequests(requests);
      const fetchRequesterProfiles = async () => {
        const usersData = {};
        for (let req of requests) {
          if (!chatUsers[req.from]) {
            const userDoc = await getDoc(doc(db, 'users', req.from));
            if (userDoc.exists()) usersData[req.from] = userDoc.data();
          }
        }
        if (Object.keys(usersData).length > 0) setChatUsers(prev => ({ ...prev, ...usersData }));
      };
      fetchRequesterProfiles();
    });
    return () => unsub();
  }, [currentUserUid]);

  // ✅ Auto-Open Chat from Home Page Active Friends
  useEffect(() => {
    const targetUserId = location.state?.targetUserId;

    if (targetUserId && currentUserUid && currentUserUid !== "dummy_uid" && !isStartingChat) {
      const startChat = async () => {
        setIsStartingChat(true);
        try {
          // Find existing chat or create a new one
          const chatId = await createOrGetChat(currentUserUid, targetUserId);

          // Fetch the target user's data for the header
          const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
          const targetUserData = targetUserDoc.exists() ? targetUserDoc.data() : {};

          // Set active chat
          setSelectedChatId(chatId);
          setSelectedChatData({ ...targetUserData, uid: targetUserId });

          // Clear the navigation state so it doesn't trigger again on refresh
          window.history.replaceState({}, document.title);
        } catch (error) {
          console.error("Error starting chat:", error);
        } finally {
          setIsStartingChat(false);
        }
      };

      startChat();
    }
  }, [location.state, currentUserUid]);

  // ─── Handlers ────────────────────────────────────────────
  const handleSelectChat = (chatId, otherUserData, otherUserId) => {
    setSelectedChatId(chatId);
    setSelectedChatData({ ...otherUserData, uid: otherUserId });
    setOpenMenuId(null);
    setSidebarOpen(false); // ✅ Mobile: hide list, show conversation
    markChatAsRead(chatId, currentUserUid).catch(console.error);
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !selectedChatId) return;
    try {
      await sendMessage(selectedChatId, currentUserUid, newMessage, selectedChatData?.uid);
      await awardPoints(currentUserUid, 5);
      setNewMessage("");
    } catch (error) { console.error("Failed to send message:", error); }
  };

  const handlePin = (chatId, isCurrentlyPinned) => { pinChat(chatId, currentUserUid, !isCurrentlyPinned); setOpenMenuId(null); };
  const handleBackToList = () => setSidebarOpen(true); // ✅ Mobile: back to chat list
  const handleClear = async (chatId) => { if (window.confirm("Clear all messages?")) { try { await clearChat(chatId, currentUserUid); setMessages([]); } catch (err) { console.error(err); } } setOpenMenuId(null); };
  const handleDeleteChat = async (chatId) => { if (window.confirm("Delete this chat?")) { try { await deleteChat(chatId, currentUserUid); setSelectedChatId(null); setSelectedChatData(null); } catch (err) { console.error(err); } } setOpenMenuId(null); };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setActiveMsg(msg);
    setMsgMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (e, msg) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setActiveMsg(msg);
      setMsgMenuPos({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleCopy = (text) => { navigator.clipboard.writeText(text); setActiveMsg(null); };

  const handleEditSubmit = async (msgId) => {
    if (!editText.trim()) return;
    await editMessage(selectedChatId, msgId, editText);
    setEditingId(null);
    setEditText("");
  };

  const handleDeleteMsg = async (msgId) => {
    await deleteMessage(selectedChatId, msgId);
    setActiveMsg(null);
  };

  const handlePinMsg = async (msg) => {
    const isCurrentlyPinned = selectedChatData?.pinnedMessage?.id === msg.id;
    await pinMessage(selectedChatId, isCurrentlyPinned ? null : { id: msg.id, text: msg.text, senderId: msg.senderId });
    setActiveMsg(null);
  };

  // ─── Helpers ─────────────────────────────────────────────
  const filteredChats = chats.filter((chat) => {
    const otherUserId = chat.members?.find(id => id !== currentUserUid);
    const otherUser = chatUsers[otherUserId];
    return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedChats = [...filteredChats].sort((a, b) => {
    const aPinned = a.pinnedBy?.[currentUserUid] ? 1 : 0;
    const bPinned = b.pinnedBy?.[currentUserUid] ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return (b.lastMessageTime?.toMillis() || 0) - (a.lastMessageTime?.toMillis() || 0);
  });

  const getStatusDot = (userId) => ({ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", backgroundColor: userStatuses[userId]?.isOnline ? "#22c55e" : "#6b7280", border: "2px solid #1e1b2e" });

  const pinnedMsg = chats.find(c => c.id === selectedChatId)?.pinnedMessage;

  return (
    <Dashboard>
      <div className={`chat-overlay ${sidebarOpen ? "active" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className="chat-page">
        {/* ── Chat Sidebar ── */}
        <div className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
          <h2>Chats</h2>
          <input type="text" placeholder="Search chats..." className="chat-search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />

          {friendRequests.length > 0 && (
            <div className="friend-requests-section">
              <h3>Friend Requests ({friendRequests.length})</h3>
              {friendRequests.map((req) => {
                const requester = chatUsers[req.from] || {};
                return (
                  <div key={req.id} className="friend-request-item">
                    <div className="request-user-info">
                      <img src={requester.avatar || `https://ui-avatars.com/api/?name=${requester.name || 'U'}&background=7c3aed&color=fff`} alt={requester.name} />
                      <div><h4>{requester.name || "Unknown"}</h4><p className="orbit-id-text">wants to connect</p></div>
                    </div>
                    <div className="request-actions">
                      <button className="action-btn add-friend-btn" onClick={() => acceptFriendRequest(req.id, req.from, currentUserUid)}>✓</button>
                      <button className="action-btn cancel-btn" onClick={() => declineFriendRequest(req.id)}>✗</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sortedChats.map((chat) => {
            const otherUserId = chat.members?.find(id => id !== currentUserUid);
            const otherUser = chatUsers[otherUserId] || {};
            const isOnline = userStatuses[otherUserId]?.isOnline || false;
            const isPinned = chat.pinnedBy?.[currentUserUid] || false;
            const unreadCount = chat.unreadCount?.[currentUserUid] || 0;

            return (
              <div key={chat.id} className={`chat-user ${selectedChatId === chat.id ? "active" : ""}`} onClick={() => handleSelectChat(chat.id, otherUser, otherUserId)} style={{ position: 'relative' }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.name || 'U'}&background=7c3aed&color=fff`} alt={otherUser.name} />
                  <span style={getStatusDot(otherUserId)} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isPinned && "📌 "}{otherUser.name || "Orbit User"}</h4>
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === chat.id ? null : chat.id); }} className="chat-menu-btn">⋮</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, color: isOnline ? "#22c55e" : "#94a3b8", fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>{isOnline ? "Online" : (chat.lastMessage || "Offline")}</p>
                    {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                  </div>
                </div>

                {openMenuId === chat.id && (
                  <div ref={menuRef} onClick={(e) => e.stopPropagation()} className="dropdown-menu">
                    <MenuItem label={isPinned ? "Unpin Chat" : "Pin Chat"} onClick={() => handlePin(chat.id, isPinned)} />
                    <MenuItem label="Mark as Read" onClick={() => { markChatAsRead(chat.id, currentUserUid); setOpenMenuId(null); }} />
                    <MenuItem label="Clear Chat" onClick={() => handleClear(chat.id)} color="#f97316" />
                    <MenuItem label="Delete Chat" onClick={() => handleDeleteChat(chat.id)} color="#ef4444" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Messages Window ── */}
        <div className="chat-window">
          {!selectedChatId ? (
            <div className="empty-chat-state" style={{ flexDirection: "column", gap: "16px" }}>
              {!sidebarOpen && (
                <button className="chat-mobile-toggle" onClick={() => setSidebarOpen(true)}>
                  ☰
                </button>
              )}
              <h2>Select a chat to start messaging</h2>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <button className="chat-back-btn" onClick={handleBackToList} aria-label="Back to chats">
                  ←
                </button>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img src={selectedChatData?.avatar || `https://ui-avatars.com/api/?name=${selectedChatData?.name || 'U'}&background=7c3aed&color=fff`} alt="" />
                  <span style={getStatusDot(selectedChatData?.uid)} />
                </div>
                <div>
                  <h3>{selectedChatData?.name || "Orbit User"}</h3>
                  <span style={{ color: userStatuses[selectedChatData?.uid]?.isOnline ? "#22c55e" : "#6b7280", fontSize: "0.8rem" }}>{userStatuses[selectedChatData?.uid]?.isOnline ? "Online" : "Offline"}</span>
                </div>
              </div>

              {pinnedMsg && (
                <div className="pinned-message-banner">
                  <span>📌 {pinnedMsg.text}</span>
                  <button onClick={() => pinMessage(selectedChatId, null)}>✕</button>
                </div>
              )}

              <div className="messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`message-row ${msg.senderId === currentUserUid ? "sent" : "received"}`}>

                    {editingId === msg.id ? (
                      <div className="edit-container">
                        <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit(msg.id)} autoFocus />
                        <button onClick={() => handleEditSubmit(msg.id)} className="edit-save-btn">Save</button>
                        <button onClick={() => setEditingId(null)} className="edit-cancel-btn">Cancel</button>
                      </div>
                    ) : (
                      <div
                        className="message-bubble"
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                        onTouchStart={(e) => handleTouchStart(e, msg)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                      >
                        {msg.text}
                        {msg.edited && <span className="edited-tag"> (edited)</span>}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {activeMsg && (
                <div
                  ref={menuRef}
                  className="context-menu"
                  style={{ top: `${msgMenuPos.y}px`, left: `${msgMenuPos.x}px` }}
                >
                  {activeMsg.senderId === currentUserUid && <MenuItem label="✏️ Edit" onClick={() => { setEditingId(activeMsg.id); setEditText(activeMsg.text); setActiveMsg(null); }} />}
                  <MenuItem label="📋 Copy" onClick={() => handleCopy(activeMsg.text)} />
                  <MenuItem label="📌 Pin" onClick={() => handlePinMsg(activeMsg)} />
                  {activeMsg.senderId === currentUserUid && <MenuItem label="🗑️ Delete" onClick={() => handleDeleteMsg(activeMsg.id)} color="#ef4444" />}
                </div>
              )}

              <div className="chat-input">
                <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} />
                <button onClick={handleSendMessage}>➤</button>
              </div>
            </>
          )}
        </div>
      </div>
    </Dashboard>
  );
}

function MenuItem({ label, onClick, color = "#e2e8f0" }) {
  return (
    <div onClick={onClick} className="menu-item" style={{ color }}>
      {label}
    </div>
  );
}