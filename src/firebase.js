import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 
import { getStorage } from "firebase/storage"; // ✅ Import Firebase Storage

const firebaseConfig = {
  apiKey: "AIzaSyCzLGJPus8KtFVvmyhNnk9Zg2tJfFJ12nI",
  authDomain: "mysterio-s-game-6cbce.firebaseapp.com",
  projectId: "mysterio-s-game-6cbce",
  storageBucket: "mysterio-s-game-6cbce.appspot.com", // ✅ Make sure this is correct
  messagingSenderId: "86816808628",
  appId: "1:86816808628:web:bfd82c0cb5642fbc19c1e1",
  measurementId: "G-X7XL773F7M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // ✅ Initialize Firebase Storage

export { auth, db, storage }; // ✅ Export storage
