import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import GiftDiamondModal from "../../components/gifts/GiftDiamondModal";
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext"; // <-- Added
import ReportModal from "../../components/ReportModal"; // <-- Added
import { updateUserProfile } from "../../services/userService";
import { uploadImageToCloudinary } from "../../services/cloudinaryService";
import { doc, getDoc } from "firebase/firestore";
import UserBadges from "../../components/UserBadges";

import { db } from "../../firebase/firestore";
import "./profile.css";

// Compresses images before uploading to Firebase
const compressImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const presetAvatars = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Orbit",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Nebula",
  "https://api.dicebear.com/7.x/micah/svg?seed=Galaxy",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Zenith",
  "https://api.dicebear.com/7.x/shapes/svg?seed=Quasar",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=Astro",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Comet",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Pixel",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Rocket",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Luna"
];

export default function Profile() {
  const { uid: profileId } = useParams();

  // ─── Added Auth Context ────────────────────
  const { user: currentUser } = useAuth();

  const { user, stats: myStats } = useUser();
  const isOwnProfile = !profileId || profileId === user?.uid;

  const [profileUser, setProfileUser] = useState(null);
  const [profileStats, setProfileStats] = useState({ points: 0, gems: 0, streak: 0 });
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(presetAvatars[0]);
  const [coverImage, setCoverImage] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  // ─── Added Report State ────────────────────
  const [showReport, setShowReport] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoadingProfile(true);

      if (isOwnProfile) {
        setProfileUser(user);
        setProfileStats(myStats);
        setName(user?.name || "");
        setBio(user?.bio || "");
        setAvatar(user?.avatar || presetAvatars[0]);
        setCoverImage(user?.coverImage || "");
      } else {
        try {
          const userRef = doc(db, "users", profileId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = { uid: profileId, ...userSnap.data() };
            setProfileUser(userData);
            setProfileStats(userData.stats || { points: 0, gems: 0, streak: 0 });
          } else {
            console.error("User profile not found");
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
      setLoadingProfile(false);
    };

    if (user) {
      fetchUserProfile();
    }
  }, [profileId, user, myStats, isOwnProfile]);

  const handleEditToggle = () => {
    if (isEditing) {
      setName(user?.name || "");
      setBio(user?.bio || "");
      setAvatar(user?.avatar || presetAvatars[0]);
      setCoverImage(user?.coverImage || "");
      setSelectedFile(null);
      setAvatarPreview(null);
      setSelectedCoverFile(null);
      setCoverPreview(null);
    }
    setIsEditing(!isEditing);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setAvatar(null);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handlePresetAvatarSelect = (url) => {
    setAvatar(url);
    setSelectedFile(null);
    setAvatarPreview(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setIsEditing(false);

    try {
      let finalAvatarUrl = avatar;
      let finalCoverUrl = coverImage;

      if (selectedFile) {
        const compressedAvatar = await compressImage(selectedFile, 400, 0.7);
        finalAvatarUrl = await uploadImageToCloudinary(compressedAvatar, `avatars/${user.uid}`);
      }

      if (selectedCoverFile) {
        const compressedCover = await compressImage(selectedCoverFile, 1200, 0.7);
        finalCoverUrl = await uploadImageToCloudinary(compressedCover, `covers/${user.uid}`);
      }

      await updateUserProfile(user.uid, {
        name: name,
        bio: bio,
        avatar: finalAvatarUrl,
        coverImage: finalCoverUrl,
      });

      setSelectedFile(null);
      setAvatarPreview(null);
      setSelectedCoverFile(null);
      setCoverPreview(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
      setIsEditing(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareProfile = async () => {
    const shareData = {
      title: `${profileUser?.name}'s Orbit Profile`,
      text: `Check out ${profileUser?.name} on Orbit! ID: ${profileUser?.orbitId}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log("Share cancelled:", err); }
    } else {
      try {
        await navigator.clipboard.writeText(`Orbit Profile: ${profileUser?.orbitId} | ${window.location.href}`);
        alert("Profile link copied to clipboard!");
      } catch (err) { console.error("Failed to copy:", err); }
    }
  };

  const coverStyle = {
    backgroundImage: coverPreview
      ? `url(${coverPreview})`
      : coverImage
        ? `url(${coverImage})`
        : "none",
  };

  if (loadingProfile) {
    return (
      <Dashboard>
        <div className="profile-container" style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>
          Loading Profile...
        </div>
      </Dashboard>
    );
  }

  return (
    <Dashboard>
      <div className="profile-container">

        {/* Profile Header Card */}
        <div className="profile-header-card">
          <div className={`profile-cover ${!coverPreview && !coverImage ? 'default-cover' : ''}`} style={isOwnProfile ? coverStyle : { backgroundImage: `url(${profileUser?.coverImage})` || 'none' }}>
            {isEditing && isOwnProfile && (
              <label className="cover-edit-overlay">
                <input type="file" accept="image/*" onChange={handleCoverChange} hidden />
                <span>📷 Change Cover</span>
              </label>
            )}
          </div>

          <div className="profile-info">
            <div className="avatar-container">
              <img
                src={isOwnProfile ? (avatarPreview || avatar) : (profileUser?.avatar || presetAvatars[0])}
                alt={profileUser?.name}
                className="profile-avatar"
              />
            </div>

            <div className="profile-details">
              <h2>{profileUser?.name || "Orbit User"}</h2>
              {/* <UserBadges
                badgeIds={profileUser?.badges || []}
              /> */}
              <p className="profile-handle">{profileUser?.orbitId || "ORBIT-00000"}</p>
              <p className="profile-bio">{profileUser?.bio || "Exploring the Orbit universe 🚀"}</p>
            </div>

            <div className="profile-actions">
              <button className="share-profile-btn" onClick={handleShareProfile}>
                ➤ Share
              </button>

              {/* <button className="gift-btn" onClick={() => setShowGiftModal(true)}>
                💎 Gift Diamonds
              </button> */}

              {/* ─── Added Report Button ─────────── */}
              {!isOwnProfile && (
                <button
                  className="report-btn"
                  onClick={() => setShowReport(true)}
                >
                  🚩 Report User
                </button>
              )}

              {isOwnProfile && (
                <button
                  className={`edit-profile-btn ${isEditing ? 'cancel-btn' : ''}`}
                  onClick={handleEditToggle}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </button>
              )}
            </div>
          </div>
        </div>

        {isEditing && isOwnProfile && (
          <div className="edit-section-card">
            <div className="edit-group">
              <label>Display Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="edit-group">
              <label>Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}></textarea>
            </div>
            <div className="edit-group">
              <label>Choose Avatar</label>
              <div className="avatar-grid">
                {presetAvatars.map((url) => (
                  <img key={url} src={url} alt="preset" className={`preset-avatar ${avatar === url ? 'active' : ''}`} onClick={() => handlePresetAvatarSelect(url)} />
                ))}
              </div>
            </div>
            <div className="edit-group">
              <label>Or Upload Avatar Photo</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="file-input" />
            </div>
            <button className="save-btn" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving to Orbit..." : "Save Changes"}
            </button>
          </div>
        )}

        <div className="profile-stats-grid">
          <div className="profile-stat-card">
            <div className="stat-icon">🪙</div>
            <h3>{profileStats.points.toLocaleString()}</h3>
            <p>Points</p>
          </div>
          <div className="profile-stat-card">
            <div className="stat-icon">💎</div>
            <h3>{profileStats.gems.toLocaleString()}</h3>
            <p>Gems</p>
          </div>
        </div>

        <div className="profile-section-card">
          <h3>Social & Activity</h3>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-label">Friends</span>
              <span className="activity-value">{profileUser?.friends?.length || 0}</span>
            </div>
            <div className="activity-item">
              <span className="activity-label">Spaces Joined</span>
              <span className="activity-value">{profileUser?.communities?.length || 0}</span>
            </div>
            <div className="activity-item">
              <span className="activity-label">Events Attended</span>
              <span className="activity-value">{profileUser?.events?.length || 0}</span>
            </div>
            <div className="activity-item">
              <span className="activity-label">Messages Sent</span>
              <span className="activity-value">{profileUser?.messagesSent || 0}</span>
            </div>
          </div>
        </div>

        <div className="profile-section-card">
          <h3>🏅 Badges</h3>

          <UserBadges
            badgeIds={profileUser?.badges || []}
          />
        </div>

      </div>

      {/* ─── Added Report Modal Component ────── */}
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        reporter={{
          uid: currentUser?.uid,
          displayName: currentUser?.name || currentUser?.email,
        }}
        reportedUser={{
          uid: profileUser?.uid,
          displayName: profileUser?.name || profileUser?.email,
        }}
      />

      {/* <GiftDiamondModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        sender={{
          uid: currentUser?.uid,
          displayName: currentUser?.name || currentUser?.email,
        }}
        receiver={{
          uid: profileUser?.uid,
          displayName: profileUser?.name,
        }}
      /> */}
    </Dashboard>
  );
}