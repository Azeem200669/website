import { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { getAIResponse } from "../services/llm/index";

export const useChat = () => {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null); // 🔥 Tracks active chat

  // Initialize from localStorage to persist limit across refreshes
  const [responseCount, setResponseCount] = useState(() => {
    return Number(localStorage.getItem("guestResponseCount")) || 0;
  });

  // Save guest response count to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem("guestResponseCount", responseCount.toString());
    }
  }, [responseCount, user]);

  // Load initial state on login/logout
  useEffect(() => {
    if (user) {
      // Logged in: Start fresh or let sidebar selection load the chat
      setMessages([]);
      setCurrentChatId(null);
    } else {
      // Guest: Load from localStorage
      const saved = localStorage.getItem("chat");
      if (saved) setMessages(JSON.parse(saved));
    }
  }, [user]);

  // Save to localStorage (Guests only)
  useEffect(() => {
    if (!user) {
      localStorage.setItem("chat", JSON.stringify(messages));
    }
  }, [messages, user]);

  // Optimized fake streaming
  const fakeStream = async (text, onChunk) => {
    const words = text.split(" ");
    let currentText = "";

    for (let i = 0; i < words.length; i++) {
      await new Promise((res) => setTimeout(res, 50));
      currentText += (i === 0 ? "" : " ") + words[i];
      onChunk(currentText);
    }
  };

  // 🔥 NEW: Load a specific chat from Firestore (triggered by Sidebar click)
  const loadChat = async (chatId) => {
    if (!user) return;

    setLoading(true);
    try {
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        setMessages(chatSnap.data().messages || []);
        setCurrentChatId(chatId);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async ({ text, file }) => {
    if (!text && !file) return;

    // 🔐 BLOCK after 3 responses (if not logged in)
    if (!user && responseCount >= 3) {
      alert("You've reached the guest limit. Please log in to continue.");
      return;
    }

    const userMsg = {
      role: "user",
      content: text || "",
      file: file ? URL.createObjectURL(file) : null,
    };

    const botMsg = { role: "assistant", content: "" };

    // Prepare history for LLM (excluding the empty bot message)
    const historyForLLM = [...messages, userMsg];
    const updated = [...messages, userMsg, botMsg];

    setMessages(updated);
    setLoading(true);

    try {
      let responseText;

      if (file) {
        responseText = "I received your file. Processing...";
      } else {
        responseText = await getAIResponse(historyForLLM, text);
      }

      await fakeStream(responseText, (chunk) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1].content = chunk;
          return copy;
        });
      });

      // 🔥 increase response count for guests
      if (!user) {
        setResponseCount((prev) => prev + 1);
      }

      // Save to Firestore (Logged in users only)
      if (user) {
        let chatRef;
        const chatData = {
          uid: user.uid,
          messages: updated,
          updatedAt: new Date(),
        };

        // If no current chat ID, create a NEW chat document
        if (!currentChatId) {
          chatRef = doc(collection(db, "chats"));
          chatData.title = text ? text.substring(0, 30) : "New Image Chat";
          chatData.createdAt = new Date();
          setCurrentChatId(chatRef.id); // Lock subsequent messages to this chat
        } else {
          // Update existing chat document
          chatRef = doc(db, "chats", currentChatId);
        }

        await setDoc(chatRef, chatData, { merge: true });
      }

    } catch (e) {
      console.error("Chat Error:", e);
      // Update bot message to show error visually
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1].content = "Sorry, I encountered an error. Please try again.";
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NEW: Now just resets the view to start a NEW chat, doesn't delete old ones
  const clearChat = () => {
    // Clean up object URLs to prevent memory leaks
    messages.forEach((msg) => {
      if (msg.file) URL.revokeObjectURL(msg.file);
    });

    setMessages([]);
    setCurrentChatId(null); // Reset chat ID so the next message creates a new document

    // Guests still need their local storage cleared
    if (!user) {
      setResponseCount(0);
      localStorage.removeItem("chat");
      localStorage.removeItem("guestResponseCount");
    }
  };

  return {
    messages,
    sendMessage,
    loading,
    clearChat,
    responseCount,
    currentChatId, // 🔥 Export for Sidebar highlighting
    loadChat,      // 🔥 Export for Sidebar clicking
  };
};