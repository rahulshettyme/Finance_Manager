// Firebase Configuration
// Replace with your app's Firebase project configuration
// See: https://console.firebase.google.com/
const firebaseConfig = {
    apiKey: "AIzaSyBZNj4shoYON2p5aRMdUSIl0MNRwFsSU6k",
    authDomain: "financemanager-94aa1.firebaseapp.com",
    projectId: "financemanager-94aa1",
    storageBucket: "financemanager-94aa1.firebasestorage.app",
    messagingSenderId: "33090773355",
    appId: "1:33090773355:web:3b08d0bee75cf04fb6ac2e"
};

// Initialize Firebase
// Note: We use the compat library (v8) style because we are loading via CDN script tags in HTML
const firebaseApp = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser does not support all of the features required to enable persistence');
        }
    });
