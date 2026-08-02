import { db } from '../firebase/firestore';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  onSnapshot, query, orderBy, serverTimestamp, where, 
  writeBatch, increment 
} from 'firebase/firestore';

// 1. Create a new chat or return existing one
export const createOrGetChat = async (currentUserId, targetUserId) => {
  const q = query(
    collection(db, 'chats'),
    where('members', 'array-contains', currentUserId)
  );
  
  const snapshot = await getDocs(q);
  let existingChatId = null;
  
  snapshot.forEach(doc => {
    if (doc.data().members.includes(targetUserId)) {
      existingChatId = doc.id; // ✅ Just grab the ID string
    }
  });

  // If chat exists, return the ID string
  if (existingChatId) return existingChatId;

  // If no chat exists, create a new one!
  const newChatRef = await addDoc(collection(db, 'chats'), {
    members: [currentUserId, targetUserId],
    lastMessage: "",
    lastMessageTime: serverTimestamp(),
    type: "direct",
    unreadCount: { [currentUserId]: 0, [targetUserId]: 0 },
    pinnedBy: {}
  });

  return newChatRef.id; // ✅ Return just the ID string, not the object
};

// 2. Listen to ONLY the user's chats
export const listenToUserChats = (userId, callback) => {
  const q = query(
    collection(db, 'chats'),
    where('members', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(chats);
  });
};

// 3. Listen to messages
export const listenToChatMessages = (chatId, callback) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));  
    callback(messages);
  });
};

// 4. Send a message
export const sendMessage = async (chatId, senderId, text, receiverId) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId,
      text,
      timestamp: serverTimestamp(),
      readBy: [senderId]
    });

    const chatRef = doc(db, 'chats', chatId);
    const updateData = {
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
      [`unreadCount.${senderId}`]: 0,
    };

    if (receiverId) {
      updateData[`unreadCount.${receiverId}`] = increment(1);
    }

    await updateDoc(chatRef, updateData);
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// 5. Pin/Unpin a chat
export const pinChat = async (chatId, userId, isPinned) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    [`pinnedBy.${userId}`]: isPinned
  });
};

// 6. Mark chat as read
export const markChatAsRead = async (chatId, userId) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    [`unreadCount.${userId}`]: 0
  });
};

// 7. Clear all messages in a chat
export const clearChat = async (chatId, userId) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) throw new Error('Chat not found');
    
    const chatData = chatSnap.data();
    if (!chatData.members.includes(userId)) throw new Error('User is not a member of this chat');

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snapshot = await getDocs(messagesRef);
    
    const batch = writeBatch(db);
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await updateDoc(chatRef, {
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      clearedBy: userId,
      clearedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('clearChat error:', error);
    throw error;
  }
};

// 8. Delete the whole chat entirely
export const deleteChat = async (chatId, userId) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) throw new Error('Chat not found');
    
    const chatData = chatSnap.data();
    if (!chatData.members.includes(userId)) throw new Error('User is not a member of this chat');

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snapshot = await getDocs(messagesRef);
    
    const batch = writeBatch(db);
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await deleteDoc(chatRef);
  } catch (error) {
    console.error('deleteChat error:', error);
    throw error;
  }
};

// 9. Edit a message
export const editMessage = async (chatId, messageId, newText) => {
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  await updateDoc(msgRef, {
    text: newText,
    edited: true
  });
};

// 10. Delete a message
export const deleteMessage = async (chatId, messageId) => {
  await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
};

// 11. Pin a message to the chat
export const pinMessage = async (chatId, messageData) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    pinnedMessage: messageData || null
  });
};