import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../Auth/AuthModal";
import logo from "../../assets/logo.png";

const Navbar = ({ sidebarOpen }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">

      {/* LEFT */}
      <div className={`flex items-center gap-4 ${!sidebarOpen ? "pl-14" : ""}`}>



        <h1 className="text-xl font-semibold text-white">ArcNova</h1>

      </div>

      {/* RIGHT */}
      {!user ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200"
        >
          Login
        </button>
      ) : (
        <div className="flex items-center gap-4">

        </div>
      )}

      {open && <AuthModal onClose={() => setOpen(false)} />}

    </div>
  );
};

export default Navbar;