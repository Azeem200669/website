import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { useUser } from "../../contexts/UserContext";
import Dashboard from "../../components/common/Dashboard";
import "./reward.css";

const DAILY_REWARDS = [
    { day: 1, points: 50 },
    { day: 2, points: 60 },
    { day: 3, points: 70 },
    { day: 4, points: 80 },
    { day: 5, points: 90 },
    { day: 6, points: 100 },
    { day: 7, points: 150 }, // Bonus day
];

export default function Reward() {
    const { user, stats } = useUser();
    const currentUserUid = user?.uid;

    const [convertAmount, setConvertAmount] = useState("");
    const [converting, setConverting] = useState(false);
    const [claiming, setClaiming] = useState(false);

    // Daily reward state fetched directly from the user document
    const [dailyState, setDailyState] = useState({
        currentDay: 0,
        lastClaimDate: null,
    });

    const formatNumber = (num) => num?.toLocaleString() || "0";

    // Fetch daily reward state on mount
    useEffect(() => {
        if (!currentUserUid) return;
        const fetchDailyState = async () => {
            const docRef = doc(db, "users", currentUserUid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setDailyState({
                    currentDay: data.dailyRewardDay || 0,
                    lastClaimDate: data.dailyRewardDate || null,
                });
            }
        };
        fetchDailyState();
    }, [currentUserUid]);

    // Date helpers
    const getTodayString = () => new Date().toDateString();
    const getYesterdayString = () => new Date(Date.now() - 86400000).toDateString();

    const canClaimToday = dailyState.lastClaimDate !== getTodayString();

    // ─── Claim Daily Reward ──────────────────────────────────
    const handleClaimDaily = async () => {
        if (!canClaimToday || !currentUserUid) return;
        setClaiming(true);

        try {
            const today = getTodayString();
            const yesterday = getYesterdayString();
            let nextDay = 1;
            let pointsToAdd = DAILY_REWARDS[0].points;

            if (dailyState.lastClaimDate === yesterday) {
                // Continuing streak
                nextDay = (dailyState.currentDay % 7) + 1;
                pointsToAdd = DAILY_REWARDS[nextDay - 1].points;
            } else if (dailyState.lastClaimDate === today) {
                // Already claimed today (fail-safe)
                setClaiming(false);
                return;
            } else {
                // Streak broken or first time, restart
                nextDay = 1;
                pointsToAdd = DAILY_REWARDS[0].points;
            }

            const userRef = doc(db, "users", currentUserUid);

            // Update streak state AND points in a single write
            await updateDoc(userRef, {
                dailyRewardDay: nextDay,
                dailyRewardDate: today,
                points: (stats.points || 0) + pointsToAdd,
            });

            // Update local state immediately
            setDailyState({ currentDay: nextDay, lastClaimDate: today });
        } catch (err) {
            console.error("Claim Error:", err);
        } finally {
            setClaiming(false);
        }
    };

    // ─── Convert Points to Gems ────────────────────────────
    const handleConvert = async () => {
        const amount = parseInt(convertAmount, 10);
        if (!amount || amount < 1000 || amount > (stats.points || 0)) return;

        setConverting(true);
        try {
            const gemsToReceive = Math.floor(amount / 1000);
            const pointsToDeduct = gemsToReceive * 1000; // Ensures clean math

            const userRef = doc(db, "users", currentUserUid);
            await updateDoc(userRef, {
                points: (stats.points || 0) - pointsToDeduct,
                gems: (stats.gems || 0) + gemsToReceive,
            });

            setConvertAmount(""); // Clear input on success
        } catch (err) {
            console.error("Convert Error:", err);
        } finally {
            setConverting(false);
        }
    };

    // Derived states for UI
    const todayString = getTodayString();
    const yesterdayString = getYesterdayString();

    const calculateVisualDay = (index) => {
        if (dailyState.lastClaimDate === todayString) {
            // Already claimed today, show current day as claimed
            return index <= (dailyState.currentDay - 1) ? "claimed" : "locked";
        }
        if (dailyState.lastClaimDate === yesterdayString) {
            // Streak active, next day is claimable
            if (index < dailyState.currentDay) return "claimed";
            if (index === dailyState.currentDay) return "active";
            return "locked";
        }
        // Streak broken or first time
        if (index === 0) return "active";
        return "locked";
    };

    return (
        <Dashboard>
            <div className="reward-page">
                <h1 className="reward-main-title">Rewards Center 🎁</h1>
                <p className="reward-main-subtitle">Claim daily points and convert your points into gems.</p>

                {/* ─── Stats Bar ──────────────────────────── */}
                <div className="reward-stats-bar">
                    <div className="r-stat-card">
                        <span className="r-stat-icon">⭐</span>
                        <div>
                            <p className="r-stat-val">{formatNumber(stats.points)}</p>
                            <p className="r-stat-label">Points</p>
                        </div>
                    </div>
                    <div className="r-stat-divider" />
                    <div className="r-stat-card">
                        <span className="r-stat-icon">💎</span>
                        <div>
                            <p className="r-stat-val">{formatNumber(stats.gems)}</p>
                            <p className="r-stat-label">Gems</p>
                        </div>
                    </div>
                </div>

                {/* ─── Daily Claim Section ────────────────── */}
                <div className="reward-section">
                    <div className="reward-section-header">
                        <h2>📅 Daily Streak</h2>
                        <span className="reward-day-badge">
                            Day {dailyState.lastClaimDate === todayString ? dailyState.currentDay : (dailyState.lastClaimDate === yesterdayString ? dailyState.currentDay + 1 : 1)} of 7
                        </span>
                    </div>

                    <div className="daily-grid">
                        {DAILY_REWARDS.map((reward, index) => {
                            const status = calculateVisualDay(index);
                            return (
                                <div key={reward.day} className={`daily-box daily-box--${status}`}>
                                    <span className="daily-day">Day {reward.day}</span>
                                    <span className="daily-pts">+{reward.points}</span>
                                    {status === "claimed" && <span className="daily-check">✓</span>}
                                    {status === "locked" && <span className="daily-lock">🔒</span>}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="claim-daily-btn"
                        onClick={handleClaimDaily}
                        disabled={!canClaimToday || claiming}
                    >
                        {claiming ? (
                            <div className="mini-spinner" />
                        ) : !canClaimToday ? (
                            "✓ Claimed Today"
                        ) : (
                            `Claim +${dailyState.lastClaimDate === yesterdayString ? DAILY_REWARDS[dailyState.currentDay % 7].points : DAILY_REWARDS[0].points} Points`
                        )}
                    </button>
                </div>

                {/* ─── Converter Section ──────────────────── */}
                <div className="reward-section converter-section">
                    <div className="reward-section-header">
                        <h2>🔄 Points to Gems Converter</h2>
                    </div>

                    <div className="converter-rate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span>Exchange Rate: <strong>1,000 Points = 1 Gem</strong></span>
                    </div>

                    <div className="converter-card">
                        <div className="converter-input-group">
                            <div className="converter-field">
                                <label>You Pay</label>
                                <div className="converter-input-wrap">
                                    <span className="converter-currency">⭐</span>
                                    <input
                                        type="number"
                                        placeholder="e.g. 5000"
                                        value={convertAmount}
                                        onChange={(e) => setConvertAmount(e.target.value)}
                                        min="1000"
                                        step="1000"
                                    />
                                </div>
                            </div>

                            <div className="converter-arrow">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <polyline points="19 12 12 19 5 12" />
                                </svg>
                            </div>

                            <div className="converter-field">
                                <label>You Receive</label>
                                <div className="converter-input-wrap converter-output">
                                    <span className="converter-currency">💎</span>
                                    <span className="converter-value">
                                        {convertAmount && parseInt(convertAmount, 10) >= 1000
                                            ? Math.floor(parseInt(convertAmount, 10) / 1000)
                                            : 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {convertAmount && parseInt(convertAmount, 10) < 1000 && (
                            <p className="converter-error">Minimum conversion is 1,000 points.</p>
                        )}
                        {convertAmount && parseInt(convertAmount, 10) > (stats.points || 0) && (
                            <p className="converter-error">Insufficient points.</p>
                        )}

                        <button
                            className="convert-btn"
                            onClick={handleConvert}
                            disabled={
                                converting ||
                                !convertAmount ||
                                parseInt(convertAmount, 10) < 1000 ||
                                parseInt(convertAmount, 10) > (stats.points || 0)
                            }
                        >
                            {converting ? <div className="mini-spinner" /> : "Convert Now"}
                        </button>
                    </div>
                </div>
            </div>
        </Dashboard>
    );
}