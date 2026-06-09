import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Agregamos esta línea

const firebaseConfig = {
  apiKey: "AIzaSyAuFFFHvWA5MY-RXHgiotoKihQ_tsFxgwg",
  authDomain: "villagra-mendez-erp.firebaseapp.com",
  projectId: "villagra-mendez-erp",
  storageBucket: "villagra-mendez-erp.firebasestorage.app",
  messagingSenderId: "456832034083",
  appId: "1:456832034083:web:18e56cc8697a7a89579896"
};

// Inicializa Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Inicializamos la autenticación

export { db, auth }; // Exportamos auth también