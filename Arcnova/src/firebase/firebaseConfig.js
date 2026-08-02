import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFYf5Ky6K3ax7KGV-bfn5yI389ltgZpGE",
  authDomain: "chatbot-b579b.firebaseapp.com",
  projectId: "chatbot-b579b",
  appId: "1:122334696109:web:aab3500b6b5bae1993ec24",
};

const app = initializeApp(firebaseConfig);

// ✅ Auth
export const auth = getAuth(app);

// ✅ Firestore
export const db = getFirestore(app);