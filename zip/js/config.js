// js/config.js

// 1. Importar las funciones de Firebase desde la nube (CDN)
// Usamos la versión 10.7.1 para asegurar compatibilidad
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. Configuración de Firebase
// Estos son los datos de tu proyecto "el-solar-by-romina"
const firebaseConfig = {
  apiKey: "AIzaSyBeIFz8GsCezPitc-worEf1RVY7u5UdNs8",
  authDomain: "el-solar-by-romina.firebaseapp.com",
  projectId: "el-solar-by-romina",
  storageBucket: "el-solar-by-romina.firebasestorage.app",
  messagingSenderId: "708832177266",
  appId: "1:708832177266:web:d5564c3408a867753be6eb"
};

// 3. Inicializar la Aplicación de Firebase
const app = initializeApp(firebaseConfig);

// 4. Inicializar el servicio de Base de Datos (Firestore)
const db = getFirestore(app);

// 5. Exportar la base de datos (db)
// Esto permite que 'script.js' y 'admin.js' puedan usarla.
export { db };