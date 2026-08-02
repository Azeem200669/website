import {
    doc,
    runTransaction,
    collection,
    addDoc,
    serverTimestamp,
    getDoc,
} from "firebase/firestore";

import { db } from "../firebase/firestore";
import { createNotification } from "./notificationService";

/**
 * ==========================================
 * Send Diamonds
 * ==========================================
 */

export const sendDiamonds = async ({
    senderId,
    receiverId,
    amount,
    message = "",
}) => {
    if (!senderId || !receiverId)
        throw new Error("Invalid users.");

    if (senderId === receiverId)
        throw new Error("You can't send Diamonds to yourself.");

    if (amount <= 0)
        throw new Error("Amount must be greater than zero.");

    const senderRef = doc(db, "users", senderId);
    const receiverRef = doc(db, "users", receiverId);

    // ✅ Store sender name outside transaction for notification
    let senderName = "Orbit User";

    await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(senderRef);
        const receiverSnap = await transaction.get(receiverRef);

        if (!senderSnap.exists())
            throw new Error("Sender not found.");

        if (!receiverSnap.exists())
            throw new Error("Receiver not found.");

        const sender = senderSnap.data();
        const receiver = receiverSnap.data();

        const senderGems = sender.gems || 0;
        const receiverGems = receiver.gems || 0;

        if (senderGems < amount)
            throw new Error("Not enough Diamonds.");

        // ✅ Get sender name for notification
        senderName = sender.displayName || sender.username || sender.name || "Orbit User";

        transaction.update(senderRef, {
            gems: senderGems - amount,
        });

        transaction.update(receiverRef, {
            gems: receiverGems + amount,
        });

        const historyRef = doc(collection(db, "diamondTransactions"));

        transaction.set(historyRef, {
            senderId,
            senderName,
            receiverId,
            receiverName:
                receiver.displayName ||
                receiver.username ||
                receiver.name ||
                "Unknown",
            amount,
            message,
            type: "gift",
            status: "completed",
            createdAt: serverTimestamp(),
        });
    });

    // ✅ Now senderName is defined
    await createNotification(receiverId, {
        type: "gems_gift",
        title: "💎 Gems Gift",
        subtitle: `${senderName} sent you 💎 ${amount}${message ? `\n\n"${message}"` : ""}`,
        fromUserId: senderId,
    });

    return true;
};

/**
 * ==========================================
 * Get User Diamond Balance
 * ==========================================
 */

export const getDiamondBalance = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));

    if (!snap.exists())
        return 0;

    return snap.data().gems || 0;
};

/**
 * ==========================================
 * Give Diamonds (Owner/Admin Reward)
 * ==========================================
 */

export const addDiamonds = async (uid, amount) => {
    const userRef = doc(db, "users", uid);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userRef);

        if (!snap.exists())
            throw new Error("User not found.");

        const gems = snap.data().gems || 0;  // ✅ Fixed: was 'diamonds', should be 'gems'

        transaction.update(userRef, {
            gems: gems + amount,  // ✅ Fixed: was 'diamonds', should be 'gems'
        });
    });
};