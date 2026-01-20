import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC38QoALJEQ9ZJX1IoPKNL3YFkMPloUql8",
  authDomain: "yunxu-ai-dev.firebaseapp.com",
  projectId: "yunxu-ai-dev",
  storageBucket: "yunxu-ai-dev.firebasestorage.app",
  messagingSenderId: "191442069262",
  appId: "1:191442069262:web:4bd98acfc9122baa3b995f",
};

const firebaseApp = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
