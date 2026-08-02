import app from "./firebase";
import {
    getAuth,
    browserLocalPersistence,
    setPersistence,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";

let auth;

try {
    if (!app) {
        throw new Error(
            "Firebase app not initialized. Check your firebase config."
        );
    }

    auth = getAuth(app);

    setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.error("Persistence error:", err);
    });
} catch (error) {
    console.error("Failed to initialize Firebase Auth:", error.message);
    throw error;
}

/* ───────── AUTH HELPERS ───────── */

export const loginWithEmail = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
};

export const logoutUser = async () => {
    return signOut(auth);
};

export const listenToAuthChanges = (callback) => {
    return onAuthStateChanged(auth, callback);
};

export { auth };