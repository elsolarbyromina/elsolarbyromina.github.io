// js/reviews-wall.js
import { db } from './config.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Inyectar CSS
const link = document.createElement('link');
link.rel = 'stylesheet'; link.href = 'css/reviews-wall.css';
document.head.appendChild(link);

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. Buscar dónde insertar (Antes del footer)
    const footer = document.getElementById('footer-container');
    if(!footer) return;

    // 2. Crear Sección
    const section = document.createElement('section');
    section.id = 'reviews-wall-section';
    section.innerHTML = `
        <h2 class="rw-title">Clientes Felices ❤️</h2>
        <p class="rw-subtitle">Así lucen nuestros productos en sus nuevos hogares.</p>
        <div class="rw-grid" id="rw-grid">
            <p style="text-align:center; width:100%;">Cargando fotos...</p>
        </div>
    `;
    footer.before(section);

    // 3. Cargar Reseñas
    try {
        const q = query(collection(db, "reviews_wall"), orderBy("timestamp", "desc"), limit(20));
        const snap = await getDocs(q);
        
        const grid = document.getElementById('rw-grid');
        grid.innerHTML = '';

        if(snap.empty) {
            section.style.display = 'none'; // Si no hay fotos, ocultamos todo
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'rw-item';
            item.innerHTML = `
                <img src="${data.image}" class="rw-img" loading="lazy">
                <div class="rw-overlay">
                    <div class="rw-stars">★★★★★</div>
                    <div class="rw-quote">"${data.quote}"</div>
                    <div class="rw-client"><i class="ph ph-user-circle"></i> ${data.clientName}</div>
                </div>
            `;
            item.onclick = () => openReviewModal(data);
            grid.appendChild(item);
        });

    } catch (e) {
        console.error("Error reviews wall:", e);
    }
});

// --- LIGHTBOX ---
window.openReviewModal = (data) => {
    // Si no existe el modal, crearlo
    let modal = document.getElementById('rw-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'rw-modal';
        modal.className = 'rw-modal';
        document.body.appendChild(modal);
    }

    // HTML del producto vinculado (si existe)
    let productHTML = '';
    if(data.productId) {
        productHTML = `
            <div class="rw-card-product">
                <img src="${data.productImg}" class="rw-prod-thumb">
                <div style="flex:1;">
                    <small>Producto en la foto:</small><br>
                    <strong>${data.productName}</strong>
                </div>
                <button class="rw-btn-buy" onclick="buyReviewProduct(${data.productId})">VER</button>
            </div>
        `;
    }

    modal.innerHTML = `
        <button class="rw-close" onclick="document.getElementById('rw-modal').classList.remove('active')">×</button>
        <div class="rw-card">
            <img src="${data.image}" class="rw-card-img">
            <div class="rw-card-info">
                <div style="color:#f1c40f; margin-bottom:10px;">★★★★★</div>
                <h3 style="margin-bottom:10px;">${data.clientName} dice:</h3>
                <p style="font-style:italic; color:#555; line-height:1.6;">"${data.quote}"</p>
                <br>
                ${productHTML}
            </div>
        </div>
    `;
    
    modal.classList.add('active');
};

window.buyReviewProduct = (id) => {
    document.getElementById('rw-modal').classList.remove('active');
    // Usamos tu función existente para filtrar o scroll
    // Si tienes searchProducts, lo usamos, si no, intentamos ir al producto
    if(typeof searchProducts === 'function') {
        // Un truco: Scrollear al catalogo y filtrar
        const input = document.getElementById('search-input');
        if(input) {
            input.value = ""; 
            searchProducts(""); // Reset
            // Aquí idealmente deberías tener una función para abrir producto por ID
            // Pero como es modular, simulamos un alert o scroll
             alert("Busca este producto en el catálogo para comprarlo.");
        }
    }
    // NOTA: Si tienes una funcion openProductDetail(id), úsala aquí.
    if(typeof addToCart === 'function') {
         addToCart(id);
         alert("¡Producto agregado al carrito! 🛒");
    }
};