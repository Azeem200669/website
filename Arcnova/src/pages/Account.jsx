import { useAuth } from "../context/AuthContext";

const Account = () => {
  const { user, userProfile, avatarLetter, isProUser, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a] p-6 text-white">
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-white">Access Restricted</h2>
          <p className="text-gray-400">Please log in to view your account settings.</p>
        </div>
      </div>
    );
  }

  // Format Firebase timestamps
  const joinedDate = user.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  const lastSignIn = user.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "N/A";

  // Reusable Info Card Component
  const InfoCard = ({ icon, label, value, emptyText }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-purple-500/30 hover:bg-purple-500/5">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </div>
      <div className={`text-sm ${value ? "text-white" : "italic text-gray-600"}`}>
        {value || emptyText}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">

        {/* Header Section */}
        <div className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-4xl font-bold shadow-lg">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              avatarLetter
            )}
            {isProUser && (
              <span className="absolute -bottom-2 -right-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-black shadow-md">
                PRO
              </span>
            )}
          </div>

          {/* Name & Email */}
          <div className="flex flex-col items-center sm:items-start sm:pt-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                {userProfile?.displayName || user.displayName || "User"}
              </h1>
              {isProUser && (
                <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                  PRO MEMBER
                </span>
              )}
            </div>
            <p className="text-gray-400">{user.email}</p>
            <p className="mt-1 text-xs text-gray-600">Member since {joinedDate}</p>
          </div>
        </div>

        {/* Personal Information Grid */}
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">Personal Information</h2>
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
            label="Phone Number"
            value={userProfile?.phoneNumber}
            emptyText="Not provided"
          />
          <InfoCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>}
            label="Location"
            value={userProfile?.location}
            emptyText="Not provided"
          />
          <div className="sm:col-span-2">
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
              label="Bio"
              value={userProfile?.bio}
              emptyText="No bio added yet"
            />
          </div>
        </div>

        {/* Account MetaData */}
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">Account Details</h2>
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
            label="User ID (UID)"
            value={user.uid}
          />
          <InfoCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            label="Last Sign-In"
            value={lastSignIn}
          />
        </div>

        {/* Danger Zone */}
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-red-500/80">Danger Zone</h2>
        <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">Log out of your account</h3>
            <p className="text-xs text-gray-400">Sign out from this device. You can sign back in later.</p>
          </div>
          <button
            onClick={logout}
            className="flex-shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
};

export default Account;