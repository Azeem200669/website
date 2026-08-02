import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/auth";
import { loginWithGoogle, loginWithEmail } from "../../services/authService";
import { db } from "../../firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ─── Dynamic System Bootup Subtitle ──────────
  const statusMessages = [
    "Initializing Secure Connection",
    "Establishing Network Link",
    "Syncing Orbital Data",
    "Ready To Launch"
  ];
  const [statusText, setStatusText] = useState(statusMessages[0]);

  // ─── Check if user was banned on previous session ──
  useEffect(() => {
    const bannedFlag = sessionStorage.getItem("account_banned");
    if (bannedFlag === "true") {
      setError("Your account has been banned.");
      setStatusText("Access Denied");
      sessionStorage.removeItem("account_banned");
    }
  }, []);

  // ─── Cycle status messages ──────────────────
  useEffect(() => {
    if (loading || error) return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % statusMessages.length;
      setStatusText(statusMessages[index]);
    }, 3000);

    return () => clearInterval(interval);
  }, [loading, error]);

  // ─── Update status text based on state ──────
  useEffect(() => {
    if (loading) {
      setStatusText("Authenticating Identity...");
    } else if (error) {
      setStatusText("Access Denied");
    }
  }, [loading, error]);

  // ─── Navigate user after login ──────────────
  const navigateUser = async (user) => {
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));

      if (userSnap.exists()) {
        const userData = userSnap.data();

        if (userData.banned) {
          await auth.signOut();
          setError("Your account has been banned.");
          return;
        }

        if (userData.role === "owner") {
          navigate("/owner", { replace: true });
          return;
        }
      }

      navigate("/home", { replace: true });
    } catch {
      navigate("/home", { replace: true });
    }
  };

  // ─── Auth Handlers ───────────────────────────
  const handleGoogle = async () => {
    setError("");
    setLoading(true);

    try {
      const user = await loginWithGoogle();
      await navigateUser(user);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Failed to connect with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("All fields are required.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = await loginWithEmail(email.trim(), password);
      await navigateUser(user);
    } catch (err) {
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-email":
          setError("Invalid email or password.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please wait and try again.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;
        default:
          setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isBannedError =
    error && (error.includes("banned") || error.includes("Banned"));

  return (
    <div className="login-page">
      <div className="orb orb1"></div>
      <div className="orb orb2"></div>
      <div className="planet"></div>

      <div className="login-card">
        <div className="logo-container">
          <div className="logo-core">O</div>
          <div className="orbital-ring"></div>
          <div className="orbital-ring ring-2"></div>
        </div>

        <h1>Orbit</h1>

        <p
          className={`subtitle${error ? " subtitle-error" : ""}`}
        >
          {statusText} <span className="cursor">|</span>
        </p>

        {/* ─── Error Banner ──────────── */}
        {error && (
          <div
            className={`error-banner${isBannedError ? " banned-banner" : ""}`}
          >
            <span className="error-icon">
              {isBannedError ? "🚫" : "⚠️"}
            </span>
            <p>{error}</p>
          </div>
        )}

        <button
          className="google-btn"
          onClick={handleGoogle}
          disabled={loading}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
              fill="#EA4335"
            />
          </svg>
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <form onSubmit={handleLogin} noValidate className="login-form">
          {/* ─── Email Field (wrapped) ─── */}
          <div className="email-wrapper">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              disabled={loading}
              autoComplete="email"
              className={error ? "input-error" : ""}
            />
            <span className="email-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13 2 4" />
              </svg>
            </span>
          </div>

          {/* ─── Password Field (with left icon) ─── */}
          <div className="input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              disabled={loading}
              autoComplete="current-password"
              className={error ? "input-error" : ""}
            />
            <span className="pass-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <button
              type="button"
              className="eye-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* ─── Submit Button (with spinner) ─── */}
          <button
            type="submit"
            className={`email-btn${loading ? " loading" : ""}`}
            disabled={loading}
          >
            <span className="btn-text">Login</span>
            <span className="spinner"></span>
          </button>
        </form>

        <button
          className="link-btn"
          onClick={() => navigate("/register")}
          disabled={loading}
          type="button"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}