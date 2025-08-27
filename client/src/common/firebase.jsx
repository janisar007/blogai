import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBaSvnDcPNuYbECwMIPeYE4JfFnhocnMf0",
  authDomain: "blogio-42f85.firebaseapp.com",
  projectId: "blogio-42f85",
  storageBucket: "blogio-42f85.firebasestorage.app",
  messagingSenderId: "406631274023",
  appId: "1:406631274023:web:8e7525f0dc7b0935656002",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// google auth
const provider = new GoogleAuthProvider();

const storage = getStorage(app);
const auth = getAuth(app);

const authWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return idToken;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export { auth, provider, storage, ref, uploadBytesResumable, getDownloadURL, authWithGoogle };
