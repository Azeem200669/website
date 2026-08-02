const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { UserProvider } from "./contexts/UserContext";
import { ToastProvider } from "./contexts/ToastContext";
import AuthProvider from "./contexts/AuthContext";

import "./styles/globals.css";
import "./styles/theme.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <UserProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </UserProvider>
  </AuthProvider>
);