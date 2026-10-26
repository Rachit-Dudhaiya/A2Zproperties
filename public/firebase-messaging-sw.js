// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// IMPORTANT: files in /public are served as-is and are NOT processed by Vite,
// so import.meta.env / VITE_* variables do NOT work here. The Firebase web
// config must be written directly. These are public client-side identifiers
// (same values as the VITE_FIREBASE_* vars in .env.local) — safe to ship.
firebase.initializeApp({
  apiKey: 'AIzaSyDv8Dw-j9Rfx4gh07yuJUR-cFM6rk1-8qo',
  authDomain: 'atozproperties-5ab23.firebaseapp.com',
  projectId: 'atozproperties-5ab23',
  storageBucket: 'atozproperties-5ab23.firebasestorage.app',
  messagingSenderId: '56304541545',
  appId: '1:56304541545:web:424911292cb60baf3127f8',
  measurementId: 'G-NP0YY5BYJV',
});

// Retrieve an instance of Firebase Messaging so that it can handle messages
// that arrive while the tab is in the background (or closed).
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);

  const notificationTitle =
    (payload && payload.notification && payload.notification.title) || 'A TO Z Properties';

  const link =
    (payload && payload.fcmOptions && payload.fcmOptions.link) ||
    (payload && payload.data && payload.data.link) ||
    '/dashboard';

  const notificationOptions = {
    body: (payload && payload.notification && payload.notification.body) || '',
    icon: (payload && payload.notification && payload.notification.image) || '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: link },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  event.notification.close();

  // Resolve to an absolute same-origin URL before opening/focusing a window.
  const rawUrl = (event.notification.data && event.notification.data.url) || '/dashboard';
  let url;
  try {
    url = new URL(rawUrl, self.location.origin).href;
  } catch (e) {
    url = self.location.origin + '/dashboard';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        console.log('[firebase-messaging-sw.js] opening window', url);
        return clients.openWindow(url);
      }
    })
  );
});
