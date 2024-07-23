// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1JBMjubDPWnL_j6YLxexad69sJx9POMM",
  authDomain: "reels-f9d69.firebaseapp.com",
  projectId: "reels-f9d69",
  storageBucket: "reels-f9d69.appspot.com",
  messagingSenderId: "571827259102",
  appId: "1:571827259102:web:dba50af19d67310e09644f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);
const db = getFirestore(app);

export { auth, provider, storage, db };