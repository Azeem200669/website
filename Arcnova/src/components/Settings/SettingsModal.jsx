import { useState, useEffect } from "react";

// Custom hook to make settings persist in localStorage permanently
const usePersistentState = (key, initialValue) => {
  const [state, setState] = useState(() => {
    const stored = localStorage.getItem(key);
    try {
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return stored || initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};

// Reusable iOS-style Toggle Switch
const ToggleSwitch = ({ isOn, handleToggle, label, description, icon }) => (
  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">{label}</span>
        {description && <span className="text-xs text-gray-400">{description}</span>}
      </div>
    </div>
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isOn ? "bg-purple-600" : "bg-gray-600"
        }`}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isOn ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  </div>
);

const SettingsModal = ({ onClose }) => {
  // ✅ WORKING SETTINGS (Persisted to localStorage)
  const [sendOnEnter, setSendOnEnter] = usePersistentState("setting_sendOnEnter", true);
  const [soundEnabled, setSoundEnabled] = usePersistentState("setting_soundEnabled", false);
  const [typingSpeed, setTypingSpeed] = usePersistentState("setting_typingSpeed", "normal");
  const [customInstructions, setCustomInstructions] = usePersistentState("setting_customInstructions", "");
  const [creativity, setCreativity] = usePersistentState("setting_creativity", 0.7);

  // Close on Escape key & lock scroll
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your local guest chat history? This cannot be undone.")) {
      localStorage.removeItem("chat");
      localStorage.removeItem("guestResponseCount");
      alert("Chat history cleared!");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-[#0f172a] text-white">

      {/* STICKY HEADER */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#0f172a]/80 px-4 py-4 backdrop-blur-lg md:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white">Settings</h2>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200"
        >
          Done
        </button>
      </header>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-2xl space-y-8">

          {/* CHAT BEHAVIOR SECTION */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Chat Behavior
            </h3>
            <div className="space-y-3">
              <ToggleSwitch
                icon="⌨️"
                label="Press Enter to Send"
                description="When disabled, Enter will create a new line."
                isOn={sendOnEnter}
                handleToggle={() => setSendOnEnter(!sendOnEnter)}
              />

              <ToggleSwitch
                icon="🔔"
                label="Sound Effects"
                description="Play a sound when AI responds."
                isOn={soundEnabled}
                handleToggle={() => setSoundEnabled(!soundEnabled)}
              />

              {/* Typing Speed Selector */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Streaming Speed</span>
                    <span className="text-xs text-gray-400">Control how fast text appears</span>
                  </div>
                </div>
                <select
                  value={typingSpeed}
                  onChange={(e) => setTypingSpeed(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                >
                  <option value="instant">Instant</option>
                  <option value="fast">Fast</option>
                  <option value="normal">Normal</option>
                  <option value="slow">Slow</option>
                </select>
              </div>
            </div>
          </section>

          {/* AI CONFIGURATION SECTION */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              AI Configuration
            </h3>
            <div className="space-y-3">

              {/* Custom Instructions */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-xl">🧠</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Custom Instructions</span>
                    <span className="text-xs text-gray-400">How should the AI respond?</span>
                  </div>
                </div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., Always answer in Spanish, or be very concise..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-purple-500"
                />
              </div>

              {/* Creativity Slider */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🎨</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">Creativity (Temperature)</span>
                      <span className="text-xs text-gray-400">Higher = more creative, Lower = more precise</span>
                    </div>
                  </div>
                  <span className="rounded-md bg-purple-500/20 px-2 py-1 text-xs font-bold text-purple-300">
                    {creativity.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={creativity}
                  onChange={(e) => setCreativity(parseFloat(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                  <span>Precise (0.0)</span>
                  <span>Balanced (0.5)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

            </div>
          </section>

          {/* DATA MANAGEMENT SECTION */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Data Management
            </h3>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Clear Local Chat History</span>
                  <span className="text-xs text-gray-400">Removes guest chats from this device.</span>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 sm:w-auto"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </section>

          {/* ABOUT SECTION */}
          <section className="pb-10 text-center">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              About
            </h3>
            <p className="text-sm text-gray-400">ArcNova AI v1.0.0</p>
            <p className="text-xs text-gray-600">Built with React & Firebase</p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;