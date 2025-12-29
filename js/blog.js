// js/blog.js
import { db } from './config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const blogGrid = document.querySelector('.blog-grid');
    if (!blogGrid) return;

    // Verificar si hay noticias en la base de datos
    try {
        const q = query(collection(db, "news"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Si hay noticias dinámicas, LIMPIAMOS las estáticas y mostramos las nuevas
            blogGrid.innerHTML = ''; 
            
            snapshot.forEach(doc => {
                const post = doc.data();
                
                // Formatear fecha (Ej: 2025-12-14 -> 14/12/2025)
                const dateParts = post.date.split('-');
                const niceDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                // Construir tarjeta HTML
                const article = document.createElement('article');
                article.className = 'blog-card reveal';
                article.innerHTML = `
                    <img src="${post.image}" alt="${post.title}" class="blog-img">
                    <div class="blog-content">
                        <span class="blog-date">📅 ${niceDate}</span>
                        <h3 class="blog-title">${post.title}</h3>
                        <p class="blog-text">${post.text}</p>
                        ${ post.link ? 
                           `<a href="${post.link}" class="read-more" target="_blank">Leer más <i class="ph ph-arrow-right"></i></a>` 
                           : '' 
                        }
                    </div>
                `;
                blogGrid.appendChild(article);
            });
        } else {
            console.log("No hay noticias dinámicas, dejando las estáticas.");
        }
    } catch (error) {
        console.error("Error cargando blog:", error);
    }
});