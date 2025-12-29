// js/harry-potter.js

document.addEventListener("DOMContentLoaded", function() {
    
    const IMAGEN_SNITCH = "logo/snitch.gif"; 
    
    // Tiempos más rápidos porque es una Snitch
    const TIEMPO_MIN = 5000;  
    const TIEMPO_MAX = 15000; 

    function spawnSnitch() {
        const snitch = document.createElement('img');
        snitch.src = IMAGEN_SNITCH;
        snitch.className = 'hp-snitch';
        
        // Posición horizontal aleatoria (10% a 90%)
        const randomLeft = Math.floor(Math.random() * 80) + 10;
        snitch.style.left = randomLeft + '%';

        document.body.appendChild(snitch);

        // Lógica de "Atraparla"
        snitch.addEventListener('click', (e) => {
            // Efecto visual en la snitch
            snitch.classList.add('caught');
            
            // Mostrar "+150 Puntos" donde hiciste click
            showPoints(e.clientX, e.clientY);

            // Eliminar elemento
            setTimeout(() => snitch.remove(), 500);
        });

        // Limpieza si se escapa
        setTimeout(() => {
            if(snitch.parentNode) snitch.remove();
        }, 8000); // 8 segundos (coincide con la animación flyUp)

        scheduleNextSnitch();
    }

    function showPoints(x, y) {
        const points = document.createElement('div');
        points.className = 'hp-points';
        points.innerText = "¡150 Puntos!";
        points.style.left = x + 'px';
        points.style.top = y + 'px';
        document.body.appendChild(points);
        setTimeout(() => points.remove(), 1000);
    }

    function scheduleNextSnitch() {
        const randomTime = Math.random() * (TIEMPO_MAX - TIEMPO_MIN) + TIEMPO_MIN;
        setTimeout(spawnSnitch, randomTime);
    }

    // --- DETECCIÓN DEL POPUP ---
    const checkPopup = setInterval(() => {
        const popup = document.getElementById('feria-overlay');
        
        if (!popup || getComputedStyle(popup).opacity === '0') {
            clearInterval(checkPopup);
            console.log("⚡ ¡Comienza el partido de Quidditch!");
            
            // Sale la primera snitch a los 2 segundos
            setTimeout(spawnSnitch, 2000); 
        }
    }, 1000);
});