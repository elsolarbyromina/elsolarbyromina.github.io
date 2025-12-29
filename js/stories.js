// js/stories.js
import { db } from './config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Inyectar CSS dinámicamente
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'css/stories.css';
document.head.appendChild(link);

document.addEventListener("DOMContentLoaded", async () => {
    // Buscar dónde insertar (Después del header-container)
    const header = document.getElementById('header-container');
    if(!header) return;

    // Crear Contenedor
    const storiesContainer = document.createElement('div');
    storiesContainer.id = 'stories-bar';
    storiesContainer.style.display = 'none'; // Oculto hasta cargar datos
    header.after(storiesContainer); // Insertar justo debajo del header

    // Cargar Historias
    try {
        const q = query(collection(db, "stories"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);

        if(snapshot.empty) return; // Si no hay historias, no mostramos nada

        storiesContainer.style.display = 'flex';
        
        // Renderizar Círculos
        snapshot.forEach(doc => {
            const data = doc.data();
            const circle = document.createElement('div');
            circle.className = 'story-circle';
            circle.innerHTML = `
                <div class="story-ring">
                    <img src="${data.image}" class="story-img">
                </div>
                <span class="story-name">${data.label || 'Novedad'}</span>
            `;
            // Click abre la historia
            circle.onclick = () => openStory(data);
            storiesContainer.appendChild(circle);
        });

    } catch (e) {
        console.error("Error cargando stories:", e);
    }
});

// --- LÓGICA DEL VISOR ---
function openStory(data) {
    // Crear HTML del visor si no existe
    let overlay = document.getElementById('story-overlay');
    if(!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'story-overlay';
        overlay.className = 'story-overlay';
        document.body.appendChild(overlay);
    }

    const ctaHtml = data.link ? `<a href="${data.link}" target="_blank" class="story-cta">VER PRODUCTO 🛍️</a>` : '';

    overlay.innerHTML = `
        <div class="story-viewer">
            <div class="story-progress-bar"><div class="story-progress-fill" id="story-fill"></div></div>
            <div class="story-close" onclick="closeStory()">✖</div>
            <img src="${data.image}" class="story-full-img">
            ${ctaHtml}
        </div>
    `;

    // Mostrar
    requestAnimationFrame(() => overlay.classList.add('active'));

    // Animación de Barra (5 segundos)
    const fill = document.getElementById('story-fill');
    fill.style.transition = 'width 5s linear';
    requestAnimationFrame(() => fill.style.width = '100%');

    // Auto-cerrar
    window.storyTimer = setTimeout(closeStory, 5000);
}

window.closeStory = () => {
    const overlay = document.getElementById('story-overlay');
    if(overlay) {
        overlay.classList.remove('active');
        clearTimeout(window.storyTimer);
        setTimeout(() => overlay.remove(), 300); // Borrar del DOM al cerrar
    }
};