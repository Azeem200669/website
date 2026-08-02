import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyB6H9KZM_MVIR6rcbMmmy9plf6nSXZjOAE",
  authDomain: "orbit-e4c86.firebaseapp.com",
  projectId: "orbit-e4c86",
  storageBucket: "orbit-e4c86.firebasestorage.app",
  messagingSenderId: "794269965762",
  appId: "1:794269965762:web:b81e12ba8dc7cd79db4a5b",
  measurementId: "G-70QS813ZDB"
};
// Validate config exists
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  throw new Error(
    `Missing Firebase config keys: ${missingKeys.join(", ")}\n` +
    "Check your .env file"
  );
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
export default app;