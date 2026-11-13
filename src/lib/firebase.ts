import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  onSnapshot, 
  collection, 
  getDocs, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with custom databaseId if configured
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Validate connection to Firestore as mandated by skill
if (typeof window !== 'undefined') {
  async function testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn("Aviso de conectividade Firebase Firestore:", error.message);
      }
    }
  }
  testConnection();
}

// Enable offline persistence in browser if supported
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore offline persistence warning: multiple tabs open.');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore offline persistence is not supported in this browser.');
      }
    });
  } catch (e) {
    // ignore
  }
}

export const WORKSHOP_DOC_ID = 'kaen_shared_database';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Save specific workshop dataset to Firestore
 * Writes both to main shared document and collection document for 100% cloud durability
 */
export async function saveWorkshopFieldToCloud(key: string, value: any): Promise<void> {
  if (typeof value === 'undefined') return;
  const pathForWrite = `workshops/${WORKSHOP_DOC_ID}`;
  try {
    const docRef = doc(db, 'workshops', WORKSHOP_DOC_ID);
    await setDoc(docRef, { [key]: value, lastUpdatedAt: new Date().toISOString() }, { merge: true });

    // Also persist to collection-level document to guard against 1MB single-document limits
    const cleanKey = key.replace(/^kaenpro_[^_]+_/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (cleanKey && cleanKey !== key) {
      try {
        const colRef = doc(db, 'workshop_collections', cleanKey);
        await setDoc(colRef, { data: value, key: cleanKey, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (colErr) {
        console.warn("Secondary collection write warning:", colErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

/**
 * Fetch all workshop data from Firestore
 */
export async function fetchAllWorkshopDataFromCloud(): Promise<Record<string, any> | null> {
  const pathForGet = `workshops/${WORKSHOP_DOC_ID}`;
  try {
    const docRef = doc(db, 'workshops', WORKSHOP_DOC_ID);
    const snap = await getDoc(docRef);
    let result: Record<string, any> = {};
    if (snap.exists()) {
      result = { ...snap.data() };
    }

    // Also read collection-level documents if available to ensure full coverage
    try {
      const colSnaps = await getDocs(collection(db, 'workshop_collections'));
      colSnaps.forEach((d) => {
        const colData = d.data();
        if (colData && typeof colData.data !== 'undefined') {
          result[`kaenpro_rafael_${d.id}`] = colData.data;
        }
      });
    } catch (e) {
      // non-blocking
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathForGet);
    return null;
  }
}

/**
 * Subscribe to real-time changes from Firestore
 * Returns an unsubscribe function
 */
export function subscribeToWorkshopCloud(onUpdate: (data: Record<string, any>) => void): () => void {
  const pathForSubscribe = `workshops/${WORKSHOP_DOC_ID}`;
  const docRef = doc(db, 'workshops', WORKSHOP_DOC_ID);
  
  return onSnapshot(
    docRef, 
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Record<string, any>;
        onUpdate(data);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, pathForSubscribe);
    }
  );
}

export default db;
