import { useState, useRef, useEffect } from "react";

const ChatInput = ({ onSend, loading, disabled }) => {
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize the textarea as the user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // Reset height
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`; // Cap at 150px
    }
  }, [input]);

  const handleSend = () => {
    if (disabled) return;
    if (!input.trim() && !file) return;

    onSend({
      text: input,
      file: file,
    });

    setInput("");
    setFile(null);

    // Reset textarea height after sending
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter creates a new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  // Generate a preview URL if the file is an image
  const filePreviewUrl = file && file.type.startsWith("image/")
    ? URL.createObjectURL(file)
    : null;

  return (
    <div className="w-full">
      {/* File Preview Bar */}
      {file && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            {filePreviewUrl ? (
              <img src={filePreviewUrl} alt="Preview" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg">
                📄
              </div>
            )}
            <span className="truncate text-gray-300">{file.name}</span>
          </div>
          <button
            onClick={() => setFile(null)}
            className="flex-shrink-0 text-red-400 transition-colors hover:text-red-300"
            aria-label="Remove file"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Input Container */}
      <div
        className={`flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-xl backdrop-blur-xl transition-opacity ${disabled ? "opacity-50" : ""
          }`}
      >
        {/* Attach Button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          disabled={disabled}
          aria-label="Attach file"
        >
          📎
        </button>

        <input
          type="file"
          ref={fileRef}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 resize-none bg-transparent py-2 text-white outline-none placeholder-gray-500 max-h-[150px]"
          placeholder={disabled ? "Login to continue..." : "Ask anything..."}
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Mic Button */}
        <button
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          disabled={disabled}
          aria-label="Voice input"
        >
          🎤
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={loading || disabled || (!input.trim() && !file)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default ChatInput;