// js/video-widget.js
import { db } from './config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Inyectar CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'css/video-widget.css';
document.head.appendChild(link);

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. Obtener Configuración
    try {
        const snap = await getDoc(doc(db, "settings", "video_widget"));
        if(!snap.exists()) return;

        const data = snap.data();
        if(!data.active || !data.videoUrl) return;

        renderVideoWidget(data);

    } catch (e) {
        console.error("Error cargando video widget:", e);
    }
});

function renderVideoWidget(data) {
    // HTML de la burbuja
    const bubbleHTML = `
        <div class="video-widget-bubble" onclick="openVideoModal()">
            <video class="video-mini-player" src="${data.videoUrl}" autoplay muted loop playsinline></video>
        </div>
        
        <div id="video-overlay" class="video-modal-overlay">
            <div class="video-player-card">
                <button class="video-close" onclick="closeVideoModal()">×</button>
                <video id="main-video" class="video-full" src="${data.videoUrl}" loop playsinline></video>
                
                <div class="product-overlay-card">
                    <img src="${data.productImg}" class="prod-thumb">
                    <div class="prod-info">
                        <h4>${data.productName}</h4>
                        <p>$${data.productPrice}</p>
                    </div>
                    <button class="btn-buy-video" onclick="buyFromVideo('${data.productId}')">
                        LO QUIERO 🛍️
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', bubbleHTML);
}

// Funciones Globales
window.openVideoModal = () => {
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('main-video');
    overlay.classList.add('active');
    video.currentTime = 0;
    video.muted = false; // Activar sonido
    video.play().catch(e => console.log("Interacción requerida para audio"));
};

window.closeVideoModal = () => {
    const overlay = document.getElementById('video-overlay');
    const video = document.getElementById('main-video');
    overlay.classList.remove('active');
    video.pause();
    video.muted = true;
};

window.buyFromVideo = (prodId) => {
    // Usamos la función global de tu script.js
    if(typeof addToCart === 'function') {
        // Convertimos ID a número si es necesario, o lo pasamos directo
        // Tu script usa IDs numéricos (1, 2...) o strings. Asumimos compatibilidad.
        addToCart(Number(prodId) || prodId); 
        closeVideoModal();
        
        // Efecto visual extra
        alert("¡Producto agregado al carrito! 🛒");
    } else {
        console.error("Función addToCart no encontrada");
    }
};