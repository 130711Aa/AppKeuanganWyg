/**
 * FinFlow PWA - Firebase & Cloud Sync Module (Modular ESM)
 * Uses official Firebase SDK v10 from Google CDN.
 * Provides Local-First bi-directional sync with Firestore.
 */

import { initializeApp, getApps, deleteApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  getDocs 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

const FirebaseSync = (function() {
  const CONFIG_KEY = 'finflow_firebase_config_v1';
  
  // Embedded Default Firebase Configuration for appkeuanganwyg
  const DEFAULT_CONFIG = {
    apiKey: "AIzaSyAuOdOajsBWi_v6LCxKjXnvUvKMHBoFpnA",
    authDomain: "appkeuanganwyg.firebaseapp.com",
    projectId: "appkeuanganwyg",
    storageBucket: "appkeuanganwyg.firebasestorage.app",
    messagingSenderId: "223963305768",
    appId: "1:223963305768:web:f301bdae2b6372ce35221d",
    measurementId: "G-DPCXLSPRXM"
  };

  let app = null;
  let auth = null;
  let db = null;
  let currentUser = null;
  let isSyncingFromRemote = false;
  let unsubscribeListeners = [];

  // Listeners for UI state
  const statusListeners = [];
  function subscribeStatus(fn) {
    statusListeners.push(fn);
    return () => {
      const idx = statusListeners.indexOf(fn);
      if (idx !== -1) statusListeners.splice(idx, 1);
    };
  }

  function notifyStatus(status, details = {}) {
    statusListeners.forEach(fn => {
      try {
        fn(status, details);
      } catch (err) {
        console.error('Firebase status listener error:', err);
      }
    });
  }

  // Load config with fallback to embedded project credentials
  function getConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_CONFIG;
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  }

  function saveConfig(cfg) {
    if (!cfg || !cfg.apiKey || !cfg.projectId) {
      throw new Error('Konfigurasi Firebase tidak lengkap (minimal apiKey & projectId).');
    }
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    return initFirebase();
  }

  function removeConfig() {
    localStorage.removeItem(CONFIG_KEY);
    return initFirebase(); // Revert back to DEFAULT_CONFIG
  }

  // Initialize Firebase App
  async function initFirebase() {
    const config = getConfig();
    if (!config || !config.apiKey) {
      notifyStatus('NOT_CONFIGURED');
      return false;
    }

    try {
      // Clean up previous instance if any
      if (app) {
        disconnectListeners();
        const existingApps = getApps();
        if (existingApps.length > 0) {
          await deleteApp(app);
        }
      }

      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);

      // Listen to Auth State & Auto-login seamlessly
      onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
          notifyStatus('AUTHENTICATED', { user });
          startRealtimeSync(user.uid);
        } else {
          // Automatic 1-click frictionless anonymous login
          try {
            await signInAnonymously(auth);
          } catch (authErr) {
            console.warn('Anonymous auto-login notice (check Firebase Auth enabled in console):', authErr);
            disconnectListeners();
            notifyStatus('UNAUTHENTICATED');
          }
        }
      });

      notifyStatus('INITIALIZED');
      return true;
    } catch (err) {
      console.error('Firebase init error:', err);
      notifyStatus('ERROR', { error: err.message });
      return false;
    }
  }

  // --- AUTHENTICATION ---
  async function loginAnonymously() {
    if (!auth) throw new Error('Firebase belum diinisialisasi. Periksa konfigurasi Anda.');
    try {
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch (err) {
      console.error('Anonymous auth error:', err);
      throw err;
    }
  }

  async function loginWithGoogle() {
    if (!auth) throw new Error('Firebase belum diinisialisasi. Periksa konfigurasi Anda.');
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      return cred.user;
    } catch (err) {
      console.error('Google auth error:', err);
      throw err;
    }
  }

  async function logout() {
    if (!auth) return;
    disconnectListeners();
    await signOut(auth);
    currentUser = null;
    notifyStatus('LOGGED_OUT');
  }

  function disconnectListeners() {
    unsubscribeListeners.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    unsubscribeListeners = [];
  }

  function disconnect() {
    disconnectListeners();
    if (auth && currentUser) {
      signOut(auth).catch(() => {});
    }
    currentUser = null;
  }

  // --- BI-DIRECTIONAL REAL-TIME SYNC ---
  function startRealtimeSync(uid) {
    if (!db || !uid) return;
    disconnectListeners();

    // 1. Initial Push of Local Data to Cloud if cloud is empty
    syncLocalToCloud(uid);

    // 2. Listen to Remote Transactions
    const txColRef = collection(db, 'users', uid, 'transactions');
    const unsubTx = onSnapshot(txColRef, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        // Local echo, skip to avoid double rendering
        return;
      }
      
      const remoteTxs = [];
      snapshot.forEach(docSnap => {
        remoteTxs.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (remoteTxs.length > 0 && window.Store && window.Store.mergeRemoteTransactions) {
        isSyncingFromRemote = true;
        window.Store.mergeRemoteTransactions(remoteTxs);
        isSyncingFromRemote = false;
        notifyStatus('SYNC_COMPLETED', { type: 'transactions', count: remoteTxs.length });
      }
    }, (err) => {
      console.warn('Firestore tx onSnapshot error:', err);
    });

    // 3. Listen to Remote Budget Config
    const budgetDocRef = doc(db, 'users', uid, 'budgets', 'current');
    const unsubBudget = onSnapshot(budgetDocRef, (docSnap) => {
      if (docSnap.exists() && !docSnap.metadata.hasPendingWrites) {
        const remoteBudget = docSnap.data();
        if (window.Store && window.Store.mergeRemoteBudget) {
          isSyncingFromRemote = true;
          window.Store.mergeRemoteBudget(remoteBudget);
          isSyncingFromRemote = false;
          notifyStatus('SYNC_COMPLETED', { type: 'budget' });
        }
      }
    }, (err) => {
      console.warn('Firestore budget onSnapshot error:', err);
    });

    unsubscribeListeners.push(unsubTx, unsubBudget);
  }

  // Sync initial local dataset to Firestore
  async function syncLocalToCloud(uid) {
    if (!db || !uid || !window.Store) return;
    try {
      notifyStatus('SYNC_STARTED');
      const localTxs = window.Store.getTransactions();
      const localCategories = window.Store.getCategories();
      const localBudget = window.Store.getBudgetConfig();

      // Check if remote already has transactions
      const txColRef = collection(db, 'users', uid, 'transactions');
      const remoteSnapshot = await getDocs(txColRef);

      if (remoteSnapshot.empty && localTxs.length > 0) {
        // Upload initial local transactions
        for (const tx of localTxs) {
          const txDocRef = doc(db, 'users', uid, 'transactions', tx.id);
          await setDoc(txDocRef, tx);
        }
      }

      // Sync budget config
      const budgetDocRef = doc(db, 'users', uid, 'budgets', 'current');
      await setDoc(budgetDocRef, {
        ...localBudget,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      notifyStatus('SYNC_COMPLETED', { initial: true });
    } catch (err) {
      console.error('Initial sync error:', err);
      notifyStatus('SYNC_ERROR', { error: err.message });
    }
  }

  // Push individual changes triggered by local user action
  async function pushChange(eventType, data) {
    if (isSyncingFromRemote || !db || !currentUser) return;
    const uid = currentUser.uid;

    try {
      if (eventType === 'TRANSACTION_ADDED' || eventType === 'TRANSACTION_UPDATED') {
        const txDocRef = doc(db, 'users', uid, 'transactions', data.id);
        await setDoc(txDocRef, data, { merge: true });
      } else if (eventType === 'TRANSACTION_DELETED') {
        const txDocRef = doc(db, 'users', uid, 'transactions', data.id);
        await deleteDoc(txDocRef);
      } else if (eventType === 'BUDGET_CONFIG_UPDATED' || eventType === 'BUDGET_LIMIT_UPDATED') {
        const budgetDocRef = doc(db, 'users', uid, 'budgets', 'current');
        await setDoc(budgetDocRef, {
          ...data,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore pushChange error (offline or quota):', err);
    }
  }

  return {
    getConfig,
    saveConfig,
    removeConfig,
    initFirebase,
    loginAnonymously,
    loginWithGoogle,
    logout,
    pushChange,
    getCurrentUser: () => currentUser,
    isConfigured: () => Boolean(getConfig()?.apiKey),
    isConnected: () => Boolean(currentUser),
    subscribeStatus
  };
})();

// Expose globally
if (typeof window !== 'undefined') {
  window.FirebaseSync = FirebaseSync;
}

export default FirebaseSync;
