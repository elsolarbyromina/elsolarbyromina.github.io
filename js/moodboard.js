// js/moodboard.js
import { db } from './config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Inyectar CSS
const link = document.createElement('link');
link.rel = 'stylesheet'; link.href = 'css/moodboard.css';
document.head.appendChild(link);

// Inyectar Librería Fabric.js (Motor gráfico)
const script = document.createElement('script');
script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js";
document.head.appendChild(script);

let canvas;
let productsData = [];
let backgroundsData = [];

document.addEventListener("DOMContentLoaded", () => {
    // Botón Trigger
    const btn = document.createElement('div');
    btn.className = 'moodboard-trigger';
    btn.innerHTML = '<i class="ph ph-paint-brush-broad"></i>';
    btn.title = "Diseñar mi Espacio";
    btn.onclick = openMoodboard;
    document.body.appendChild(btn);
});

async function openMoodboard() {
    if(document.getElementById('mb-overlay')) {
        document.getElementById('mb-overlay').classList.add('active');
        return;
    }

    // Cargar datos si es la primera vez
    if(productsData.length === 0) await loadData();

    // Estructura HTML
    const html = `
        <div id="mb-overlay" class="mb-overlay active">
            <div class="mb-header">
                <div class="mb-title"><i class="ph ph-paint-brush-broad"></i> Decorador Virtual</div>
                <button class="mb-close" onclick="closeMoodboard()">×</button>
            </div>
            <div class="mb-body">
                <div class="mb-sidebar">
                    <div class="mb-tabs">
                        <button class="mb-tab active" onclick="switchMbTab('prods')">Productos</button>
                        <button class="mb-tab" onclick="switchMbTab('bgs')">Fondos</button>
                    </div>
                    <div id="mb-list-prods" class="mb-grid"></div>
                    <div id="mb-list-bgs" class="mb-grid" style="display:none;"></div>
                </div>
                <div class="mb-workspace">
                    <div class="canvas-wrapper">
                        <canvas id="c"></canvas>
                    </div>
                    <div class="mb-tools">
                        <button class="mb-tool-btn" onclick="deleteActiveObject()"><i class="ph ph-trash"></i><span>Borrar</span></button>
                        <button class="mb-tool-btn" onclick="clearCanvas()"><i class="ph ph-arrow-counter-clockwise"></i><span>Limpiar</span></button>
                        <button class="mb-tool-btn" onclick="downloadDesign()"><i class="ph ph-download-simple"></i><span>Bajar</span></button>
                        <div style="width:1px; background:#555;"></div>
                        <button class="mb-tool-btn mb-btn-buy" onclick="buySet()">COMPRAR SET</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    // Inicializar Canvas
    initCanvas();
    renderSidebar();
}

// --- CONFIGURACIÓN FABRIC.JS ---
function initCanvas() {
    // Tamaño responsivo
    const h = document.querySelector('.mb-workspace').clientHeight * 0.8;
    const w = h * 1; // Cuadrado o proporción deseada

    canvas = new fabric.Canvas('c', {
        width: w, height: h,
        backgroundColor: '#ffffff'
    });

    // Evento Delete con tecla
    window.addEventListener('keydown', (e) => {
        if(e.key === 'Delete') deleteActiveObject();
    });
}

// --- DATOS ---
async function loadData() {
    // Productos
    const pSnap = await getDocs(collection(db, "products"));
    pSnap.forEach(d => {
        const p = d.data();
        productsData.push({ id: d.id, img: p.img, name: p.name });
    });

    // Fondos (Desde settings o colección nueva 'backgrounds')
    try {
        const bSnap = await getDocs(collection(db, "backgrounds"));
        bSnap.forEach(d => backgroundsData.push(d.data()));
    } catch(e) {
        // Fallback si no hay backgrounds subidos
        backgroundsData = [
            { name: "Madera", img: "https://images.unsplash.com/photo-1541349141042-4b21b4a11c0f?w=400" },
            { name: "Mármol", img: "https://images.unsplash.com/photo-1563223126-5b4d6b6d5193?w=400" },
            { name: "Sala", img: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400" }
        ];
    }
}

function renderSidebar() {
    const listP = document.getElementById('mb-list-prods');
    const listB = document.getElementById('mb-list-bgs');

    // Render Productos
    listP.innerHTML = productsData.map(p => `
        <div class="mb-item" onclick="addObj('${p.img}', ${p.id})">
            <img src="${p.img}"><span>${p.name}</span>
        </div>
    `).join('');

    // Render Fondos
    listB.innerHTML = backgroundsData.map(b => `
        <div class="mb-item" onclick="setBg('${b.img}')">
            <img src="${b.img}"><span>${b.name}</span>
        </div>
    `).join('');
}

// --- ACCIONES ---
window.addObj = (url, id) => {
    fabric.Image.fromURL(url, (img) => {
        // Escalar imagen para que no sea gigante
        const scale = 150 / Math.max(img.width, img.height);
        img.set({
            scaleX: scale, scaleY: scale,
            left: canvas.width/2, top: canvas.height/2,
            originX: 'center', originY: 'center',
            cornerColor: '#6c5ce7', cornerSize: 10, transparentCorners: false,
            // Guardamos el ID del producto dentro del objeto del canvas
            prodId: id 
        });
        canvas.add(img);
        canvas.setActiveObject(img);
    }, { crossOrigin: 'anonymous' });
};

window.setBg = (url) => {
    fabric.Image.fromURL(url, (img) => {
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
            scaleX: canvas.width / img.width,
            scaleY: canvas.height / img.height
        });
    }, { crossOrigin: 'anonymous' });
};

window.deleteActiveObject = () => {
    const active = canvas.getActiveObjects();
    if (active.length) {
        canvas.discardActiveObject();
        active.forEach(obj => canvas.remove(obj));
    }
};

window.clearCanvas = () => {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
};

window.downloadDesign = () => {
    const link = document.createElement('a');
    link.download = 'mi-diseño-solar.png';
    link.href = canvas.toDataURL({ format: 'png', quality: 0.8 });
    link.click();
};

window.buySet = () => {
    const objects = canvas.getObjects();
    if(objects.length === 0) return alert("El diseño está vacío.");

    let count = 0;
    objects.forEach(obj => {
        if(obj.prodId) {
            // Llamamos a la función global addToCart
            addToCart(obj.prodId);
            count++;
        }
    });

    if(count > 0) {
        alert(`¡${count} productos agregados al carrito! 🛒`);
        closeMoodboard();
        toggleCart(true); // Abrir carrito
    } else {
        alert("Agrega productos al diseño para comprarlos.");
    }
};

// --- UTILIDADES UI ---
window.switchMbTab = (tab) => {
    document.querySelectorAll('.mb-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('mb-list-prods').style.display = tab === 'prods' ? 'grid' : 'none';
    document.getElementById('mb-list-bgs').style.display = tab === 'bgs' ? 'grid' : 'none';
};

window.closeMoodboard = () => {
    document.getElementById('mb-overlay').classList.remove('active');
};