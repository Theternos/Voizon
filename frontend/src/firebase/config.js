import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsxGCLgTnVFGJWeZ0i2NDlL3E8Gp8ZiAU",
  authDomain: "ternos-voizon.firebaseapp.com",
  projectId: "ternos-voizon",
  storageBucket: "ternos-voizon.firebasestorage.app",
  messagingSenderId: "393400119253",
  appId: "1:393400119253:web:1ea736c18e490d51f2175c",
  measurementId: "G-LGF8J8DNSM",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage  = getFirestore(app);
export { db, auth, provider, storage  };