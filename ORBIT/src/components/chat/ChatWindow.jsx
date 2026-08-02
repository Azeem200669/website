import { useState, useEffect, useRef } from "react";
import {
  listenToChatMessages,
  sendMessage
} from "../../services/chatService";
import { awardPoints } from "../../services/rewardService";

export default function ChatWindow({
  chatId,
  currentUserId,
  otherUser
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Load messages
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    console.log("Opening Chat:", chatId);

    const unsubscribe = listenToChatMessages(
      chatId,
      (updatedMessages) => {
        console.log(
          "Messages Loaded:",
          updatedMessages
        );

        setMessages(updatedMessages || []);
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  const handleSend = async () => {
    if (
      !newMessage.trim() ||
      !chatId ||
      !currentUserId
    )
      return;

    try {
      await sendMessage(
        chatId,
        currentUserId,
        newMessage
      );

      await awardPoints(
        currentUserId,
        5
      );

      setNewMessage("");
    } catch (error) {
      console.error(
        "Send Message Error:",
        error
      );
    }
  };

  if (!chatId) {
    return (
      <div style={styles.emptyState}>
        Select a chat to start messaging
      </div>
    );
  }

  const avatar =
    otherUser?.avatar ||
    `https://ui-avatars.com/api/?name=${
      otherUser?.name || "User"
    }&background=7c3aed&color=fff`;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <img
          src={avatar}
          alt="user"
          style={styles.headerAvatar}
        />

        <div>
          <h3 style={styles.headerName}>
            {otherUser?.name ||
              "Orbit User"}
          </h3>

          <span style={styles.headerStatus}>
            Online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesArea}>
        {messages.length === 0 ? (
          <div style={styles.noMessages}>
            No messages yet.
            <br />
            Send the first message.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageBubble,
                alignSelf:
                  msg.senderId ===
                  currentUserId
                    ? "flex-end"
                    : "flex-start",
                background:
                  msg.senderId ===
                  currentUserId
                    ? "#7c3aed"
                    : "#111827"
              }}
            >
              {msg.text || ""}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={newMessage}
          onChange={(e) =>
            setNewMessage(
              e.target.value
            )
          }
          placeholder="Type a message..."
          onKeyDown={(e) =>
            e.key === "Enter" &&
            handleSend()
          }
        />

        <button
          style={styles.sendBtn}
          onClick={handleSend}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#070b14"
  },

  emptyState: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#94a3b8",
    fontSize: "18px"
  },

  header: {
    display: "flex",
    alignItems: "center",
    padding: "16px 24px",
    background: "#0b1020",
    borderBottom: "1px solid #1f2937"
  },

  headerAvatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    marginRight: "16px"
  },

  headerName: {
    color: "#fff",
    margin: 0
  },

  headerStatus: {
    color: "#10b981",
    fontSize: "12px"
  },

  messagesArea: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "20px"
  },

  noMessages: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: "40px"
  },

  messageBubble: {
    padding: "12px 16px",
    borderRadius: "18px",
    color: "#fff",
    maxWidth: "60%",
    wordBreak: "break-word"
  },

  inputArea: {
    display: "flex",
    gap: "12px",
    padding: "20px",
    borderTop: "1px solid #1f2937",
    background: "#0b1020"
  },

  input: {
    flex: 1,
    height: "48px",
    borderRadius: "12px",
    border: "1px solid #1f2937",
    background: "#111827",
    color: "#fff",
    padding: "0 16px",
    outline: "none"
  },

  sendBtn: {
    width: "48px",
    height: "48px",
    border: "none",
    borderRadius: "12px",
    background: "#7c3aed",
    color: "#fff",
    cursor: "pointer"
  }
};