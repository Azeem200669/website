import { useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";

import Sidebar from "../components/Sidebar/Sidebar";
import ChatWindow from "../components/Chat/ChatWindow";
import ChatInput from "../components/Chat/ChatInput";
import Navbar from "../components/Navbar/Navbar";
import AuthModal from "../components/Auth/AuthModal";

import logo from "../assets/logo.png";

const Home = () => {
  // NOTE: You will need to add currentChatId and loadChat to your useChat hook
  const { messages, sendMessage, loading, clearChat, responseCount, currentChatId, loadChat } = useChat();
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // 🔥 HANDLE LOGIN MODAL VISIBILITY
  useEffect(() => {
    if (user) {
      setShowLogin(false); // Close modal if user logs in
    } else if (responseCount >= 3) {
      setShowLogin(true);  // Open modal if limit reached
    }
  }, [responseCount, user]);

  const isInputDisabled = !user && responseCount >= 3;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0f0c29] text-white">

      {/* CLASSIC BACKGROUND */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />

      {/* MOBILE SIDEBAR BACKDROP */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR CLOSED LOGO */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          className="fixed left-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-xl backdrop-blur-xl transition-all hover:scale-110 hover:bg-white/20"
        >
          <img
            src={logo}
            alt="App Logo"
            className="h-8 w-8 rounded-full object-cover"
          />
        </button>
      )}

      {/* MAIN LAYOUT */}
      <div className="flex h-full w-full">

        {/* SIDEBAR */}
        <div
          className={`absolute z-40 h-full overflow-hidden transition-all duration-300 md:relative ${sidebarOpen ? "w-72" : "w-0"
            }`}
        >
          <Sidebar
            clearChat={clearChat}
            toggleSidebar={() => setSidebarOpen(false)}
            activeChatId={currentChatId}
            onSelectChat={(chatId) => {
              loadChat(chatId);
              setSidebarOpen(false); // Close sidebar on mobile after selecting
            }}
          />
        </div>

        {/* MAIN AREA */}
        <div className="relative flex flex-1 flex-col overflow-hidden">

          {/* NAVBAR */}
          <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          {messages.length === 0 ? (

            /* 🔥 NO MESSAGE SCREEN */
            <div className="flex flex-1 flex-col items-center justify-center px-6">
              <h1 className="mb-12 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-center text-5xl font-semibold text-transparent md:text-6xl">
                Welcome
              </h1>
              <div className="w-full max-w-4xl transition-all duration-500">
                <ChatInput
                  onSend={sendMessage}
                  loading={loading}
                  disabled={isInputDisabled}
                />
              </div>
            </div>
          ) : (

            /* 🔥 ACTIVE CHAT SCREEN */
            <div className="flex flex-1 flex-col overflow-hidden">

              {/* CHAT WINDOW */}
              <div className="scrollbar-hide mx-auto w-full max-w-5xl flex-1 space-y-6 overflow-y-auto px-4 py-8 md:px-8">
                <ChatWindow messages={messages} loading={loading} />
              </div>

              {/* BOTTOM INPUT */}
              {/* flex-shrink-0 ensures it never gets squished by the chat window */}
              <div className="flex-shrink-0 border-t border-white/5 bg-black/10 px-4 pb-6 backdrop-blur-md md:px-8">
                <div className="mx-auto max-w-5xl pt-4">
                  <ChatInput
                    onSend={sendMessage}
                    loading={loading}
                    disabled={isInputDisabled}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔥 LOGIN MODAL */}
      {showLogin && !user && <AuthModal onClose={() => setShowLogin(false)} />}
    </div>
  );
};

export default Home;