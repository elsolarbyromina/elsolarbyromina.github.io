// js/globo-it.js

document.addEventListener("DOMContentLoaded", function() {
    
    const IMAGEN_GLOBO = "logo/globo.png"; // Ruta de tu imagen
    
    // Configuración
    const TIEMPO_ENTRE_GLOBOS_MIN = 10000; // 10 segundos mínimo
    const TIEMPO_ENTRE_GLOBOS_MAX = 30000; // 30 segundos máximo

    function spawnBalloon() {
        // 1. Crear elemento
        const balloon = document.createElement('img');
        balloon.src = IMAGEN_GLOBO;
        balloon.className = 'it-balloon';
        
        // 2. Posición aleatoria horizontal (izquierda a derecha)
        // Math.random() * 90 garantiza que no se corte en el borde derecho
        const randomLeft = Math.floor(Math.random() * 90); 
        balloon.style.left = randomLeft + '%';

        // 3. Insertar en la página
        document.body.appendChild(balloon);

        // 4. Lógica al hacer click (¡POP!)
        balloon.addEventListener('click', () => {
            balloon.classList.add('pop');
            // Reproducir sonido "pop" si quisieras (opcional)
            setTimeout(() => balloon.remove(), 200);
        });

        // 5. Limpieza automática cuando termina la animación (15s)
        setTimeout(() => {
            if(balloon.parentNode) balloon.remove();
        }, 15000); 

        // 6. Programar el siguiente globo
        scheduleNextBalloon();
    }

    function scheduleNextBalloon() {
        // Tiempo aleatorio entre el mínimo y máximo
        const randomTime = Math.random() * (TIEMPO_ENTRE_GLOBOS_MAX - TIEMPO_ENTRE_GLOBOS_MIN) + TIEMPO_ENTRE_GLOBOS_MIN;
        setTimeout(spawnBalloon, randomTime);
    }

    // --- DETECCIÓN INTELIGENTE ---
    // Esperamos a que el usuario cierre el popup de la feria para empezar
    
    const checkPopupInterval = setInterval(() => {
        const popup = document.getElementById('feria-overlay');
        
        // Si el popup ya no existe (fue removido) o está oculto (opacity 0)
        if (!popup || getComputedStyle(popup).opacity === '0') {
            clearInterval(checkPopupInterval); // Dejamos de revisar
            console.log("🎈 Popup cerrado. Iniciando secuencia de globos IT...");
            
            // Esperamos unos segundos antes del primer globo para no asustar de golpe
            setTimeout(scheduleNextBalloon, 5000); 
        }
    }, 1000); // Revisa cada 1 segundo
});