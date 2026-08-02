import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import {
  listenToSpaces,
  createSpace,
  joinSpace,
  leaveSpace,
  uploadSpaceImage,
  deleteSpace,
} from "../../services/spaceService";
import "./communities.css";

export default function Communities() {
  const { user } = useUser();
  const currentUserUid = user?.uid;
  const navigate = useNavigate();

  const [spaces, setSpaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDesc, setSpaceDesc] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToSpaces((fetchedSpaces) => {
      setSpaces(fetchedSpaces);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    if (!spaceName.trim()) return;
    setIsCreating(true);
    try {
      let finalUrl = avatarUrl;
      if (avatarFile) {
        finalUrl = await uploadSpaceImage(currentUserUid, avatarFile);
      }
      await createSpace(currentUserUid, spaceName, spaceDesc, finalUrl);
      setSpaceName("");
      setSpaceDesc("");
      setAvatarUrl("");
      setAvatarFile(null);
      setShowModal(false);
    } catch (error) {
      console.error("Error creating space:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinLeave = async (space) => {
    const isMember = space.members?.includes(currentUserUid);
    try {
      if (isMember) await leaveSpace(space.id, currentUserUid);
      else await joinSpace(space.id, currentUserUid);
    } catch (error) {
      console.error("Error joining/leaving space:", error);
    }
  };

  const handleDeleteSpace = async (e, spaceId) => {
    e.stopPropagation(); // Prevent navigating when clicking delete
    if (window.confirm("Are you sure you want to permanently delete this Space?")) {
      try {
        await deleteSpace(spaceId);
      } catch (error) {
        console.error("Error deleting space:", error);
      }
    }
  };

  // Filter spaces by search
  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dashboard>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>👥 Spaces</h1>
            <p className="subtitle">Discover and join communities in your Orbit.</p>
          </div>
          <button className="create-btn" onClick={() => setShowModal(true)}>
            + Launch Space
          </button>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search spaces..."
          className="space-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="spaces-grid">
          {filteredSpaces.map((space, index) => {
            const isMember = space.members?.includes(currentUserUid);
            const isCreator = space.createdBy === currentUserUid;

            return (
              <div
                key={space.id}
                className="space-card"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => isMember && navigate(`/spaces/${space.id}`)} // Go to chat if member
              >
                {/* Delete button for Creator */}
                {isCreator && (
                  <button className="delete-space-btn" onClick={(e) => handleDeleteSpace(e, space.id)}>
                    ✕
                  </button>
                )}

                <div className="space-avatar">
                  {space.avatar ? <img src={space.avatar} alt={space.name} /> : space.name?.charAt(0)}
                </div>
                <h3>{space.name}</h3>
                <p className="space-desc">{space.description || "A new frontier awaits."}</p>
                <div className="space-meta">
                  <span>{space.memberCount || 0} Orbiters</span>
                </div>
                <button
                  className={`join-btn ${isMember ? 'joined' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleJoinLeave(space); }}
                >
                  {isCreator ? "Owner" : isMember ? "Leave Space" : "Join Orbit"}
                </button>
              </div>
            );
          })}

          {filteredSpaces.length === 0 && (
            <div className="no-spaces">
              <p>No spaces found. Be the first to launch one!</p>
            </div>
          )}
        </div>

        {/* Create Space Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Launch New Space</h2>
              <p className="modal-subtitle">Create a community hub for others to explore.</p>

              <form onSubmit={handleCreateSpace}>
                <div className="edit-group">
                  <label>Space Avatar</label>
                  {/* Vertical Layout for inputs */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => { setAvatarFile(e.target.files[0]); setAvatarUrl(""); }}
                    className="file-input"
                  />
                  <div className="or-divider-full">OR</div>
                  <input
                    type="text"
                    placeholder="Paste image URL..."
                    value={avatarUrl}
                    onChange={(e) => { setAvatarUrl(e.target.value); setAvatarFile(null); }}
                  />

                  {(avatarFile || avatarUrl) && (
                    <div className="avatar-preview">
                      <img src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} alt="Preview" />
                    </div>
                  )}
                </div>

                <div className="edit-group">
                  <label>Space Name</label>
                  <input type="text" placeholder="e.g. React Explorers" value={spaceName} onChange={(e) => setSpaceName(e.target.value)} required />
                </div>

                <div className="edit-group">
                  <label>Mission Brief (Description)</label>
                  <textarea placeholder="What is this space about?" value={spaceDesc} onChange={(e) => setSpaceDesc(e.target.value)} rows={3} />
                </div>

                <div className="modal-actions">
                  <button type="button" className="modal-cancel" onClick={() => setShowModal(false)}>Abort</button>
                  <button type="submit" className="save-btn" disabled={isCreating}>
                    {isCreating ? "Launching..." : "Launch Space"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
}