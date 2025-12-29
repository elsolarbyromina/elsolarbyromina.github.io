// js/soda-stereo.js

document.addEventListener("DOMContentLoaded", function() {
    
    const IMAGEN_LOGO = "soda.svg"; 
    
    // Configuración de tiempos
    const TIEMPO_MIN = 5000;  
    const TIEMPO_MAX = 15000; 

    function spawnBubble() {
        // 1. Crear el contenedor burbuja
        const bubble = document.createElement('div');
        bubble.className = 'soda-bubble';
        
        // 2. Crear la imagen del logo
        const img = document.createElement('img');
        img.src = IMAGEN_LOGO;
        bubble.appendChild(img);
        
        // 3. Posición y Tamaño Aleatorio
        const randomLeft = Math.floor(Math.random() * 90);
        const randomSize = Math.random() * 0.5 + 0.8; // Escala entre 0.8 y 1.3
        
        bubble.style.left = randomLeft + '%';
        bubble.style.transform = `scale(${randomSize})`;

        document.body.appendChild(bubble);

        // 4. Lógica de "Explotar"
        bubble.addEventListener('click', (e) => {
            bubble.classList.add('pop'); // Animación visual
            
            // Frase Icónica
            showCeratiText(e.clientX, e.clientY);

            // Eliminar elemento
            setTimeout(() => bubble.remove(), 300);
        });

        // Limpieza si se va al cielo
        setTimeout(() => {
            if(bubble.parentNode) bubble.remove();
        }, 10000); // 10 segundos

        scheduleNextBubble();
    }

    function showCeratiText(x, y) {
        const text = document.createElement('div');
        text.className = 'cerati-text';
        text.innerText = "¡GRACIAS TOTALES!";
        // Ajuste para centrar el texto en el mouse
        text.style.left = (x - 100) + 'px'; 
        text.style.top = (y - 30) + 'px';
        document.body.appendChild(text);
        setTimeout(() => text.remove(), 1500);
    }

    function scheduleNextBubble() {
        const randomTime = Math.random() * (TIEMPO_MAX - TIEMPO_MIN) + TIEMPO_MIN;
        setTimeout(spawnBubble, randomTime);
    }

    // --- DETECCIÓN DEL POPUP ---
    const checkPopup = setInterval(() => {
        const popup = document.getElementById('feria-overlay');
        
        if (!popup || getComputedStyle(popup).opacity === '0') {
            clearInterval(checkPopup);
            console.log("🎵 De música ligera...");
            
            // Empiezan las burbujas rápido (2 seg)
            setTimeout(spawnBubble, 2000); 
        }
    }, 1000);
});