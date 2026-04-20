import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA3SKK1E0xO8SY0z_5pdOnq4Nktyf6kNKk",
  authDomain: "ll-finance.firebaseapp.com",
  projectId: "ll-finance",
  storageBucket: "ll-finance.firebasestorage.app",
  messagingSenderId: "52082535496",
  appId: "1:52082535496:web:d62e1267dfe19cdbe5bc7d",
  measurementId: "G-QH4TFTFM58"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);