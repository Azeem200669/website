import { db } from '../firebase/firestore';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, 
  query, orderBy, serverTimestamp, arrayUnion, arrayRemove, increment, deleteField 
} from 'firebase/firestore';

// 1. Listen to all Events
export const listenToEvents = (callback) => {
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(events);
  });
};

// 2. Create a new Event
export const createEvent = async (uid, eventData, userData) => {
  await addDoc(collection(db, 'events'), {
    ...eventData,
    createdBy: uid,
    hostType: eventData.hostType || 'user',
    hostId: eventData.hostId || uid,
    hostName: eventData.hostName || 'Unknown Host',
    hostAvatar: eventData.hostAvatar || null,
    attendeeIds: [uid],
    attendeeCount: 1,
    attendeesMap: {
      [uid]: { name: userData?.name || 'You', avatar: userData?.avatar || null }
    },
    createdAt: serverTimestamp()
  });
};

// 3. Toggle "Join/Going" status
export const toggleEventAttendance = async (eventId, uid, isAttending, userData) => {
  const eventRef = doc(db, 'events', eventId);
  if (isAttending) {
    await updateDoc(eventRef, {
      attendeeIds: arrayRemove(uid),
      attendeeCount: increment(-1),
      [`attendeesMap.${uid}`]: deleteField()
    });
  } else {
    await updateDoc(eventRef, {
      attendeeIds: arrayUnion(uid),
      attendeeCount: increment(1),
      [`attendeesMap.${uid}`]: { name: userData?.name || 'Guest', avatar: userData?.avatar || null }
    });
  }
};

// 4. Delete Event
export const deleteEvent = async (eventId) => {
  await deleteDoc(doc(db, 'events', eventId));
};

// 5. ✅ Update/Edit Event (THIS WAS MISSING)
export const updateEvent = async (eventId, updatedData) => {
  const eventRef = doc(db, 'events', eventId);
  await updateDoc(eventRef, updatedData);
};