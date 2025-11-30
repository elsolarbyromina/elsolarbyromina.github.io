// js/config.js

// Importar las funciones de Firebase desde la nube
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// --- PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE ---
// (Reemplaza estos datos con los que copiaste de la consola de Firebase)

const firebaseConfig = {
  apiKey: "AIzaSyBeIFz8GsCezPitc-worEf1RVY7u5UdNs8",
  authDomain: "el-solar-by-romina.firebaseapp.com",
  projectId: "el-solar-by-romina",
  storageBucket: "el-solar-by-romina.firebasestorage.app",
  messagingSenderId: "708832177266",
  appId: "1:708832177266:web:d5564c3408a867753be6eb"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar la base de datos para usarla en otros archivos
export { db };







