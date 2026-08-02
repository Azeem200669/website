import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import { db } from "../../firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import {
  listenToSpace,
  listenToSpaceMessages,
  sendSpaceMessage,
  leaveSpace,
  uploadSpaceChatImage,
  updateSpaceMessage,
  deleteSpaceMessage,
  togglePinMessage
} from "../../services/spaceService";
import "./spaceDetail.css";

export default function SpaceDetail() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const currentUserUid = user?.uid;

  const [space, setSpace] = useState(null);
  const [messages, setMessages] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // ✅ New States
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 }); // Tracks mouse/finger position
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [readMessages, setReadMessages] = useState({});

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const longPressTimer = useRef(null); // ✅ Timer for mobile long-press

  // Fetch Data...
  useEffect(() => {
    if (!spaceId) return;
    const unsub = listenToSpace(spaceId, (data) => setSpace(data));
    return () => unsub();
  }, [spaceId]);

  useEffect(() => {
    if (!spaceId) return;
    const unsub = listenToSpaceMessages(spaceId, (msgs) => setMessages(msgs));
    return () => unsub();
  }, [spaceId]);

  // ✅ Close menu on normal click or scroll
  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  // Fetch Members...
  useEffect(() => {
    if (!space?.members) return;
    const fetchMembers = async () => {
      const profiles = {};
      for (let uid of space.members) {
        if (!memberProfiles[uid]) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) profiles[uid] = userDoc.data();
        }
      }
      if (Object.keys(profiles).length > 0) setMemberProfiles(prev => ({ ...prev, ...profiles }));
    };
    fetchMembers();
  }, [space?.members]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ─── Native Event Handlers ───────────────────

  // Desktop: Right-Click
  const handleContextMenu = (e, msgId) => {
    e.preventDefault(); // Block default browser menu
    setMenuPos({ x: e.clientX, y: e.clientY });
    setActiveMenu(msgId);
  };

  // Mobile: Long Press Start
  const handleTouchStart = (e, msgId) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setMenuPos({ x: touch.clientX, y: touch.clientY });
      setActiveMenu(msgId);
    }, 500); // 500ms hold triggers menu
  };

  // Mobile: Long Press Cancel (if they swipe/let go early)
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // ─── Action Handlers ─────────────────────────

  const handleSend = async (e) => {
    e.preventDefault();
    if (editingId) {
      try {
        await updateSpaceMessage(spaceId, editingId, editText);
        setEditingId(null);
        setEditText("");
      } catch (err) { console.error(err); }
      return;
    }
    if (!newMessage.trim() && !chatImage) return;
    setSending(true);
    try {
      let imageUrl = null;
      if (chatImage) imageUrl = await uploadSpaceChatImage(currentUserUid, chatImage);
      await sendSpaceMessage(spaceId, currentUserUid, newMessage, imageUrl);
      setNewMessage("");
      setChatImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const handleCopy = async (msg) => {
    let textToCopy = msg.text || "";
    if (msg.imageUrl) textToCopy += ` ${msg.imageUrl}`;
    await navigator.clipboard.writeText(textToCopy.trim());
    setActiveMenu(null);
  };

  const handleEditStart = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
    setActiveMenu(null);
  };

  const handleDelete = async (msgId) => {
    if (window.confirm("Delete this message?")) {
      try { await deleteSpaceMessage(spaceId, msgId); } catch (err) { console.error(err); }
    }
    setActiveMenu(null);
  };

  const handlePin = async (msgId, isPinned) => {
    try { await togglePinMessage(spaceId, msgId, isPinned); } catch (err) { console.error(err); }
    setActiveMenu(null);
  };

  const handleMarkRead = (msgId) => {
    setReadMessages(prev => ({ ...prev, [msgId]: !prev[msgId] }));
    setActiveMenu(null);
  };

  const handleLeaveSpace = async () => {
    if (window.confirm("Are you sure you want to leave this Space?")) {
      try { await leaveSpace(spaceId, currentUserUid); navigate("/communities"); } catch (err) { console.error(err); }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!space) return <Dashboard><div className="loading-space">Loading Space...</div></Dashboard>;

  return (
    <Dashboard>
      <div className="space-chat-container">
        <div className="space-chat-header">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <div className="space-avatar small">
            {space.avatar ? <img src={space.avatar} alt={space.name} /> : space.name?.charAt(0)}
          </div>
          <div className="header-info" onClick={() => setShowInfo(!showInfo)} style={{ cursor: 'pointer' }}>
            <h3>{space.name}</h3>
            <p>{space.memberCount} Members</p>
          </div>
          <button className="info-btn" onClick={() => setShowInfo(!showInfo)}>ℹ</button>
        </div>

        <div className="space-chat-body">
          <div className="space-messages">
            {messages.map(msg => {
              const isMine = msg.senderId === currentUserUid;
              const sender = memberProfiles[msg.senderId];
              const isActive = activeMenu === msg.id;
              const isEditing = editingId === msg.id;

              return (
                // ✅ Attach native events to the message wrapper
                <div
                  key={msg.id}
                  className={`space-msg ${isMine ? 'mine' : 'other'} ${readMessages[msg.id] ? 'read-msg' : ''}`}
                  onContextMenu={(e) => handleContextMenu(e, msg.id)}
                  onTouchStart={(e) => handleTouchStart(e, msg.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd} // Cancel long press if they scroll
                >
                  {!isMine && <span className="msg-sender">{sender?.name || "Unknown"}</span>}

                  <div className="msg-bubble">
                    {msg.pinned && <div className="pin-indicator">📌 Pinned</div>}

                    {isEditing ? (
                      <form onSubmit={handleSend} className="edit-msg-form">
                        <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus className="edit-msg-input" />
                        <div className="edit-msg-actions">
                          <button type="button" onClick={() => { setEditingId(null); setEditText(""); }}>Cancel</button>
                          <button type="submit">Save</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {msg.imageUrl && (
                          <div className="msg-image-wrapper">
                            <img src={msg.imageUrl} alt="Shared" className="msg-image" />
                          </div>
                        )}
                        {msg.text && <p>{msg.text}</p>}
                      </>
                    )}

                    <span className="msg-time">
                      {formatTime(msg.timestamp)}
                      {msg.edited && <span className="edited-tag"> (edited)</span>}
                    </span>
                  </div>

                  {/* ✅ Floating Context Menu */}
                  {isActive && (
                    <div
                      className="msg-context-menu"
                      style={{ top: menuPos.y, left: menuPos.x }}
                      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                      <button onClick={() => handleCopy(msg)}>📋 Copy</button>
                      {isMine && <button onClick={() => handleEditStart(msg)}>✏️ Edit</button>}
                      {isMine && <button onClick={() => handlePin(msg.id, msg.pinned)}>
                        {msg.pinned ? "📌 Unpin" : "📌 Pin"}
                      </button>}
                      <button onClick={() => handleMarkRead(msg.id)}>
                        {readMessages[msg.id] ? "👁️ Unread" : "✅ Mark as read"}
                      </button>
                      {isMine && <button className="danger" onClick={() => handleDelete(msg.id)}>🗑️ Delete</button>}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Side Info Panel (Unchanged) */}
          {showInfo && (
            <div className="space-info-panel">
              <div className="info-avatar">
                {space.avatar ? <img src={space.avatar} alt={space.name} /> : space.name?.charAt(0)}
              </div>
              <h2>{space.name}</h2>
              <p className="info-desc">{space.description}</p>
              <div className="info-section">
                <h4>{space.memberCount} Members</h4>
                {space.members.map(uid => (
                  <div key={uid} className="info-member">
                    <img src={memberProfiles[uid]?.avatar || `https://ui-avatars.com/api/?name=${memberProfiles[uid]?.name || 'U'}&background=7c3aed&color=fff`} alt="" />
                    <span>{memberProfiles[uid]?.name || "Loading..."} {uid === space.createdBy && " 👑"}</span>
                  </div>
                ))}
              </div>
              {space.createdBy !== currentUserUid && (
                <button className="leave-space-btn" onClick={handleLeaveSpace}>Leave Space</button>
              )}
            </div>
          )}
        </div>

        <form className="space-chat-input" onSubmit={handleSend}>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setChatImage(e.target.files[0])} />
          <button type="button" className="attach-btn" onClick={() => fileInputRef.current.click()}>📎</button>
          <div className="input-main">
            {chatImage && (
              <div className="image-preview-bar">
                <img src={URL.createObjectURL(chatImage)} alt="Preview" />
                <button type="button" className="remove-img-btn" onClick={() => { setChatImage(null); fileInputRef.current.value = ""; }}>✕</button>
              </div>
            )}
            <input
              type="text"
              placeholder={editingId ? "Edit message..." : "Message this Space..."}
              value={editingId ? editText : newMessage}
              onChange={(e) => editingId ? setEditText(e.target.value) : setNewMessage(e.target.value)}
            />
          </div>
          <button type="submit" className="send-btn" disabled={sending}>
            {sending ? '...' : editingId ? '✓' : '➤'}
          </button>
        </form>
      </div>
    </Dashboard>
  );
}