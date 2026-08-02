import { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firestore";

export default function UserBadges({
    badgeIds = [],
}) {

    const [badges, setBadges] = useState([]);

    useEffect(() => {

        const unsubscribe = onSnapshot(
            collection(db, "badges"),
            (snapshot) => {

                const allBadges =
                    snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                setBadges(
                    allBadges.filter((badge) =>
                        badgeIds.includes(badge.id)
                    )
                );

            }
        );

        return unsubscribe;

    }, [badgeIds]);

    if (badges.length === 0)
        return null;

    return (
        <div className="user-badges">

            {badges.map((badge) => (

                <div
                    key={badge.id}
                    className="badge-item"
                    title={badge.description}
                >

                    <span
                        style={{
                            color: badge.color,
                            fontSize: "24px",
                        }}
                    >
                        {badge.icon}
                    </span>

                </div>

            ))}

        </div>
    );
}