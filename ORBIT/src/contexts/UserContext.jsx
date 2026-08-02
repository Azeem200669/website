// src/contexts/UserContext.jsx
import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { auth } from '../firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { setUserOnline, setUserOffline, updateHeartbeat } from '../services/userService';

const firestore = getFirestore();
const UserContext = createContext();

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const ONLINE_THRESHOLD  = 60000;  // 60 seconds — used by isUserOnline()

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ points: 0, gems: 0, streak: 0 });

  const unsubFirestoreRef = useRef(null);
  const unloadHandlerRef  = useRef(null);
  const currentUidRef     = useRef(null);
  const heartbeatRef      = useRef(null);

  // ✅ Start periodic heartbeat
  const startHeartbeat = (uid) => {
    stopHeartbeat();
    const beat = () => updateHeartbeat(uid).catch(console.error);
    beat(); // immediate first beat
    heartbeatRef.current = setInterval(beat, HEARTBEAT_INTERVAL);
  };

  // ✅ Stop heartbeat
  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  // ✅ Best-effort offline on close + safety net via lastSeen
  const setOfflineOnClose = (uid) => {
    // Attempt normal Firestore write (may not complete)
    setUserOffline(uid);
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (authUser) => {
      // ── Cleanup previous session ──
      if (unsubFirestoreRef.current) {
        unsubFirestoreRef.current();
        unsubFirestoreRef.current = null;
      }
      if (unloadHandlerRef.current) {
        window.removeEventListener('beforeunload', unloadHandlerRef.current);
        window.removeEventListener('pagehide', unloadHandlerRef.current);
        unloadHandlerRef.current = null;
      }
      stopHeartbeat();

      if (authUser) {
        // ── User signed in ──
        currentUidRef.current = authUser.uid;

        // Set online immediately
        setUserOnline(authUser.uid);

        // ✅ Start heartbeat (keeps lastSeen fresh)
        startHeartbeat(authUser.uid);

        // Best-effort offline on tab close / browser kill
        const handleUnload = () => setOfflineOnClose(authUser.uid);
        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('pagehide', handleUnload);
        unloadHandlerRef.current = handleUnload;

        // ✅ Handle visibility change (mobile minimize)
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') {
            updateHeartbeat(authUser.uid).catch(console.error);
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        // Realtime Firestore listener
        const userDocRef = doc(firestore, 'users', authUser.uid);
        unsubFirestoreRef.current = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              setUser({ ...userData, uid: authUser.uid });
              setStats({
                points: userData.points || 0,
                gems:   userData.gems   || 0,
                streak: userData.streak || 0,
              });
            }
          },
          (error) => {
            console.error("UserContext Firestore listener error:", error);
          }
        );

        // Store cleanup for visibility
        unloadHandlerRef.current = (eventName, handler) => {
          document.removeEventListener('visibilitychange', handleVisibility);
        };

      } else {
        // ── User signed out ──
        if (currentUidRef.current) {
          await setUserOffline(currentUidRef.current);
          currentUidRef.current = null;
        }
        stopHeartbeat();
        setUser(null);
        setStats({ points: 0, gems: 0, streak: 0 });
      }
    });

    return () => {
      unsubscribeAuth();
      stopHeartbeat();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, stats }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

// ✅ Helper: determine if a user is truly online
// Use this in any component that displays online status
export const isUserOnline = (userData) => {
  if (!userData) return false;
  if (userData.status !== 'online') return false;
  if (!userData.lastSeen) return false;

  try {
    const lastSeenMs = userData.lastSeen.toDate
      ? userData.lastSeen.toDate().getTime()
      : new Date(userData.lastSeen).getTime();
    return (Date.now() - lastSeenMs) < ONLINE_THRESHOLD;
  } catch {
    return false;
  }
};