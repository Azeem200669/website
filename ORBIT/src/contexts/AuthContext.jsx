import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firestore";

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));

        if (userSnap.exists()) {
          const data = userSnap.data();

          // 🚨 BAN CHECK: Sign out AND set flag for Login page
          if (data.banned) {
            sessionStorage.setItem("account_banned", "true"); // ← Flag for Login.jsx
            await auth.signOut();
            setUser(null);
            setUserData(null);
            setLoading(false);
            return;
          }

          setUserData(data);
        }

        setUser(currentUser);
      } catch (err) {
        console.error("Auth context fetch error:", err);
        setUser(currentUser);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}