// js/config.js

// 1. Importar las funciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; // <--- NUEVO

// 2. Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBeIFz8GsCezPitc-worEf1RVY7u5UdNs8",
  authDomain: "el-solar-by-romina.firebaseapp.com",
  projectId: "el-solar-by-romina",
  storageBucket: "el-solar-by-romina.firebasestorage.app",
  messagingSenderId: "708832177266",
  appId: "1:708832177266:web:d5564c3408a867753be6eb"
};

// 3. Inicializar la Aplicación
const app = initializeApp(firebaseConfig);

// 4. Inicializar los servicios
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); // <--- NUEVO: Inicializamos Auth

// 5. Exportar para usar en otros archivos
export { db, storage, auth };