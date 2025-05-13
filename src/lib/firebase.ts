// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// WARNING: This configuration is publicly visible in your client-side code.
// Ensure you have appropriate Firebase Security Rules in place for Firestore
// to protect your data from unauthorized access.
const firebaseConfig = {
  apiKey: "AIzaSyDPTUEAFY1wXBrCo7pURNQNo4T9q6SvHPc", // This key is publicly visible
  authDomain: "wesso-app.firebaseapp.com",
  projectId: "wesso-app",
  storageBucket: "wesso-app.firebasestorage.app",
  messagingSenderId: "427818187199",
  appId: "1:427818187199:web:2ac302bcb95e6efae0c90a"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);

export { app, db };
