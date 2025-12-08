// js/popup-feria.js

document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Configuración
    const IMAGEN_URL = "img/popup.jpg"; 
    const TIEMPO_AUTOCIERRE = 15000; // 15000 milisegundos = 10 segundos

    // 2. Texto del anuncio
    const TEXTO_ANUNCIO = `
        Este domingo 14 de diciembre estaremos presentes en la Feria: 
        <strong>"Hay Más Feria"</strong> en San Telmo.<br><br>
        Compartiendo toda la magia artesanal de El Solar by Romina.<br>
        ¡Los esperamos para disfrutar de piezas únicas!<br><br>
        Y si no podés venir, te esperamos con los brazos abiertos en<br>
        nuestras redes y en nuestra tienda online para que sigas<br>
        descubriendo nuestras creaciones.<br><br>
        💕🧶✨
        
    `;

    // 3. Crear HTML
    const popupHTML = `
        <div id="feria-overlay" class="feria-overlay">
            <div class="feria-card">
                <button id="feria-close" class="feria-close">×</button>
                <div class="feria-img-box">
                    <img src="${IMAGEN_URL}" alt="Feria San Telmo">
                    <div class="feria-text-veil">
                        <p>${TEXTO_ANUNCIO}</p>
                        <small style="margin-top:15px; display:block; opacity:0.8;">(Pasa el mouse para ver la foto)</small>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 4. Insertar
    document.body.insertAdjacentHTML('beforeend', popupHTML);

    // 5. Lógica de cierre
    const overlay = document.getElementById('feria-overlay');
    const closeBtn = document.getElementById('feria-close');

    function closePopup() {
        if(!overlay) return;
        overlay.style.opacity = '0';
        setTimeout(() => {
            if(overlay) overlay.remove(); 
        }, 500);
    }

    closeBtn.addEventListener('click', closePopup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
    });

    // --- NUEVO: Cierre Automático ---
    setTimeout(() => {
        closePopup();
    }, TIEMPO_AUTOCIERRE);
});