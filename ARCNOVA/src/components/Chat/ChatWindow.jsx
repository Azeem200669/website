import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

const ChatWindow = ({ messages, loading }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="w-full space-y-6">
      {messages.map((msg, i) => (
        <ChatMessage key={msg.id || i} message={msg} />
      ))}

      {/* ✅ Modern Typing Indicator */}
      {loading && (
        <div className="flex justify-start" aria-label="Getting Ready">
          <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-3.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default ChatWindow;