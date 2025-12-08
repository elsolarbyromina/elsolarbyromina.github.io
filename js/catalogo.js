// js/catalogo.js
import { db } from './config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Estado Global
let allProducts = [];
let categories = new Set();
let categoryNames = {}; // Diccionario: ID -> Nombre Real

// Elementos DOM
const contentDiv = document.getElementById('catalog-content');
const filtersDiv = document.getElementById('category-filters');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('today-date').innerText = new Date().toLocaleDateString('es-AR');
    loadData();
});

// Funciones Globales
window.renderCatalog = renderCatalog;
window.toggleDate = () => {
    const footer = document.getElementById('footer-date-box');
    footer.style.display = document.getElementById('show-date').checked ? 'block' : 'none';
};
window.toggleAll = (source) => {
    const checkboxes = document.querySelectorAll('.cat-filter');
    checkboxes.forEach(cb => cb.checked = source.checked);
    renderCatalog();
};

async function loadData() {
    try {
        // 1. CARGAR CATEGORÍAS
        const catSnap = await getDocs(collection(db, "categories"));
        categoryNames = {}; 
        catSnap.forEach(doc => {
            const data = doc.data();
            categoryNames[doc.id] = data.name;
        });

        // 2. CARGAR PRODUCTOS
        const prodSnap = await getDocs(collection(db, "products"));
        allProducts = [];
        categories.clear();

        prodSnap.forEach(doc => {
            const d = doc.data();
            allProducts.push({ id: doc.id, ...d, price: Number(d.price) });
            if(d.category) categories.add(d.category);
        });

        // 3. Crear filtros
        renderFilters();

        // 4. Dibujar catálogo
        renderCatalog();

    } catch (e) {
        console.error(e);
        contentDiv.innerHTML = '<p>Error al cargar datos.</p>';
    }
}

function renderFilters() {
    filtersDiv.innerHTML = `
        <label class="check-row" style="font-weight:bold; border-bottom:1px solid #eee; padding-bottom:5px; margin-bottom:10px;">
            <input type="checkbox" id="check-all" checked onchange="window.toggleAll(this)">
            Seleccionar Todo
        </label>
    `;

    const sortedCatsIDs = Array.from(categories).sort((a, b) => {
        const nameA = categoryNames[a] || a;
        const nameB = categoryNames[b] || b;
        return nameA.localeCompare(nameB);
    });

    sortedCatsIDs.forEach(catID => {
        const realName = categoryNames[catID] || "Sin Categoría";
        const label = document.createElement('label');
        label.className = 'check-row';
        label.innerHTML = `
            <input type="checkbox" class="cat-filter" value="${catID}" checked onchange="renderCatalog()">
            ${realName}
        `;
        filtersDiv.appendChild(label);
    });
}

function renderCatalog() {
    contentDiv.innerHTML = '';
    
    // 1. Filtros
    const checkedBoxes = Array.from(document.querySelectorAll('.cat-filter:checked')).map(cb => cb.value);
    const showImages = document.getElementById('show-images').checked;

    if (checkedBoxes.length === 0) {
        contentDiv.innerHTML = '<p style="text-align:center; margin-top:50px; color:#999;">Selecciona al menos una categoría.</p>';
        return;
    }

    // 2. Agrupar
    const grouped = {};
    const filteredProducts = allProducts.filter(p => checkedBoxes.includes(p.category));

    filteredProducts.forEach(p => {
        if (!grouped[p.category]) grouped[p.category] = {};
        const sub = p.sub || 'General';
        if (!grouped[p.category][sub]) grouped[p.category][sub] = [];
        grouped[p.category][sub].push(p);
    });

    // 3. Generar HTML
    const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
        const nameA = categoryNames[a] || a;
        const nameB = categoryNames[b] || b;
        return nameA.localeCompare(nameB);
    });

    sortedGroupKeys.forEach(catID => {
        const realCatName = categoryNames[catID] || "Sin Categoría";
        
        const catBlock = document.createElement('div');
        catBlock.className = 'category-block';
        
        let html = `<div class="cat-title">${realCatName}</div>`;

        const subs = grouped[catID];
        Object.keys(subs).sort().forEach(subName => {
            if(subName !== 'General') {
                html += `<div class="sub-title">${subName}</div>`;
            }

            subs[subName].forEach(prod => {
                // --- TRUCO PRO: Compresión al vuelo con wsrv.nl ---
                // Le pedimos la imagen a un servidor externo que la achica a 80px de ancho (w=80)
                // y la convierte a formato webp (output=webp) para máxima velocidad.
                let imgUrl = prod.img;
                if(imgUrl && imgUrl.startsWith('http')) {
                    imgUrl = `https://wsrv.nl/?url=${encodeURIComponent(prod.img)}&w=80&h=80&output=webp`;
                }

                const imgTag = showImages ? `<img src="${imgUrl}" class="p-thumb" crossorigin="anonymous">` : '';
                
                html += `
                <div class="product-row">
                    ${imgTag}
                    <div class="p-name">${prod.name}</div>
                    <div class="p-price">$${prod.price.toLocaleString()}</div>
                </div>`;
            });
        });

        catBlock.innerHTML = html;
        contentDiv.appendChild(catBlock);
    });
}