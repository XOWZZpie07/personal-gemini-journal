import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { JournalEntry, ConversationTurn, UserProfile } from "../types";

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Initialize Firestore targeting the provisioned database ID
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.warn("Popup sign-in failed or blocked, attempting redirect...", error);
    if (error.code === "auth/popup-blocked" || error.code === "auth/cancelled-popup-request") {
      await signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
}

export async function signInGuest(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error("Guest authentication failed:", error);
    throw error;
  }
}

export async function checkRedirectAuth(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await syncUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Error checking redirect auth result:", error);
    return null;
  }
}

export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// User Profile Isolation & Record
export async function syncUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;
  try {
    const userDocRef = doc(db, "users", user.uid);
    const profileData: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: new Date().toISOString(),
    };
    await setDoc(userDocRef, profileData, { merge: true });
  } catch (err) {
    console.error("Failed to sync user profile to Firestore:", err);
  }
}

// Firestore Subcollection Reference: /users/{userId}/entries/{entryId}
export function getUserEntriesCollection(userId: string) {
  return collection(db, "users", userId, "entries");
}

// Subscribe to real-time updates of user entries (strictly isolated by userId)
export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) return () => {};

  const entriesRef = collection(db, "users", userId, "entries");
  const q = query(entriesRef, orderBy("updatedAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          id: docSnap.id,
          userId: data.userId || userId,
          title: data.title || "Untitled Reflection",
          initialContent: data.initialContent || "",
          mood: data.mood || "Balanced",
          tags: data.tags || [],
          turns: Array.isArray(data.turns) ? data.turns : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          pinned: Boolean(data.pinned),
        });
      });
      onUpdate(entries);
    },
    (err) => {
      console.error("Firestore listener error on user entries:", err);
      if (onError) onError(err);
    }
  );
}

// Timeout helper to prevent infinite hanging when network is interrupted
function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs: number = 6000, contextDesc: string = "Operation"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Something went wrong. Please try again."));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Create a new Journal Entry with isolated subcollection path
export async function createJournalEntry(
  userId: string,
  entry: Omit<JournalEntry, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<JournalEntry> {
  if (!userId) {
    throw new Error("Something went wrong. Authentication required. Please try again.");
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Something went wrong. Please check your internet connection and try again.");
  }

  const entriesRef = collection(db, "users", userId, "entries");
  const newEntryRef = doc(entriesRef);
  const now = new Date().toISOString();

  const newEntry: JournalEntry = {
    id: newEntryRef.id,
    userId,
    title: entry.title.trim() || "Untitled Reflection",
    initialContent: entry.initialContent,
    mood: entry.mood || "Balanced",
    tags: entry.tags || [],
    turns: entry.turns || [],
    createdAt: now,
    updatedAt: now,
    pinned: Boolean(entry.pinned),
  };

  try {
    await withFirestoreTimeout(
      setDoc(newEntryRef, newEntry),
      6000,
      "Saving journal entry to Cloud Firestore"
    );
    return newEntry;
  } catch (err: any) {
    console.error("[Firestore createJournalEntry error]:", err);
    throw new Error("Something went wrong. Please try again.");
  }
}

// Append a multi-turn conversation turn to an existing entry
export async function appendTurnToEntry(
  userId: string,
  entryId: string,
  newTurn: ConversationTurn
): Promise<void> {
  if (!userId || !entryId) throw new Error("Something went wrong. Please try again.");

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Something went wrong. Please check your internet connection and try again.");
  }

  try {
    const entryRef = doc(db, "users", userId, "entries", entryId);
    const entrySnap = await withFirestoreTimeout(
      getDoc(entryRef),
      6000,
      "Retrieving conversation from Firestore"
    );

    if (!entrySnap.exists()) {
      throw new Error("Something went wrong. Journal entry not found. Please try again.");
    }

    const existingTurns = entrySnap.data().turns || [];
    const updatedTurns = [...existingTurns, newTurn];

    await withFirestoreTimeout(
      updateDoc(entryRef, {
        turns: updatedTurns,
        updatedAt: new Date().toISOString(),
      }),
      6000,
      "Updating conversation in Firestore"
    );
  } catch (err: any) {
    console.error("[Firestore appendTurnToEntry error]:", err);
    throw new Error("Something went wrong. Please try again.");
  }
}

// Delete a user entry
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error("Invalid parameters for deletion.");
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Cannot delete entry while offline. Please reconnect and retry.");
  }
  const entryRef = doc(db, "users", userId, "entries", entryId);
  await withFirestoreTimeout(deleteDoc(entryRef), 10000, "Deleting journal entry");
}

// Toggle pinned status of entry
export async function togglePinEntry(userId: string, entryId: string, currentPinned: boolean): Promise<void> {
  if (!userId || !entryId) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Cannot update pin while offline.");
  }
  const entryRef = doc(db, "users", userId, "entries", entryId);
  await withFirestoreTimeout(
    updateDoc(entryRef, {
      pinned: !currentPinned,
      updatedAt: new Date().toISOString(),
    }),
    10000,
    "Updating pin status"
  );
}
