import { useToast } from '../../contexts/ToastContext';
import './toast.css';

const getDefaultIcon = (type) => {
  switch(type) {
    case 'friend_request': return '👥';
    case 'friend_accepted': return '🤝';
    case 'announcement': return '📢';
    case 'ban': return '🚫';
    case 'message': return '💬';
    default: return '🔔';
  }
};

export default function ToastStack() {
  const { toasts, removeToast } = useToast();

  const handleToastClick = (toast) => {
    if (toast.onClick) toast.onClick(); // Execute navigation/action
    removeToast(toast.id); // Close popup
  };

  return (
    <div className="toast-stack">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast-popup ${toast.type || 'default'}`}
          onClick={() => handleToastClick(toast)}
        >
          <div className="toast-icon">
            {toast.icon || getDefaultIcon(toast.type)}
          </div>
          <div className="toast-text">
            <strong>{toast.title}</strong>
            {toast.subtitle && <p>{toast.subtitle}</p>}
          </div>
          <button 
            className="toast-close" 
            onClick={(e) => { 
              e.stopPropagation(); // Prevent triggering the card's onClick
              removeToast(toast.id); 
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}