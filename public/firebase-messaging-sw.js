// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
// Replace 10.13.2 with latest version of the Firebase JS SDK.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: 'https://VITE_FIREBASE_PROJECT_ID.firebaseio.com',
  projectId: VITE_FIREBASE_PROJECT_ID,
  storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: VITE_FIREBASE_APP_ID,
  measurementId: VITE_FIREBASE_MEASUREMENT_ID,
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  const link = payload.fcmOptions?.link || payload.data?.link;
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image,
    data: {url: link},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
self.addEventListener('notificationclick', function (event) {
 console.log("[firebase-messaging-sw.js] Notification click Received.");
  event.notification.close();

  event.waitUntil(
    clients.matchAll({type: "window", includeUncontrolled: true}).then(function (clientList) {

      const url = event.notification.data.url;

      if(!url) return;

      for(const client of clientList) {
        if(client.url === url && 'focus' in client) {
          return client.focus();
        }
      }

      if(clients.openWindow) {
        console.log("openwindow on client");
        return clients.openWindow(url);
      }
    })
  );
});