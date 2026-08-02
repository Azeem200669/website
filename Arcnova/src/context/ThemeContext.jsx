import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

// Synchronous initialization to prevent "Flashing" on page load
const getInitialTheme = () => {
  // SSR Safety Check
  if (typeof window === "undefined") return "dark";

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) return savedTheme;

  // Default to system preference if no saved theme exists
  return "system";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme); // "dark" | "light" | "system"
  const [resolvedTheme, setResolvedTheme] = useState("dark"); // The actual applied theme

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // Function to apply the correct theme to the DOM
    const applyTheme = () => {
      const actualTheme = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;

      setResolvedTheme(actualTheme);
      document.documentElement.classList.toggle("dark", actualTheme === "dark");
      document.documentElement.setAttribute("data-theme", actualTheme); // For custom CSS if needed
    };

    applyTheme();
    localStorage.setItem("theme", theme);

    // 🔥 SPECIAL FEATURE: Listen for real-time OS theme changes
    if (theme === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  // Simple toggle for 2-way switching (Dark <-> Light)
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Explicit setter for 3-way switching (Dark <-> Light <-> System)
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);