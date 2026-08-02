import { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Accepts title, subtitle, type, icon, and an onClick action
  const addToast = ({ title, subtitle, type, icon, onClick, duration = 4000 }) => {
    const id = Date.now() + Math.random(); // Unique ID
    setToasts((prev) => [...prev, { id, title, subtitle, type, icon, onClick }]);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);