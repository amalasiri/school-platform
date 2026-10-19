import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, Database } from 'firebase/database';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import { EvidenceFile } from '../types';

export interface FirebaseDeadlinePayload {
  deadline: string;
  isManuallyLocked: boolean;
  updatedBy: string;
  updatedAt: string;
}

// User-provided Firebase configuration with environment fallback
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBTe6m2yBJfgBQNQfWCZCViANmy6EgYhQU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "school-platform-c5a5b.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://school-platform-c5a5b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "school-platform-c5a5b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "school-platform-c5a5b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "189444406697",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:189444406697:web:c03ee27dc10baec9cb18b8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-249NNM31LV",
};

let app: FirebaseApp | null = null;
let rtdb: Database | null = null;
let firestore: Firestore | null = null;

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

export const initFirebase = (): { app: FirebaseApp | null; rtdb: Database | null; firestore: Firestore | null } => {
  if (!isFirebaseConfigured()) {
    return { app: null, rtdb: null, firestore: null };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    rtdb = getDatabase(app);
    firestore = getFirestore(app);
    return { app, rtdb, firestore };
  } catch (error) {
    console.warn('Firebase initialization notice:', error);
    return { app, rtdb, firestore };
  }
};

export const firebaseService = {
  isConfigured: isFirebaseConfigured,

  getConfigInfo() {
    return {
      isConfigured: isFirebaseConfigured(),
      projectId: firebaseConfig.projectId,
      databaseUrl: firebaseConfig.databaseURL,
    };
  },

  // Save deadline to Realtime Database and Firestore
  async saveTeacherDeadline(
    deadline: string,
    isManuallyLocked: boolean,
    updatedBy: string = 'مديرة المدرسة/ إيمان الشعبي'
  ): Promise<boolean> {
    const payload: FirebaseDeadlinePayload = {
      deadline,
      isManuallyLocked,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    let saved = false;

    // 1. Direct REST save to Realtime Database (guaranteed high reliability)
    try {
      const restUrl = `${firebaseConfig.databaseURL}/settings/deadline.json`;
      const res = await fetch(restUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) saved = true;
    } catch (e) {
      console.warn('Firebase REST update warning:', e);
    }

    // 2. Realtime Database SDK
    try {
      const { rtdb } = initFirebase();
      if (rtdb) {
        const deadlineRef = ref(rtdb, 'settings/deadline');
        await set(deadlineRef, payload);
        saved = true;
      }
    } catch (e) {
      console.warn('Firebase RTDB SDK warning:', e);
    }

    // 3. Firestore Document
    try {
      const { firestore } = initFirebase();
      if (firestore) {
        const docRef = doc(firestore, 'settings', 'teachers_deadline');
        await setDoc(docRef, payload, { merge: true });
        saved = true;
      }
    } catch (e) {
      console.warn('Firestore doc update warning:', e);
    }

    return saved;
  },

  // Fetch deadline from Realtime Database or Firestore
  async fetchTeacherDeadline(): Promise<FirebaseDeadlinePayload | null> {
    // 1. Try REST API first for instant, cross-origin response
    try {
      const restUrl = `${firebaseConfig.databaseURL}/settings/deadline.json`;
      const res = await fetch(restUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.deadline) {
          return data as FirebaseDeadlinePayload;
        }
      }
    } catch (e) {
      console.warn('Firebase REST fetch warning:', e);
    }

    // 2. Try Realtime Database SDK
    try {
      const { rtdb } = initFirebase();
      if (rtdb) {
        const deadlineRef = ref(rtdb, 'settings/deadline');
        const snap = await get(deadlineRef);
        if (snap.exists()) {
          return snap.val() as FirebaseDeadlinePayload;
        }
      }
    } catch (e) {
      console.warn('Firebase RTDB SDK fetch warning:', e);
    }

    // 3. Try Firestore SDK
    try {
      const { firestore } = initFirebase();
      if (firestore) {
        const docRef = doc(firestore, 'settings', 'teachers_deadline');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as FirebaseDeadlinePayload;
        }
      }
    } catch (e) {
      console.warn('Firestore fetch warning:', e);
    }

    return null;
  },

  // Real-time live synchronization listener
  subscribeToDeadline(callback: (data: FirebaseDeadlinePayload) => void): () => void {
    try {
      const { rtdb } = initFirebase();
      if (rtdb) {
        const deadlineRef = ref(rtdb, 'settings/deadline');
        const unsubscribe = onValue(deadlineRef, (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.val() as FirebaseDeadlinePayload);
          }
        });
        return unsubscribe;
      }
    } catch (err) {
      console.warn('Firebase RTDB subscription warning:', err);
    }
    return () => {};
  },

  // Save evidence metadata to Firebase Realtime Database
  async saveEvidenceMetadata(evidence: EvidenceFile): Promise<boolean> {
    try {
      const restUrl = `${firebaseConfig.databaseURL}/evidence/${evidence.id}.json`;
      await fetch(restUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evidence),
      });
      return true;
    } catch (e) {
      console.warn('Failed to sync evidence to Firebase:', e);
      return false;
    }
  },
};
