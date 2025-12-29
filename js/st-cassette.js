// js/st-cassette.js

document.addEventListener("DOMContentLoaded", function() {
    
    // --- CONFIGURACIÓN ---
    const IMAGEN_CASSETTE = "logo/cassette.png"; 
    // 🎵 PON AQUÍ LA RUTA DE TU MP3
    const MUSICA_MP3 = "audio/stranger.mp3"; 
    
    // Tiempos de aparición
    const TIEMPO_MIN = 6000;  
    const TIEMPO_MAX = 20000; 

    function spawnCassette() {
        const tape = document.createElement('img');
        tape.src = IMAGEN_CASSETTE;
        tape.className = 'vecna-tape';
        
        // --- CÁLCULO DE POSICIÓN ALEATORIA (4 LADOS) ---
        const side = Math.floor(Math.random() * 4); // 0:Top, 1:Right, 2:Bottom, 3:Left
        const offset = -150; // Píxeles fuera de la pantalla
        
        let sx, sy, ex, ey; // Start X, Start Y, End X, End Y

        // Definir trayectoria según el lado de donde sale
        switch(side) {
            case 0: // Desde ARRIBA hacia ABAJO
                sx = Math.random() * 90 + '%'; sy = offset + 'px';
                ex = Math.random() * 90 + '%'; ey = '110vh';
                break;
            case 1: // Desde DERECHA hacia IZQUIERDA
                sx = '110vw';                  sy = Math.random() * 90 + 'vh';
                ex = offset + 'px';            ey = Math.random() * 90 + 'vh';
                break;
            case 2: // Desde ABAJO hacia ARRIBA
                sx = Math.random() * 90 + '%'; sy = '110vh';
                ex = Math.random() * 90 + '%'; ey = offset + 'px';
                break;
            case 3: // Desde IZQUIERDA hacia DERECHA
                sx = offset + 'px';            sy = Math.random() * 90 + 'vh';
                ex = '110vw';                  ey = Math.random() * 90 + 'vh';
                break;
        }

        // Asignar variables CSS para la animación
        tape.style.setProperty('--sx', sx);
        tape.style.setProperty('--sy', sy);
        tape.style.setProperty('--ex', ex);
        tape.style.setProperty('--ey', ey);

        document.body.appendChild(tape);

        // --- LÓGICA AL HACER CLICK (SALVARSE DE VECNA) ---
        tape.addEventListener('click', (e) => {
            if(tape.classList.contains('saved')) return; // Evitar doble click
            
            tape.classList.add('saved'); // Activa animación de luz
            
            // 🔊 1. REPRODUCIR MÚSICA
            const audio = new Audio(MUSICA_MP3);
            audio.volume = 0.5; // Volumen al 50% para no asustar
            audio.play().catch(err => console.log("Error al reproducir audio:", err));

            // 🎵 2. VISUALES (Notas musicales)
            spawnNote(e.clientX, e.clientY, "🎵");
            setTimeout(() => spawnNote(e.clientX + 30, e.clientY - 30, "🎶"), 150);
            setTimeout(() => spawnNote(e.clientX - 30, e.clientY - 50, "🎧"), 300);

            // Eliminar cassette después del efecto visual
            setTimeout(() => tape.remove(), 600);
        });

        // Limpieza automática si nadie le hace click (15s de viaje)
        setTimeout(() => {
            if(tape.parentNode) tape.remove();
        }, 15000); 

        scheduleNextCassette();
    }

    function spawnNote(x, y, symbol) {
        const note = document.createElement('div');
        note.className = 'music-note';
        note.innerText = symbol;
        note.style.left = x + 'px';
        note.style.top = y + 'px';
        document.body.appendChild(note);
        setTimeout(() => note.remove(), 1500);
    }

    function scheduleNextCassette() {
        const randomTime = Math.random() * (TIEMPO_MAX - TIEMPO_MIN) + TIEMPO_MIN;
        setTimeout(spawnCassette, randomTime);
    }

    // --- ACTIVACIÓN ---
    // Espera a que se cierre el popup de la feria para no molestar
    const checkPopup = setInterval(() => {
        const popup = document.getElementById('feria-overlay');
        
        if (!popup || getComputedStyle(popup).opacity === '0') {
            clearInterval(checkPopup);
            console.log("📼 Max activó el walkman...");
            scheduleNextCassette();
        }
    }, 1000);

});