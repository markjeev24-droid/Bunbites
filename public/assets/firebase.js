// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Replace the block below with your actual Firebase project settings 
// found in Project Settings > General > Your Apps (Web App)
const firebaseConfig = {
  apiKey: "AIzaSyAnIBTl_WwH4QwCq0CtjtCEU3mqGFOf-bI",
  authDomain: "bunbites-donuts.firebaseapp.com",
  projectId: "bunbites-donuts",
  storageBucket: "bunbites-donuts.firebasestorage.app",
  messagingSenderId: "231983460111",
  appId: "1:231983460111:web:01551a878de368031a987a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export instances to be used in all branches
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

