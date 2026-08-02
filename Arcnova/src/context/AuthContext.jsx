import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // 🔥 Firestore data (bio, location, etc)
  const [userName, setUserName] = useState("Guest");
  const [avatarLetter, setAvatarLetter] = useState("G");
  const [loading, setLoading] = useState(true); // 🔥 Prevents UI flashing on refresh

  useEffect(() => {
    let unsubscribeFirestore;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Determine base name from Google or Email
        const baseName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "User");
        setUserName(baseName);
        setAvatarLetter(baseName.charAt(0).toUpperCase());

        // 🔥 NEW: Real-time Firestore profile listener
        const userRef = doc(db, "users", firebaseUser.uid);

        unsubscribeFirestore = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const firestoreData = docSnap.data();

            // Merge Firebase Auth user with Firestore data
            setUserProfile({ ...firebaseUser, ...firestoreData });

            // Prioritize Firestore display name if it exists
            if (firestoreData.displayName) {
              setUserName(firestoreData.displayName);
              setAvatarLetter(firestoreData.displayName.charAt(0).toUpperCase());
            }
          } else {
            // 🔥 NEW: Auto-create a profile document if it's their first login
            try {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: baseName,
                photoURL: firebaseUser.photoURL || null,
                createdAt: new Date(),
                role: "user", // Default role
              }, { merge: true });
            } catch (error) {
              console.error("Error creating user profile:", error);
            }
          }
          setLoading(false);
        });

      } else {
        // User is logged out
        if (unsubscribeFirestore) unsubscribeFirestore();
        setUser(null);
        setUserProfile(null);
        setUserName("Guest");
        setAvatarLetter("G");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Derived states for easier component logic
  const isAuthenticated = !!user;
  const isProUser = userProfile?.role === "pro" || userProfile?.isPro === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile, // Contains bio, location, role, etc.
        userName,
        avatarLetter,
        logout,
        loading,
        isAuthenticated,
        isProUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);