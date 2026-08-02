import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firestore";

/* ===========================
   Badge CRUD
=========================== */

export const createBadge = async ({
    name,
    description,
    icon,
    color,
    rarity,
    category,
}) => {
    return await addDoc(collection(db, "badges"), {
        name,
        description,
        icon,
        color,
        rarity,
        category,
        createdAt: serverTimestamp(),
    });
};

export const updateBadge = async (
    badgeId,
    data
) => {
    await updateDoc(
        doc(db, "badges", badgeId),
        data
    );
};

export const deleteBadge = async (
    badgeId
) => {
    await deleteDoc(doc(db, "badges", badgeId));
};

/* ===========================
   Live Badge Listener
=========================== */

export const subscribeToBadges = (
    callback
) => {
    const q = query(
        collection(db, "badges"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        callback(
            snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
        );
    });
};

/* ===========================
   Get Users
=========================== */

export const getUsers = async () => {
    const snapshot = await getDocs(
        collection(db, "users")
    );

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
};

/* ===========================
   Assign Badge
=========================== */

export const assignBadge = async (
    uid,
    badgeId
) => {
    await updateDoc(doc(db, "users", uid), {
        badges: arrayUnion(badgeId),
    });
};

/* ===========================
   Remove Badge
=========================== */

export const removeBadge = async (
    uid,
    badgeId
) => {
    await updateDoc(doc(db, "users", uid), {
        badges: arrayRemove(badgeId),
    });
};