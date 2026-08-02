import { useState, useEffect } from "react";
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { auth } from "../../firebase/auth";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../components/common/Dashboard";
import { setUserOffline } from "../../services/userService"; // ✅ added
import "./settings.css";

const db = getFirestore();

export default function Settings() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const [pushNotifs, setPushNotifs] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Load saved preferences from Firestore ──
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "userSettings", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.emailNotifs !== undefined) setEmailNotifs(d.emailNotifs);
          if (d.messageNotifs !== undefined) setMessageNotifs(d.messageNotifs);
          if (d.privateAccount !== undefined) setPrivateAccount(d.privateAccount);
          if (d.onlineStatus !== undefined) setOnlineStatus(d.onlineStatus);
          if (d.readReceipts !== undefined) setReadReceipts(d.readReceipts);
          if (d.pushNotifs !== undefined) setPushNotifs(d.pushNotifs);
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [user]);

  // ── Save a single key to Firestore ──
  const save = async (key, value) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "userSettings", user.uid), { [key]: value }, { merge: true });
    } catch (e) { console.error(e); }
  };

  // ── Toast helper ──
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Handlers ──
  const handleThemeToggle = () => {
    const next = !darkMode;
    setDarkMode(next);
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    showToast(`${next ? "Dark" : "Light"} mode enabled`);
  };

  const handlePushNotifs = async () => {
    if (!pushNotifs) {
      if (!("Notification" in window)) {
        showToast("Notifications not supported in this browser", "error");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushNotifs(true);
        save("pushNotifs", true);
        showToast("Push notifications enabled");
        new Notification("Notifications enabled!", { body: "You'll now receive push notifications." });
      } else {
        showToast("Permission denied by browser", "error");
      }
    } else {
      setPushNotifs(false);
      save("pushNotifs", false);
      showToast("Push notifications disabled");
    }
  };

  const handleToggle = (key, current, setter) => {
    const next = !current;
    setter(next);
    save(key, next);
    showToast("Preference saved");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordModal(false);
      showToast(`Reset email sent to ${user.email}`);
    } catch {
      showToast("Failed to send reset email", "error");
    }
  };

  // ✅ Set user offline BEFORE signing out so Firestore write is still authenticated
  const handleLogout = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (uid) await setUserOffline(uid);
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Failed to log out", "error");
    }
  };

  return (
    <Dashboard>
      <div className="settings-container">

        <div className="settings-header">
          <h1>⚙️ Settings</h1>
          <p>Manage your account preferences</p>
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <div className="section-label">Notifications</div>
          <div className="settings-card">
            <SettingRow icon="🔔" title="Push Notifications" desc="Receive notifications on this device"
              checked={pushNotifs} onChange={handlePushNotifs} />
            <div className="divider" />
            <SettingRow icon="📧" title="Email Notifications" desc="Get updates sent to your email"
              checked={emailNotifs} onChange={() => handleToggle("emailNotifs", emailNotifs, setEmailNotifs)} />
            <div className="divider" />
            <SettingRow icon="💬" title="Message Notifications" desc="Notify me when I receive a message"
              checked={messageNotifs} onChange={() => handleToggle("messageNotifs", messageNotifs, setMessageNotifs)} />
          </div>
        </div>

        {/* Privacy */}
        <div className="settings-section">
          <div className="section-label">Privacy</div>
          <div className="settings-card">
            <SettingRow icon="🔒" title="Private Account" desc="Only approved followers can see your posts"
              checked={privateAccount} onChange={() => handleToggle("privateAccount", privateAccount, setPrivateAccount)} />
            <div className="divider" />
            <SettingRow icon="🟢" title="Show Online Status" desc="Let others see when you're active"
              checked={onlineStatus} onChange={() => handleToggle("onlineStatus", onlineStatus, setOnlineStatus)} />
            <div className="divider" />
            <SettingRow icon="✅" title="Read Receipts" desc="Show when you've read messages"
              checked={readReceipts} onChange={() => handleToggle("readReceipts", readReceipts, setReadReceipts)} />
          </div>
        </div>

        {/* Account */}
        <div className="settings-section">
          <div className="section-label">Account</div>
          <div className="settings-card">
            <button className="settings-action-row" onClick={() => navigate("/profile")}>
              <span className="action-icon">👤</span>
              <div className="action-text">
                <span className="action-title">Edit Profile</span>
                <span className="action-desc">Update your name, bio and photo</span>
              </div>
              <span className="action-arrow">›</span>
            </button>
            <div className="divider" />
            <button className="settings-action-row" onClick={() => setPasswordModal(true)}>
              <span className="action-icon">🔑</span>
              <div className="action-text">
                <span className="action-title">Change Password</span>
                <span className="action-desc">Send a password reset link to your email</span>
              </div>
              <span className="action-arrow">›</span>
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="settings-section">
          <div className="settings-card">
            <button className="logout-btn" onClick={() => setLogoutModal(true)}>
              🚪 Log Out
            </button>
          </div>
        </div>

      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* ── Logout Modal ── */}
      {logoutModal && (
        <div className="modal-overlay" onClick={() => setLogoutModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">🚪</div>
            <h2>Log Out?</h2>
            <p>Are you sure you want to log out of your account?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setLogoutModal(false)}>Cancel</button>
              <button className="modal-confirm" onClick={handleLogout}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {passwordModal && (
        <div className="modal-overlay" onClick={() => setPasswordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">🔑</div>
            <h2>Change Password</h2>
            <p>We'll send a password reset link to <strong>{user?.email}</strong></p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setPasswordModal(false)}>Cancel</button>
              <button className="modal-confirm" onClick={handlePasswordReset}>Send Link</button>
            </div>
          </div>
        </div>
      )}

    </Dashboard>
  );
}

function SettingRow({ icon, title, desc, checked, onChange }) {
  return (
    <div className="setting-row">
      <span className="setting-icon">{icon}</span>
      <div className="setting-text">
        <span className="setting-title">{title}</span>
        <span className="setting-desc">{desc}</span>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="slider" />
      </label>
    </div>
  );
}