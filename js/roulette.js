// js/roulette.js
import { db } from './config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Inyectar CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'css/roulette.css';
document.head.appendChild(link);

// Variables Globales
let prizes = [];
let wheelCanvas, ctx;
let currentRotation = 0;
let isSpinning = false;

document.addEventListener("DOMContentLoaded", async () => {
    
    // Verificar si ya jugó (localStorage)
    if(localStorage.getItem('roulette_played')) {
        console.log("🎡 Usuario ya jugó a la ruleta.");
        return; 
    }

    // Insertar HTML en el body
    const html = `
        <div class="roulette-trigger" onclick="openRoulette()">🎁</div>
        <div id="roulette-overlay" class="roulette-overlay">
            <div class="roulette-card">
                <button class="roulette-close" onclick="closeRoulette()">×</button>
                <h2 style="margin-bottom:10px; color:#ee5253;">¡Prueba tu Suerte!</h2>
                <p style="margin-bottom:20px; color:#666;">Gira y gana descuentos exclusivos.</p>
                
                <div class="wheel-container">
                    <div class="wheel-pointer"></div>
                    <canvas id="wheel-canvas" width="500" height="500"></canvas>
                </div>

                <button id="spin-btn" class="spin-btn" onclick="spinWheel()">¡GIRAR!</button>
                
                <div id="winner-box" class="winner-msg">
                    🎉 ¡Ganaste! 🎉<br>
                    <div class="coupon-code-display" id="coupon-display" onclick="copyCoupon()">CODE</div>
                    <small>Click para copiar</small>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    // Cargar Configuración de Firebase
    try {
        const docRef = doc(db, "settings", "roulette");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            prizes = docSnap.data().items || [];
        } else {
            // Premios por defecto si no hay config
            prizes = [
                { text: "10% OFF", color: "#ff7675", code: "SUERTE10" },
                { text: "Sigue Jugando", color: "#dfe6e9", code: null },
                { text: "5% OFF", color: "#74b9ff", code: "HOLA5" },
                { text: "Envío Gratis", color: "#a29bfe", code: "ENVIOGRATIS" },
                { text: "Nada :(", color: "#b2bec3", code: null },
                { text: "20% OFF", color: "#fdcb6e", code: "SUPER20" }
            ];
        }
        drawWheel();
    } catch (e) {
        console.error("Error cargando ruleta:", e);
    }
});

// --- FUNCIONES ---

window.openRoulette = () => document.getElementById('roulette-overlay').classList.add('active');
window.closeRoulette = () => document.getElementById('roulette-overlay').classList.remove('active');

function drawWheel() {
    wheelCanvas = document.getElementById('wheel-canvas');
    if(!wheelCanvas) return;
    ctx = wheelCanvas.getContext('2d');
    
    const arc = Math.PI * 2 / prizes.length;
    const radius = wheelCanvas.width / 2;

    ctx.clearRect(0, 0, 500, 500);
    ctx.translate(250, 250);

    prizes.forEach((prize, i) => {
        const angle = i * arc;
        ctx.beginPath();
        ctx.fillStyle = prize.color;
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, angle, angle + arc);
        ctx.lineTo(0, 0);
        ctx.fill();

        // Texto
        ctx.save();
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px Poppins";
        ctx.fillText(prize.text, radius - 20, 10);
        ctx.restore();
    });
    ctx.resetTransform();
}

window.spinWheel = () => {
    if(isSpinning) return;
    isSpinning = true;
    document.getElementById('spin-btn').disabled = true;

    // Calcular resultado aleatorio
    const winningIndex = Math.floor(Math.random() * prizes.length);
    const arc = 360 / prizes.length;
    
    // Girar: (360 * 5 vueltas) + ángulo específico para caer en el premio
    // OJO: El puntero está arriba (270deg o -90deg), hay que ajustar la mate
    const spinAngle = 360 * 5 + (270 - (winningIndex * arc) - (arc/2)); 

    const canvas = document.getElementById('wheel-canvas');
    canvas.style.transform = `rotate(${spinAngle}deg)`;

    // Esperar a que termine la animación CSS (4s)
    setTimeout(() => {
        showPrize(prizes[winningIndex]);
        localStorage.setItem('roulette_played', 'true'); // Marcar como jugado
    }, 4000);
};

function showPrize(prize) {
    const winnerBox = document.getElementById('winner-box');
    const spinBtn = document.getElementById('spin-btn');
    
    spinBtn.style.display = 'none';
    winnerBox.style.display = 'block';

    if(prize.code) {
        document.getElementById('coupon-display').innerText = prize.code;
        confettiEffect(); // Reusamos el confeti si existe, o creamos uno simple
    } else {
        winnerBox.innerHTML = `😢 <br> ${prize.text} <br> <small>Intenta la próxima vez</small>`;
    }
}

window.copyCoupon = () => {
    const text = document.getElementById('coupon-display').innerText;
    navigator.clipboard.writeText(text);
    alert("Código copiado: " + text);
    closeRoulette();
};

function confettiEffect() {
    // Efecto simple de celebración
    for(let i=0; i<30; i++) {
        const d = document.createElement('div');
        d.style.cssText = `position:fixed;top:50%;left:50%;width:10px;height:10px;background:#f00;z-index:999999;pointer-events:none;`;
        d.style.backgroundColor = `hsl(${Math.random()*360},100%,50%)`;
        d.animate([
            {transform: 'translate(0,0)'},
            {transform: `translate(${Math.random()*400-200}px, ${Math.random()*400-200}px)`}
        ], {duration: 1000, fill:'forwards'});
        document.body.appendChild(d);
        setTimeout(()=>d.remove(), 1000);
    }
}