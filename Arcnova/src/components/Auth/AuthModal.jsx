import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";

const AuthModal = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Close on Escape key & lock body scroll
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // Lock scroll

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = originalOverflow; // Restore scroll
    };
  }, [onClose]);

  const handleGoogle = async () => {
    setError("");
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault(); // Prevents default form page reload

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    try {
      setLoading(true);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      // Clean up Firebase error messages for the user
      setError(err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, ""));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500&display=swap');

        .auth-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Jost', sans-serif;
          pointer-events: auto;
        }

        .auth-backdrop {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: radial-gradient(ellipse at 60% 40%, rgba(180,150,100,0.08) 0%, transparent 60%),
                      rgba(4, 4, 8, 0.85);
          backdrop-filter: blur(20px);
        }

        .auth-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 420px;
          margin: 0 16px;
          background: linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(212, 175, 95, 0.2);
          border-radius: 4px;
          padding: 48px 40px 40px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03) inset,
            0 40px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(212,175,95,0.04);
          animation: cardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .auth-corner {
          position: absolute;
          width: 20px;
          height: 20px;
          border-color: rgba(212,175,95,0.5);
          border-style: solid;
        }
        .auth-corner-tl { top: -1px; left: -1px; border-width: 1px 0 0 1px; }
        .auth-corner-tr { top: -1px; right: -1px; border-width: 1px 1px 0 0; }
        .auth-corner-bl { bottom: -1px; left: -1px; border-width: 0 0 1px 1px; }
        .auth-corner-br { bottom: -1px; right: -1px; border-width: 0 1px 1px 0; }

        .auth-eyebrow {
          text-align: center;
          font-family: 'Jost', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(212,175,95,0.7);
          margin-bottom: 12px;
        }

        .auth-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          color: #f5f0e8;
          text-align: center;
          margin-bottom: 36px;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .auth-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(212,175,95,0.2), transparent);
        }
        .auth-divider-diamond {
          width: 5px;
          height: 5px;
          background: rgba(212,175,95,0.4);
          transform: rotate(45deg);
        }

        .auth-field {
          position: relative;
          margin-bottom: 16px;
        }

        .auth-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 2px;
          padding: 14px 16px;
          color: #f5f0e8;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 300;
          letter-spacing: 0.05em;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .auth-input::placeholder {
          color: rgba(255,255,255,0.2);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .auth-input:focus {
          border-color: rgba(212,175,95,0.4);
          background: rgba(212,175,95,0.03);
        }

        /* NEW: Error Message Box */
        .auth-error {
          background: rgba(193, 65, 65, 0.1);
          border: 1px solid rgba(193, 65, 65, 0.3);
          color: #ff9b9b;
          padding: 10px 16px;
          border-radius: 2px;
          font-size: 12px;
          margin-bottom: 16px;
          text-align: center;
        }

        .auth-btn-primary {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #c9a84c 0%, #e8c97a 50%, #c9a84c 100%);
          background-size: 200% 100%;
          border: none;
          border-radius: 2px;
          color: #0a0a0f;
          font-family: 'Jost', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background-position 0.4s, opacity 0.2s, transform 0.15s;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .auth-btn-primary:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-1px);
        }
        .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* NEW: Loading Spinner */
        .auth-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #0a0a0f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .auth-btn-google {
          width: 100%;
          padding: 13px;
          margin-top: 12px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 2px;
          color: rgba(245,240,232,0.7);
          font-family: 'Jost', sans-serif;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .auth-btn-google:hover:not(:disabled) {
          border-color: rgba(212,175,95,0.3);
          color: rgba(245,240,232,0.95);
          background: rgba(255,255,255,0.02);
        }
        .auth-btn-google:disabled { opacity: 0.4; cursor: not-allowed; }

        .auth-switch {
          text-align: center;
          margin-top: 24px;
          font-size: 11px;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.25);
        }
        .auth-switch span {
          color: rgba(212,175,95,0.7);
          cursor: pointer;
          transition: color 0.2s;
        }
        .auth-switch span:hover { color: rgba(212,175,95,1); }

        .auth-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.2);
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 4px 8px;
          transition: color 0.2s;
        }
        .auth-close:hover { color: rgba(212,175,95,0.6); }
      `}</style>

      <div className="auth-overlay" role="dialog" aria-modal="true">
        <div className="auth-backdrop" onClick={onClose} />

        <div className="auth-card">
          <div className="auth-corner auth-corner-tl" />
          <div className="auth-corner auth-corner-tr" />
          <div className="auth-corner auth-corner-bl" />
          <div className="auth-corner auth-corner-br" />

          <button className="auth-close" onClick={onClose} aria-label="Close modal">✕</button>

          <div className="auth-eyebrow">Welcome</div>
          <h2 className="auth-title">{isLogin ? "Sign In" : "Create Account"}</h2>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <div className="auth-divider-diamond" />
            <div className="auth-divider-line" />
          </div>

          {/* NEW: Error Display */}
          {error && <div className="auth-error">{error}</div>}

          {/* NEW: Form Wrapper for Enter Key Support */}
          <form onSubmit={handleEmail}>
            <div className="auth-field">
              <input
                type="email"
                placeholder="Email Address"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="auth-field">
              <input
                type="password"
                placeholder="Password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-spinner"></span>
                  Please wait...
                </>
              ) : isLogin ? "Continue" : "Create Account"}
            </button>
          </form>

          <button className="auth-btn-google" onClick={handleGoogle} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="auth-switch">
            {isLogin ? "New here? " : "Have an account? "}
            <span onClick={() => { setIsLogin(!isLogin); setError(""); }}>
              {isLogin ? "Create account" : "Sign in"}
            </span>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default AuthModal;