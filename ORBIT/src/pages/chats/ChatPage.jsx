import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import ChatList from '../../components/chat/ChatList';
import ChatWindow from '../../components/chat/ChatWindow';

export default function ChatPage() {
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatUser, setActiveChatUser] = useState(null); // NEW: Stores other user's profile
  const { user } = useUser(); 

  // When a chat is selected in the sidebar, save both the ID and the User Data
  const handleSelectChat = (chatId, otherUserData) => {
    setActiveChatId(chatId);
    setActiveChatUser(otherUserData); 
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#070b14' }}>
      <ChatList onSelectChat={handleSelectChat} activeChatId={activeChatId} />
      
      <ChatWindow 
        chatId={activeChatId} 
        currentUserId={user?.uid} 
        otherUser={activeChatUser} // NEW: Pass the user data down so the header works!
      />
    </div>
  );
}