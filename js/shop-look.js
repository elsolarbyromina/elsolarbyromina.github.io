// js/shop-look.js
import { db } from './config.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Inyectar CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'css/shop-look.css';
document.head.appendChild(link);

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. Buscar dónde inyectar (Ej: Antes del footer o de la sección de info)
    const targetSection = document.querySelector('.info-section') || document.getElementById('footer-container');
    if(!targetSection) return;

    // 2. Obtener Lookbook Activo (Tomamos el último creado)
    try {
        const q = query(collection(db, "lookbooks"), orderBy("timestamp", "desc"), limit(1));
        const snap = await getDocs(q);

        if(snap.empty) return;

        const data = snap.docs[0].data();
        if(!data.active) return;

        // 3. Crear HTML
        const section = document.createElement('section');
        section.id = 'shop-the-look-section';
        section.className = 'reveal'; // Usamos tu clase de animación existente
        
        let hotspotsHTML = '';
        
        data.hotspots.forEach(spot => {
            hotspotsHTML += `
                <div class="stl-dot" style="top: ${spot.y}%; left: ${spot.x}%;">
                    <div class="stl-tooltip">
                        <img src="${spot.productImg}" class="stl-thumb">
                        <div class="stl-name">${spot.productName}</div>
                        <div class="stl-price">$${spot.productPrice}</div>
                        <button class="stl-btn" onclick="addToCart(${spot.productId})">Agregar</button>
                    </div>
                </div>
            `;
        });

        section.innerHTML = `
            <h2 class="stl-title">Inspirate & Compra el Look ✨</h2>
            <div class="stl-container">
                <img src="${data.image}" class="stl-main-img" alt="Lookbook">
                ${hotspotsHTML}
            </div>
        `;

        // 4. Insertar en el DOM
        targetSection.before(section);

    } catch (e) {
        console.error("Error cargando Shop the Look:", e);
    }
});