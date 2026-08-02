import { useState, useEffect } from "react";

export const useModel = () => {
  // 1. Lazy initialization: Read from localStorage before the first render
  // 2. SSR Safe: Check if window is defined (for Next.js/Remix)
  const [model, setModelState] = useState(() => {
    if (typeof window === "undefined") return "openai";

    try {
      const savedModel = localStorage.getItem("selectedModel");
      return savedModel || "openai";
    } catch (error) {
      console.error("Failed to read model from localStorage:", error);
      return "openai";
    }
  });

  // 3. Cross-tab synchronization
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event) => {
      if (event.key === "selectedModel" && event.newValue) {
        setModelState(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setModel = (newModel) => {
    setModelState(newModel);

    try {
      localStorage.setItem("selectedModel", newModel);
    } catch (error) {
      console.error("Failed to save model to localStorage:", error);
    }
  };

  return {
    model,
    setModel,
  };
};