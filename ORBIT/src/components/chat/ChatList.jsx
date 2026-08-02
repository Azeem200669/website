import { useState, useEffect } from "react";
import { listenToUserChats } from "../../services/chatService";
import { useUser } from "../../contexts/UserContext";
import { db } from "../../firebase/firestore";
import { doc, getDoc } from "firebase/firestore";

export default function ChatList({
  onSelectChat,
  activeChatId
}) {
  const { user: currentUser } = useUser();

  const [chats, setChats] = useState([]);
  const [chatUsers, setChatUsers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = listenToUserChats(
      currentUser.uid,
      async (updatedChats) => {
        setChats(updatedChats);

        const usersData = {};

        for (const chat of updatedChats) {
          const otherUserId =
            chat.members?.find(
              (id) => id !== currentUser.uid
            );

          if (!otherUserId) continue;

          try {
            const userRef = doc(
              db,
              "users",
              otherUserId
            );

            const userSnap =
              await getDoc(userRef);

            if (userSnap.exists()) {
              usersData[otherUserId] = {
                id: userSnap.id,
                ...userSnap.data()
              };
            }
          } catch (error) {
            console.error(
              "Error loading user:",
              error
            );
          }
        }

        setChatUsers(usersData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>
        Messages
      </h3>

      {loading && (
        <p style={styles.emptyText}>
          Loading chats...
        </p>
      )}

      {!loading &&
        chats.length === 0 && (
          <p style={styles.emptyText}>
            No chats yet.
            <br />
            Search for a user to start
            messaging.
          </p>
        )}

      {!loading &&
        chats.map((chat) => {
          const otherUserId =
            chat.members?.find(
              (id) =>
                id !== currentUser?.uid
            );

          const otherUser =
            chatUsers[otherUserId] || {};

          const avatar =
            otherUser.avatar ||
            `https://ui-avatars.com/api/?name=${
              otherUser.name || "User"
            }&background=7c3aed&color=fff`;

          return (
            <div
              key={chat.id}
              style={{
                ...styles.chatItem,
                background:
                  activeChatId ===
                  chat.id
                    ? "#7c3aed"
                    : "transparent"
              }}
              onClick={() =>
                onSelectChat(
                  chat.id,
                  otherUser
                )
              }
            >
              <img
                src={avatar}
                alt={
                  otherUser.name ||
                  "Orbit User"
                }
                style={styles.avatar}
              />

              <div style={styles.chatInfo}>
                <h4 style={styles.username}>
                  {otherUser.name ||
                    "Orbit User"}
                </h4>

                <p style={styles.lastMsg}>
                  {chat.lastMessage ||
                    "Start chatting..."}
                </p>
              </div>
            </div>
          );
        })}
    </div>
  );
}

const styles = {
  container: {
    width: "320px",
    height: "100vh",
    overflowY: "auto",
    background: "#0b1020",
    borderRight: "1px solid #1f2937",
    padding: "20px"
  },

  heading: {
    color: "#fff",
    marginBottom: "20px",
    fontSize: "20px",
    fontWeight: "600"
  },

  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: "40px",
    fontSize: "14px",
    lineHeight: "1.5"
  },

  chatItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    borderRadius: "12px",
    cursor: "pointer",
    marginBottom: "8px",
    transition: "all 0.2s ease"
  },

  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
    background: "#111827",
    border: "2px solid #1f2937"
  },

  chatInfo: {
    flex: 1,
    overflow: "hidden"
  },

  username: {
    color: "#fff",
    fontSize: "14px",
    margin: 0,
    fontWeight: "600"
  },

  lastMsg: {
    color: "#94a3b8",
    fontSize: "12px",
    marginTop: "4px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
};