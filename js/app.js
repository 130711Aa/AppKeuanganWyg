/**
 * FinFlow PWA - Main Application Bootstrap
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI Controller
  UI.init();

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('FinFlow ServiceWorker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.log('FinFlow ServiceWorker registration skipped/failed:', err);
        });
    });
  }

  // Network & Firebase Cloud Status Indicator Listener
  function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const syncText = document.getElementById('header-sync-status');
    const syncDot = document.getElementById('header-sync-dot');

    if (syncText && syncDot) {
      if (!isOnline) {
        syncText.textContent = 'Mode Offline';
        syncDot.className = 'w-1.5 h-1.5 rounded-full bg-tertiary-container';
      } else if (window.FirebaseSync && window.FirebaseSync.isConnected()) {
        syncText.textContent = 'Firestore Synced';
        syncDot.className = 'w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse';
      } else if (window.FirebaseSync && window.FirebaseSync.isConfigured()) {
        syncText.textContent = 'Cloud Siap';
        syncDot.className = 'w-1.5 h-1.5 rounded-full bg-tertiary-fixed';
      } else {
        syncText.textContent = 'Penyimpanan Lokal';
        syncDot.className = 'w-1.5 h-1.5 rounded-full bg-primary-container';
      }
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Try initializing Firebase when module is ready
  const checkFirebaseInterval = setInterval(() => {
    if (window.FirebaseSync) {
      clearInterval(checkFirebaseInterval);
      window.FirebaseSync.initFirebase().then(() => {
        updateOnlineStatus();
      });

      window.FirebaseSync.subscribeStatus((status, details) => {
        updateOnlineStatus();
        if (window.UI && window.UI.renderCurrentView) {
          window.UI.renderCurrentView();
        }
      });
    }
  }, 100);
});
