import { FaBell } from "react-icons/fa";

export default function Navbar() {
  return (
    <header className="navbar">

      <input
        placeholder="Search users, communities..."
        className="search"
      />

      <div className="navbar-right">
        <FaBell />
        <img
          src="https://i.pravatar.cc/40"
          alt=""
        />
      </div>

    </header>
  );
}