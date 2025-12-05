// =========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN
// =========================================
import { db } from './config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// EXPOSICIÓN DE FUNCIONES AL HTML
window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.changeQty = changeQty;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.openQuickView = openQuickView;
window.closeQuickView = closeQuickView;
window.closeQuickViewForce = closeQuickViewForce;
window.filterByMain = filterByMain;
window.filterBySub = filterBySub;
window.sortProducts = sortProducts;
window.applyCoupon = applyCoupon;
window.sendToWhatsApp = sendToWhatsApp;
window.toggleWishlist = toggleWishlist;
window.showFavorites = showFavorites;
window.setGridView = setGridView;
window.setListView = setListView;
window.closeSalesNotification = closeSalesNotification;
window.closePromo = closePromo;
window.submitReview = submitReview;
window.switchTab = switchTab;
window.toggleChatWidget = toggleChatWidget;
window.handleChat = handleChat;
window.sendMessage = sendMessage;
window.startVoiceSearch = startVoiceSearch;
window.goToSlide = goToSlide;
window.updateCheckoutRules = updateCheckoutRules;

// CONSTANTES GLOBALES
const NUMERO_WHATSAPP = "5491168722917"; 
const ENVIO_GRATIS_META = 150000; 
const MOSTRAR_POPUP_PROMO = false; // Cambiar a true para activar

// =========================================
// 2. ESTADO DE LA APLICACIÓN
// =========================================
let allProducts = [];       
let currentProducts = [];   
let categoriesData = [];    
let activeCoupons = [];     

// Persistencia de datos
let cart = JSON.parse(localStorage.getItem('cart')) || []; 
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let stockMemory = JSON.parse(localStorage.getItem('stock_memory')) || {};
let reviews = JSON.parse(localStorage.getItem('reviews')) || {}; 

let discount = 0;
let currentOpenProductId = null;

const grid = document.getElementById('products-container');
const title = document.getElementById('current-section-title');

// =========================================
// 3. INICIALIZACIÓN
// =========================================
async function initStore() {
    // 1. Efecto Visual: Skeletons
    showSkeletons();

    try {
        const catSnap = await getDocs(collection(db, "categories"));
        categoriesData = [];
        catSnap.forEach(doc => categoriesData.push({id: doc.id, ...doc.data()}));
        renderDynamicMenu(); 

        const coupSnap = await getDocs(collection(db, "coupons"));
        activeCoupons = [];
        coupSnap.forEach(doc => activeCoupons.push(doc.data()));

        const prodSnap = await getDocs(collection(db, "products"));
        allProducts = [];
        prodSnap.forEach(doc => {
            const data = doc.data();
            allProducts.push({ 
                firebaseId: doc.id, 
                id: data.id, 
                ...data, 
                price: Number(data.price) 
            });
        });

        if (allProducts.length === 0) {
            if(grid) grid.innerHTML = "<p style='text-align:center; padding:2rem;'>No hay productos cargados.</p>";
        } else {
            filterByMain('all');
        }

        // Iniciar funcionalidades extra
        initSlider();
        renderHistory();
        updateCartUI(); 
        setTimeout(setupLiveSearch, 1000); 
        setTimeout(showSalesNotification, 10000);
        setupRetentionTools(); // Retención de clientes
        
        // Popup Promo (si está activo)
        setTimeout(() => { 
            if(MOSTRAR_POPUP_PROMO && !sessionStorage.getItem('promoShown') && document.getElementById('promo-overlay')) {
                document.getElementById('promo-overlay').classList.add('active'); 
            }
        }, 3000);

    } catch (error) {
        console.error("Error Firebase:", error);
        if(grid) grid.innerHTML = '<p style="text-align:center; padding:2rem; color:red;">Error de conexión.</p>';
    }
}

// =========================================
// 4. FUNCIONES VISUALES (SKELETON & LIVE SEARCH)
// =========================================
function showSkeletons() {
    if(!grid) return;
    grid.innerHTML = '';
    for(let i=0; i<8; i++) {
        grid.innerHTML += `
            <div class="card-skeleton">
                <div class="sk-img skeleton"></div>
                <div class="sk-info">
                    <div class="sk-line short skeleton"></div>
                    <div class="sk-line long skeleton"></div>
                    <div class="sk-line short skeleton"></div>
                    <div class="sk-line long skeleton" style="margin-top:10px;"></div>
                </div>
            </div>
        `;
    }
}

function setupLiveSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBox = document.querySelector('.search-box');
    if (!searchInput || !searchBox) return;
    
    // Inyectar estilos para el desplegable
    const style = document.createElement('style');
    style.innerHTML = `.live-search-results { position: absolute; top: 100%; left: 0; width: 250px; background: var(--bg-card); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 5000; overflow: hidden; display: none; border: 1px solid var(--border-color); } .live-item { display: flex; align-items: center; padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: 0.2s; } .live-item:hover { background: var(--input-bg); } .live-item img { width: 40px; height: 40px; border-radius: 5px; object-fit: cover; margin-right: 10px; } .live-info h4 { font-size: 0.85rem; margin: 0; color: var(--text-main); } .live-info span { font-size: 0.8rem; font-weight: bold; color: var(--primary); }`;
    document.head.appendChild(style);

    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'live-search-results';
    searchBox.style.position = 'relative'; 
    searchBox.appendChild(resultsContainer);

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (term.length < 2) { resultsContainer.style.display = 'none'; return; }
        
        const matches = allProducts.filter(p => p.name.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term))).slice(0, 5);
        
        if (matches.length > 0) {
            resultsContainer.innerHTML = '';
            matches.forEach(p => {
                const div = document.createElement('div');
                div.className = 'live-item';
                div.onclick = () => { openQuickView(p.id); resultsContainer.style.display = 'none'; searchInput.value = ''; };
                div.innerHTML = `<img src="${p.img}" onerror="this.src='https://placehold.co/50'"><div class="live-info"><h4>${p.name}</h4><span>$${p.price.toLocaleString()}</span></div>`;
                resultsContainer.appendChild(div);
            });
            resultsContainer.style.display = 'block';
        } else { resultsContainer.style.display = 'none'; }
    });

    document.addEventListener('click', (e) => { if (!searchBox.contains(e.target)) { resultsContainer.style.display = 'none'; } });
}

// =========================================
// 5. MENÚ Y FILTROS
// =========================================
function renderDynamicMenu() {
    const menuContainer = document.querySelector('.menu-scroll-content');
    if (!menuContainer) return;
    menuContainer.innerHTML = '';
    categoriesData.forEach(cat => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'menu-group';
        const h3 = document.createElement('h3');
        h3.innerText = cat.name;
        h3.onclick = () => filterByMain(cat.id);
        groupDiv.appendChild(h3);
        const ul = document.createElement('ul');
        if(cat.subs) {
            cat.subs.forEach(sub => {
                const li = document.createElement('li');
                li.innerText = sub.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                li.onclick = () => filterBySub(cat.id, sub);
                ul.appendChild(li);
            });
        }
        groupDiv.appendChild(ul);
        menuContainer.appendChild(groupDiv);
    });
    const btn = document.createElement('button');
    btn.className = 'ver-todo-btn';
    btn.innerText = 'Ver Todo';
    btn.onclick = () => filterByMain('all');
    menuContainer.appendChild(btn);
}

function filterByMain(catId) { renderWithAnimation(() => { const filtered = catId === 'all' ? allProducts : allProducts.filter(p => p.category === catId); renderFiltered(filtered); if(title) title.innerText = catId === 'all' ? "Todos los Productos" : (categoriesData.find(x => x.id === catId)?.name || catId); }); }
function filterBySub(catId, subId) { renderWithAnimation(() => { const filtered = allProducts.filter(p => p.category === catId && p.sub === subId); renderFiltered(filtered); if(title) title.innerText = subId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }); }
function showFavorites() { renderWithAnimation(() => { const favs = allProducts.filter(p => wishlist.includes(String(p.id))); renderFiltered(favs); if(title) title.innerText = "Mis Favoritos ❤️"; }); }
function searchProducts(query) { const term = query.toLowerCase().trim(); if(term === "") { filterByMain('all'); return; } renderWithAnimation(() => { const results = allProducts.filter(p => p.name.toLowerCase().includes(term) || (p.category && p.category.includes(term)) || (p.sub && p.sub.includes(term))); renderFiltered(results); if(title) title.innerText = `Resultados: "${term}"`; }); }
function startVoiceSearch() { if (!('webkitSpeechRecognition' in window)) { alert("Tu navegador no soporta búsqueda por voz."); return; } const recognition = new webkitSpeechRecognition(); recognition.lang = "es-ES"; const btn = document.querySelector('.voice-btn i'); recognition.onstart = () => { if(btn) btn.parentElement.classList.add('listening'); document.getElementById('search-input').placeholder = "Escuchando..."; }; recognition.onend = () => { if(btn) btn.parentElement.classList.remove('listening'); document.getElementById('search-input').placeholder = "Buscar..."; }; recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; document.getElementById('search-input').value = transcript; searchProducts(transcript); }; recognition.start(); }
function sortProducts(criteria) { let sorted = [...currentProducts]; switch(criteria) { case 'price-asc': sorted.sort((a, b) => a.price - b.price); break; case 'price-desc': sorted.sort((a, b) => b.price - a.price); break; case 'alpha-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break; default: sorted.sort((a, b) => a.id - b.id); break; } renderFiltered(sorted, false); }
function setGridView() { document.getElementById('products-container').classList.remove('list-view'); document.querySelectorAll('.view-btn')[0].classList.add('active'); document.querySelectorAll('.view-btn')[1].classList.remove('active'); }
function setListView() { document.getElementById('products-container').classList.add('list-view'); document.querySelectorAll('.view-btn')[0].classList.remove('active'); document.querySelectorAll('.view-btn')[1].classList.add('active'); }

// =========================================
// 6. RENDERIZADO (CORE)
// =========================================
function renderWithAnimation(cb) { if (!grid) return; grid.style.opacity = '0'; setTimeout(() => { cb(); grid.style.opacity = '1'; }, 200); }

function renderFiltered(list, animate = true) {
    if (!grid) return;
    currentProducts = list;
    const countLabel = document.getElementById('product-count');
    if (countLabel) countLabel.innerText = list.length;
    grid.innerHTML = '';
    if(list.length === 0) { grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:2rem;">No se encontraron productos.</p>'; return; }
    list.forEach(p => createProductCard(p));
    if (animate) observeRevealElements(); else document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
}

function createProductCard(p) {
    let badgeHTML = p.badge ? `<span class="card-badge ${p.badge === 'Oferta' ? 'badge-offer' : 'badge-new'}">${p.badge}</span>` : '';
    const isFav = wishlist.includes(p.id) ? 'active' : '';
    const heartIcon = wishlist.includes(p.id) ? 'ph-heart-fill' : 'ph-heart';
    const prodReviews = reviews[p.id] || [];
    
    let ratingHTML = '';
    if (prodReviews.length > 0) {
        const avg = prodReviews.reduce((acc, r) => acc + parseInt(r.rating), 0) / prodReviews.length;
        const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
        ratingHTML = `<div class="star-rating"><span class="star-gold">${stars}</span> <small>(${prodReviews.length})</small></div>`;
    }
    
    let priceHTML = `<div class="card-price">$${p.price.toLocaleString()}</div>`;
    if(p.oldPrice && p.oldPrice > p.price) {
        const off = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
        priceHTML = `<div class="card-price"><span class="old-price">$${p.oldPrice.toLocaleString()}</span> $${p.price.toLocaleString()}</div>`;
        if(!p.badge) badgeHTML = `<span class="card-badge badge-offer">-${off}% OFF</span>`;
    }

    // Etiqueta Envío Gratis
    let freeShipHTML = "";
    if (p.price >= ENVIO_GRATIS_META) { 
        freeShipHTML = '<span style="display:block; font-size:0.75rem; color:#2ecc71; font-weight:600; margin-top:5px;"><i class="ph ph-truck"></i> Envío Gratis</span>'; 
    }

    const card = document.createElement('div');
    card.className = 'card reveal';
    card.innerHTML = `
        <div class="card-img">
            ${badgeHTML}
            <button class="wishlist-btn ${isFav}" onclick="window.toggleWishlist('${p.id}', this)"><i class="ph ${heartIcon}"></i></button>
            <button class="quick-view-btn" onclick="window.openQuickView('${p.id}')"><i class="ph ph-eye"></i></button>
            <img src="${p.img}" alt="${p.name}" onclick="window.openQuickView('${p.id}')" style="cursor:pointer" onerror="this.src='https://placehold.co/300x200?text=Sin+Foto'">
        </div>
        <div class="card-info">
            <div class="card-cat">${p.category}</div>
            <div class="card-title">${p.name}</div>
            ${ratingHTML}
            ${priceHTML}
            ${freeShipHTML}
            <button class="add-btn" onclick="window.addToCart('${p.id}', this)"><i class="ph ph-basket"></i> Agregar</button>
        </div>`;
    grid.appendChild(card);
}

// =========================================
// 7. CARRITO & WISHLIST
// =========================================
function toggleWishlist(id, btn) {
    id = String(id);
    const idx = wishlist.indexOf(id);
    const icon = btn.querySelector('i');
    if (idx === -1) { wishlist.push(id); btn.classList.add('active', 'animating'); icon.classList.replace('ph-heart', 'ph-heart-fill'); showToast("Agregado a favoritos"); } 
    else { wishlist.splice(idx, 1); btn.classList.remove('active'); icon.classList.replace('ph-heart-fill', 'ph-heart'); if(title && title.innerText.includes("Favoritos")) showFavorites(); }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    setTimeout(() => btn.classList.remove('animating'), 500);
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); updateCartUI(); }

function addToCart(id, btnElement = null) {
    id = String(id);
    const exist = cart.find(i => String(i.id) === id);
    if(exist) { exist.qty++; showToast("Cantidad actualizada (+1)"); } 
    else { const p = allProducts.find(x => String(x.id) === id); if(p) { cart.push({ ...p, qty: 1 }); showToast("Agregado al carrito"); } }
    saveCart();
    if(btnElement) { const card = btnElement.closest('.card') || document.querySelector('.qv-image-col'); const img = card ? card.querySelector('img') : null; if(img) flyToCart(img); }
    toggleCart(true);
}

function flyToCart(imgSource) {
    const cartBtn = document.querySelector('.cart-btn');
    if(!cartBtn || !imgSource) return;
    const flyingImg = imgSource.cloneNode();
    flyingImg.classList.add('flying-img');
    const rect = imgSource.getBoundingClientRect();
    flyingImg.style.left = rect.left + 'px';
    flyingImg.style.top = rect.top + 'px';
    flyingImg.style.width = rect.width + 'px';
    flyingImg.style.height = rect.height + 'px';
    document.body.appendChild(flyingImg);
    void flyingImg.offsetWidth;
    const cartRect = cartBtn.getBoundingClientRect();
    flyingImg.style.left = (cartRect.left + cartRect.width / 2) + 'px';
    flyingImg.style.top = (cartRect.top + cartRect.height / 2) + 'px';
    flyingImg.style.width = '20px';
    flyingImg.style.height = '20px';
    flyingImg.style.opacity = '0';
    setTimeout(() => flyingImg.remove(), 800);
}

function changeQty(id, chg) { id = String(id); const item = cart.find(i => String(i.id) === id); if(item) { item.qty += chg; if(item.qty <= 0) removeFromCart(id); else saveCart(); } }
function removeFromCart(id) { id = String(id); cart = cart.filter(i => String(i.id) !== id); saveCart(); showToast("Eliminado del carrito", "error"); }

function updateCartUI() {
    const itemsEl = document.getElementById('cart-items');
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total');
    const shipBar = document.getElementById('shipping-bar');
    const shipMsg = document.getElementById('shipping-msg');
    if(!itemsEl) return; 
    const totalQty = cart.reduce((a, b) => a + b.qty, 0);
    countEl.innerText = totalQty;
    let total = 0;
    itemsEl.innerHTML = '';
    if(cart.length === 0) { itemsEl.innerHTML = '<p style="text-align:center;color:#999;margin-top:2rem;">Tu carrito está vacío.</p>'; } 
    else { 
        cart.forEach(item => { 
            total += item.price * item.qty; 
            itemsEl.innerHTML += `
            <div class="cart-item">
                <div class="item-info"><h4>${item.name}</h4><small>$${item.price.toLocaleString()}</small></div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button><span>${item.qty}</span><button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button>
                    <button onclick="window.removeFromCart('${item.id}')" style="border:none;background:none;color:red;cursor:pointer;margin-left:5px;font-size:1.2rem;"><i class="ph ph-trash"></i></button>
                </div>
            </div>`; 
        }); 
    }
    totalEl.innerText = '$' + total.toLocaleString();
    if(shipBar && shipMsg) {
        const percent = Math.min((total / ENVIO_GRATIS_META) * 100, 100);
        shipBar.style.width = percent + "%";
        if (total >= ENVIO_GRATIS_META) { shipBar.style.backgroundColor = "#2ecc71"; shipMsg.innerHTML = "¡Genial! Tienes <strong>Envío Gratis</strong> 🚀"; } 
        else { shipBar.style.backgroundColor = "var(--primary)"; shipMsg.innerHTML = `Faltan <strong>$${(ENVIO_GRATIS_META - total).toLocaleString()}</strong> para envío gratis.`; }
    }
}

function toggleCart(force) { const sb = document.getElementById('sidebar'); const ov = document.getElementById('overlay'); if(!sb || !ov) return; if(force) { sb.classList.add('open'); ov.classList.add('active'); } else { sb.classList.toggle('open'); ov.classList.toggle('active'); } }

// =========================================
// 8. VISTA RÁPIDA (FULL: ZOOM + PAGOS + STOCK + COMPARTIR + VENTA CRUZADA)
// =========================================
function openQuickView(id) {
    id = String(id);
    const p = allProducts.find(x => String(x.id) === id);
    if(!p) return;
    currentOpenProductId = id;
    addToHistory(id);
    
    // ZOOM
    const imgContainer = document.querySelector('.qv-image-col');
    const img = document.getElementById('qv-img');
    img.src = p.img;
    imgContainer.style.overflow = "hidden"; imgContainer.style.cursor = "crosshair"; img.style.transition = "transform 0.2s ease-out"; 
    imgContainer.onmousemove = function(e) { const { left, top, width, height } = imgContainer.getBoundingClientRect(); const x = e.clientX - left; const y = e.clientY - top; const xPercent = (x / width) * 100; const yPercent = (y / height) * 100; img.style.transformOrigin = `${xPercent}% ${yPercent}%`; img.style.transform = "scale(2.5)"; };
    imgContainer.onmouseleave = function() { img.style.transformOrigin = "center center"; img.style.transform = "scale(1)"; };

    const catObj = categoriesData.find(c => c.id === p.category);
    document.getElementById('qv-cat').innerText = `${catObj ? catObj.name : p.category} > ${p.sub || ''}`;
    document.getElementById('qv-title').innerText = p.name;
    
    // Urgencia
    const viewers = Math.floor(Math.random() * 20) + 5;
    if(document.getElementById('qv-viewers')) document.getElementById('qv-viewers').innerText = viewers;

    const priceBox = document.getElementById('qv-price-box');
    let priceHtml = `<span class="current-price">$${p.price.toLocaleString()}</span>`;
    if(p.oldPrice && p.oldPrice > p.price) {
        const off = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
        priceHtml = `<span class="old-price">$${p.oldPrice.toLocaleString()}</span> <span class="current-price">$${p.price.toLocaleString()}</span> <span class="discount-tag">-${off}% OFF</span>`;
    }
    if(priceBox) priceBox.innerHTML = priceHtml;
    else document.getElementById('qv-price').innerHTML = priceHtml; 

    // CALCULADORA EFECTIVO (10% OFF)
    let paymentInfo = document.getElementById('qv-payment-info');
    if(paymentInfo) paymentInfo.remove(); 
    if (p.promoCash) {
        paymentInfo = document.createElement('div');
        paymentInfo.id = 'qv-payment-info';
        paymentInfo.style.cssText = "background: rgba(108, 92, 231, 0.08); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid var(--primary); display: flex; flex-direction: column; gap: 8px;";
        const cashPrice = (p.price * 0.9).toLocaleString('es-AR'); 
        paymentInfo.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><i class="ph ph-money" style="color:var(--primary); font-size:1.4rem;"></i><span style="font-size:0.9rem; color:var(--text-main);">Efectivo (10% OFF): <strong style="color:#27ae60;">$${cashPrice}</strong></span></div>`;
        if(priceBox && priceBox.parentNode) { priceBox.parentNode.insertBefore(paymentInfo, priceBox.nextSibling); }
    }

    // STOCK INTELIGENTE (Baja hasta 1)
    let stockAlert = document.getElementById('qv-stock-alert');
    if(stockAlert) stockAlert.remove(); 
    let currentStock = 0;
    if (stockMemory[id]) {
        if (stockMemory[id] > 1) { stockMemory[id]--; } 
        currentStock = stockMemory[id];
    } else { currentStock = Math.floor(Math.random() * 6) + 5; }
    stockMemory[id] = currentStock;
    localStorage.setItem('stock_memory', JSON.stringify(stockMemory));

    stockAlert = document.createElement('div');
    stockAlert.id = 'qv-stock-alert';
    stockAlert.style.marginBottom = "15px";
    stockAlert.innerHTML = `<p style="font-size: 0.85rem; color: #e17055; font-weight: bold; margin-bottom: 5px; display: flex; align-items: center; gap: 5px;"><i class="ph ph-fire"></i> ¡Date prisa! Solo quedan ${currentStock} unidades</p><div style="width: 100%; background: #dfe6e9; height: 6px; border-radius: 3px; overflow: hidden;"><div style="width: ${currentStock * 10}%; background: #e17055; height: 100%;"></div></div>`;

    document.getElementById('qv-desc').innerText = p.desc || "Producto artesanal exclusivo.";
    const addBtn = document.getElementById('qv-add-btn');
    addBtn.parentNode.insertBefore(stockAlert, addBtn);
    addBtn.onclick = function() { addToCart(p.id, this); closeQuickViewForce(); };

    // BOTÓN COMPARTIR
    let shareBtn = document.getElementById('qv-share-btn');
    if (!shareBtn) {
        shareBtn = document.createElement('button');
        shareBtn.id = 'qv-share-btn';
        shareBtn.style.cssText = "margin-left: 10px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 1.2rem; transition: 0.3s;";
        shareBtn.innerHTML = '<i class="ph ph-share-network"></i>';
        shareBtn.title = "Compartir";
        addBtn.parentNode.insertBefore(shareBtn, addBtn.nextSibling);
    }
    shareBtn.onclick = async () => {
        const shareData = { title: p.name, text: `Mira este ${p.name}!`, url: window.location.href };
        try { if (navigator.share) { await navigator.share(shareData); } else { navigator.clipboard.writeText(`${shareData.text} en: ${shareData.url}`); showToast("¡Link copiado!"); } } catch (err) { console.log(err); }
    };

    // VENTA CRUZADA
    const relatedContainer = document.getElementById('qv-related-container');
    if(relatedContainer) {
        relatedContainer.innerHTML = '';
        const related = allProducts.filter(item => item.category === p.category && String(item.id) !== id).slice(0, 3); 
        if(related.length > 0) {
            const relatedTitle = document.createElement('h4');
            relatedTitle.style.cssText = "margin-top: 20px; margin-bottom: 10px; font-size: 0.95rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 15px;";
            relatedTitle.innerText = "También te podría gustar:";
            relatedContainer.parentNode.insertBefore(relatedTitle, relatedContainer); 
            
            related.forEach(rel => {
                const relDiv = document.createElement('div');
                relDiv.className = 'related-card';
                relDiv.style.cssText = "display: flex; gap: 10px; align-items: center; background: var(--input-bg); padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; margin-bottom: 8px; border: 1px solid var(--border-color);";
                relDiv.onclick = () => openQuickView(rel.id); 
                relDiv.innerHTML = `<img src="${rel.img}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"> <div class="related-info"><h5 style="font-size: 0.85rem; margin: 0; color: var(--text-main);">${rel.name}</h5><span style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">$${rel.price.toLocaleString()}</span></div>`;
                relatedContainer.appendChild(relDiv);
            });
        } else { relatedContainer.innerHTML = ''; }
    }

    switchTab('details');
    renderReviews(id);
    document.getElementById('qv-overlay').classList.add('active');
}

function closeQuickView(e) { if(e.target.id === 'qv-overlay') closeQuickViewForce(); }
function closeQuickViewForce() { document.getElementById('qv-overlay').classList.remove('active'); }
function switchTab(tab) {
    const tabs = document.querySelectorAll('.qv-tab');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    if(tab === 'details') { if(tabs[0]) tabs[0].classList.add('active'); if(document.getElementById('tab-details')) document.getElementById('tab-details').classList.add('active'); } 
    else { if(tabs[1]) tabs[1].classList.add('active'); if(document.getElementById('tab-reviews')) document.getElementById('tab-reviews').classList.add('active'); }
}
function renderReviews(id) {
    const list = document.getElementById('reviews-list');
    const prodReviews = reviews[id] || [];
    if(document.getElementById('qv-review-count')) document.getElementById('qv-review-count').innerText = prodReviews.length;
    if(!list) return;
    list.innerHTML = '';
    if(prodReviews.length === 0) { list.innerHTML = '<p style="color:#999; text-align:center; margin-bottom:1rem;">Sé el primero en opinar.</p>'; } 
    else { prodReviews.forEach(r => { list.innerHTML += `<div class="review-item"><div class="review-header"><span>${r.user}</span><span class="star-gold">${"★".repeat(r.rating)}</span></div><div class="review-text">${r.text}</div></div>`; }); }
}
function submitReview() {
    const name = document.getElementById('review-name').value;
    const text = document.getElementById('review-text').value;
    const ratingEl = document.querySelector('input[name="rating"]:checked');
    if(!name || !text || !ratingEl) return alert("Completa todos los campos.");
    const rating = parseInt(ratingEl.value);
    if(!reviews[currentOpenProductId]) reviews[currentOpenProductId] = [];
    reviews[currentOpenProductId].unshift({ user: name, rating: rating, text: text });
    localStorage.setItem('reviews', JSON.stringify(reviews));
    document.getElementById('review-name').value = '';
    document.getElementById('review-text').value = '';
    ratingEl.checked = false;
    renderReviews(currentOpenProductId);
    showToast("¡Gracias por tu opinión!");
    if(grid) renderFiltered(currentProducts); 
}

// =========================================
// 9. CHECKOUT INTELIGENTE (REGLAS DE NEGOCIO Y DIRECCIÓN)
// =========================================
function openCheckoutModal() {
    if(cart.length === 0) { showToast("Carrito vacío", "error"); return; }
    toggleCart(false);
    discount = 0; 
    document.getElementById('coupon-input').value = '';
    document.getElementById('coupon-msg').innerText = '';
    document.getElementById('modal-subtotal').style.display = 'block'; 
    document.getElementById('modal-discount').style.display = 'none';
    
    renderCheckoutItems();
    document.getElementById('checkout-overlay').classList.add('active');
}

function renderCheckoutItems() {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
            <label style="display:block;font-size:0.85rem;margin-bottom:5px;font-weight:600;">1. Forma de Pago:</label>
            <div style="display:flex;flex-direction:column;gap:5px;">
                <label style="border:1px solid #ddd;padding:8px;border-radius:6px;cursor:pointer;font-size:0.85rem;">
                    <input type="radio" name="payment" value="transfer" checked onchange="updateCheckoutRules()"> Transferencia / MercadoPago
                </label>
                <label style="border:1px solid #ddd;padding:8px;border-radius:6px;cursor:pointer;font-size:0.85rem;">
                    <input type="radio" name="payment" value="cash" onchange="updateCheckoutRules()"> Efectivo <strong style="color:#27ae60;">(10% OFF en productos seleccionados)</strong>
                </label>
            </div>
        </div>

        <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
            <label style="display:block;font-size:0.85rem;margin-bottom:5px;font-weight:600;">2. Método de Entrega:</label>
            <div style="display:flex;gap:10px;">
                <label id="lbl-retiro" style="flex:1;border:1px solid #ddd;padding:8px;border-radius:6px;cursor:pointer;font-size:0.85rem;">
                    <input type="radio" name="delivery" value="retiro" checked onchange="updateCheckoutRules()"> Retiro (Gratis)
                </label>
                <label id="lbl-envio" style="flex:1;border:1px solid #ddd;padding:8px;border-radius:6px;cursor:pointer;font-size:0.85rem;">
                    <input type="radio" name="delivery" value="envio" onchange="updateCheckoutRules()"> Envío a Domicilio
                </label>
            </div>
            
            <div id="address-container" style="display:none; margin-top:10px; background: #f8f9fa; padding:10px; border-radius:6px;">
                <label style="display:block;font-size:0.8rem;margin-bottom:3px;">Dirección de Entrega:</label>
                <input type="text" id="client-address" placeholder="Calle, Altura, Localidad..." style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:5px;">
                <p style="font-size:0.75rem; color:#636e72; line-height:1.3;">
                    <i class="ph ph-info"></i> <strong>Importante:</strong> En Haedo el envío es GRATIS. Resto de zonas sujeto a tarifa de Correo Andreani (se confirma por WhatsApp).
                </p>
            </div>
        </div>

        <div style="margin-bottom:15px;">
            <label style="display:block;font-size:0.85rem;margin-bottom:5px;font-weight:600;">3. Tus Datos:</label>
            <input type="text" id="client-name" placeholder="Tu Nombre" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:10px;">
            <input type="tel" id="client-phone" placeholder="Tu Celular (Para coordinar)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
        </div>

        <div style="margin-bottom:10px;">
            <label style="display:block;font-size:0.85rem;margin-bottom:5px;">Notas / Aclaraciones:</label>
            <textarea id="client-notes" placeholder="Ej: Es para regalo, no funciona el timbre..." rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></textarea>
        </div>

        <div style="border-top:1px solid #eee; padding-top:10px; margin-top:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:5px;">Productos:</h4>
            <div style="max-height: 120px; overflow-y: auto; padding-right: 5px; border: 1px solid #eee; border-radius: 6px; padding: 5px;">
                ${cart.map(i => `<div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:3px;"><span>${i.qty}x ${i.name}</span><span>$${(i.price*i.qty).toLocaleString()}</span></div>`).join('')}
            </div>
        </div>
    `;
    updateCheckoutRules(); 
}

function updateCheckoutRules() {
    const payment = document.querySelector('input[name="payment"]:checked').value;
    const deliveryRadios = document.getElementsByName('delivery');
    const lblEnvio = document.getElementById('lbl-envio');
    const addressContainer = document.getElementById('address-container');

    // REGLA: Si es Efectivo, bloqueo Envío (solo retiro)
    if (payment === 'cash') {
        deliveryRadios[0].checked = true;
        deliveryRadios[1].disabled = true;
        lblEnvio.style.opacity = '0.5';
        lblEnvio.style.pointerEvents = 'none';
        lblEnvio.title = "Envío solo disponible con Transferencia";
    } else {
        deliveryRadios[1].disabled = false;
        lblEnvio.style.opacity = '1';
        lblEnvio.style.pointerEvents = 'auto';
        lblEnvio.title = "";
    }

    // REGLA: Mostrar Dirección solo si eligió Envío
    const delivery = document.querySelector('input[name="delivery"]:checked').value;
    if (delivery === 'envio') {
        addressContainer.style.display = 'block';
    } else {
        addressContainer.style.display = 'none';
    }

    updateCheckoutTotal();
}

function updateCheckoutTotal() {
    let subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    let total = subtotal;
    let paymentDisc = 0;

    if (discount > 0) { total -= discount; }

    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    if (paymentMethod === 'cash') {
        // Recorrer carrito y sumar descuento solo de items habilitados
        cart.forEach(item => {
            if (item.promoCash) { // Si el producto tiene el flag activado en Admin
                const itemTotal = item.price * item.qty;
                paymentDisc += itemTotal * 0.10;
            }
        });
        total -= paymentDisc;
    }

    document.getElementById('modal-subtotal').innerText = `Subtotal: $${subtotal.toLocaleString()}`;
    
    const discElem = document.getElementById('modal-discount');
    // Mostrar descuentos acumulados (Cupón + Efectivo)
    const totalDiscount = discount + paymentDisc;
    
    if (totalDiscount > 0) {
        discElem.style.display = 'block';
        discElem.innerText = `Descuento Total: -$${totalDiscount.toLocaleString()}`;
    } else {
        discElem.style.display = 'none';
    }

    document.getElementById('modal-total-price').innerText = '$' + total.toLocaleString();
}

function applyCoupon() {
    const code = document.getElementById('coupon-input').value.toUpperCase().trim();
    const msg = document.getElementById('coupon-msg');
    let subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);

    const found = activeCoupons.find(c => c.code === code);
    if (found) {
        discount = subtotal * found.discount;
        msg.style.color = "#2ecc71";
        msg.innerText = `¡Cupón aplicado! ${found.discount * 100}% OFF`;
    } else {
        discount = 0;
        msg.style.color = "#e74c3c";
        msg.innerText = "Cupón inválido";
    }
    updateCheckoutRules(); // Usar la función maestra
}

function closeCheckoutModal() { document.getElementById('checkout-overlay').classList.remove('active'); toggleCart(true); }

function sendToWhatsApp() {
    const name = document.getElementById('client-name').value || "Cliente";
    const phone = document.getElementById('client-phone').value || "Sin especificar";
    const notes = document.getElementById('client-notes').value || "Ninguna";
    
    const deliveryVal = document.querySelector('input[name="delivery"]:checked').value;
    let deliveryText = "Retiro por Local";
    let addressText = "";

    // Si es envío, capturamos la dirección
    if (deliveryVal === 'envio') {
        const addressInput = document.getElementById('client-address').value;
        deliveryText = "Envío a Domicilio";
        addressText = `\n📍 *Dirección:* ${addressInput || 'A coordinar'}`;
    }

    const paymentVal = document.querySelector('input[name="payment"]:checked').value;
    const paymentText = paymentVal === "cash" ? "Efectivo" : "Transferencia / MP";
    
    // Obtener el total final calculado
    const finalTotal = document.getElementById('modal-total-price').innerText;

    let msg = `Hola! 👋 Soy *${name}*.\nQuiero confirmar mi pedido:\n\n`;
    
    cart.forEach(i => { 
        msg += `▪️ ${i.qty}x ${i.name}\n`; 
    });
    
    msg += `\n📞 *Teléfono:* ${phone}`;
    msg += `\n📦 *Entrega:* ${deliveryText}`;
    if (addressText) msg += addressText; // Solo agregamos dirección si corresponde
    msg += `\n💳 *Pago:* ${paymentText}`;
    msg += `\n📝 *Notas:* ${notes}`;
    msg += `\n\n💰 *TOTAL FINAL: ${finalTotal}*`;
    
    // Limpiar número
    const WHATSAPP_CLEAN = NUMERO_WHATSAPP.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${WHATSAPP_CLEAN}?text=${encodeURIComponent(msg)}`, '_blank');
    
    // Confeti y cierre
    confettiExplosion();
    closeCheckoutModal();
    showToast("¡Pedido generado! Serás redirigido a WhatsApp.", "success");
}

// =========================================
// 10. EXTRAS Y RETENCIÓN
// =========================================

// PACK DE RETENCIÓN (RECUPERADO)
function setupRetentionTools() {
    // 1. Título Dinámico
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            if (cart.length > 0) {
                document.title = `(${cart.reduce((a,b)=>a+b.qty,0)}) 🛒 ¡No olvides tu compra!`;
            } else {
                document.title = "💔 ¡Te extrañamos!";
            }
        } else {
            document.title = "El Solar by Romina | Tienda Artesanal";
        }
    });

    // 2. Exit Intent (Solo en escritorio)
    if (window.innerWidth > 768) {
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY < 0 && cart.length > 0 && !sessionStorage.getItem('exitIntentShown')) {
                const promoOverlay = document.getElementById('promo-overlay');
                if(promoOverlay) {
                    promoOverlay.innerHTML = `
                    <div class="promo-modal" style="animation: popIn 0.4s;">
                        <button class="promo-close" onclick="closePromo()">×</button>
                        <div class="promo-img" style="background:#ff7675; display:flex; align-items:center; justify-content:center;">
                            <i class="ph ph-shopping-cart" style="font-size:5rem; color:white;"></i>
                        </div>
                        <div class="promo-content">
                            <h3>¡Espera!</h3>
                            <p>Tienes productos increíbles en tu carrito.</p>
                            <p style="font-size:0.9rem;">¿Quieres completar tu compra ahora?</p>
                            <button class="hero-btn" onclick="closePromo(); toggleCart(true);">Ver Carrito</button>
                        </div>
                    </div>`;
                    promoOverlay.classList.add('active');
                    sessionStorage.setItem('exitIntentShown', 'true'); 
                }
            }
        });
    }
}

function addToHistory(id) {
    id = String(id);
    let history = JSON.parse(localStorage.getItem('history')) || [];
    history = history.filter(x => x !== id);
    history.unshift(id);
    if(history.length > 6) history.pop();
    localStorage.setItem('history', JSON.stringify(history));
    renderHistory();
}
function renderHistory() {
    const container = document.getElementById('history-container');
    const section = document.getElementById('history-section');
    if(!container || !section) return;
    const history = JSON.parse(localStorage.getItem('history')) || [];
    if(history.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    container.innerHTML = '';
    history.forEach(id => {
        const p = allProducts.find(x => String(x.id) === id);
        if(p) {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<div class="card-img" style="height:150px;"><img src="${p.img}" onclick="window.openQuickView('${p.id}')" style="cursor:pointer; object-fit:cover; width:100%; height:100%;"></div><div class="card-info" style="padding:0.8rem;"><div class="card-title" style="font-size:0.9rem;">${p.name}</div><div class="card-price" style="font-size:1rem;">$${p.price.toLocaleString()}</div></div>`;
            container.appendChild(card);
        }
    });
}
const botKnowledge = { saludo: ["hola", "buenos", "hi", "que tal"], precio: ["precio", "cuanto", "valor", "sale"], envio: ["envio", "entrega", "llevan", "haedo", "zona oeste", "retiro"], pago: ["pago", "tarjeta", "efectivo", "transferencia", "cuotas"], contacto: ["whatsapp", "telefono", "celular", "mail"], gracias: ["gracias", "ok", "listo", "chau"] };
function toggleChatWidget() { document.getElementById('chat-window').classList.toggle('active'); }
function handleChat(e) { if (e.key === 'Enter') sendMessage(); }
function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    addMessage(msg, 'user');
    input.value = '';
    setTimeout(() => { const response = getBotResponse(msg.toLowerCase()); addMessage(response, 'bot'); }, 600);
}
function addMessage(text, sender) { const container = document.getElementById('chat-messages'); const div = document.createElement('div'); div.className = `message ${sender}`; div.innerText = text; container.appendChild(div); container.scrollTop = container.scrollHeight; }
function getBotResponse(text) {
    const clean = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (botKnowledge.saludo.some(k => clean.includes(k))) return "¡Hola! 😊 ¿En qué puedo ayudarte hoy?";
    if (botKnowledge.precio.some(k => clean.includes(k))) return "Los precios están indicados en cada producto. Aceptamos efectivo y transferencia.";
    if (botKnowledge.envio.some(k => clean.includes(k))) return "Hacemos envíos en Zona Oeste o puedes retirar sin cargo por Haedo.";
    if (botKnowledge.pago.some(k => clean.includes(k))) return "Por el momento solo Efectivo o Transferencia Bancaria.";
    if (botKnowledge.gracias.some(k => clean.includes(k))) return "¡De nada! Quedo a tu disposición.";
    return "Soy una IA entrenada solo para responder sobre la tienda (Envíos, Pagos, Productos). 🤖";
}
const fakeSales = [ {name:"María", loc:"Morón", prod:"Gorro Lana"}, {name:"Lucía", loc:"Haedo", prod:"Cesta"}, {name:"Sofía", loc:"Ramos", prod:"Collar"}, {name:"Carla", loc:"Castelar", prod:"Mandala"} ];
function showSalesNotification() {
    const notif = document.getElementById('sales-notification');
    if(!notif || allProducts.length === 0) return;
    const randomCustomer = fakeSales[Math.floor(Math.random() * fakeSales.length)];
    const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
    const randomTime = Math.floor(Math.random() * 10) + 2;
    document.getElementById('sales-name').innerText = randomCustomer.name;
    const locElem = document.getElementById('sales-loc');
    if(locElem) locElem.innerText = randomCustomer.loc;
    document.getElementById('sales-product').innerText = randomProduct.name;
    document.getElementById('sales-img').src = randomProduct.img;
    document.getElementById('sales-time').innerText = `Hace ${randomTime} min`;
    notif.classList.add('active');
    setTimeout(() => { notif.classList.remove('active'); }, 5000);
}
function closeSalesNotification() { document.getElementById('sales-notification').classList.remove('active'); }
function closePromo() { document.getElementById('promo-overlay').classList.remove('active'); sessionStorage.setItem('promoShown', 'true'); }
let currentSlide = 0;
let slideInterval;
function initSlider() { const slides = document.querySelectorAll('.slide'); if (slides.length > 0) startSlideTimer(); }
function showSlide(idx) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    if(slides.length === 0) return;
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    if (idx >= slides.length) currentSlide = 0;
    else if (idx < 0) currentSlide = slides.length - 1;
    else currentSlide = idx;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}
function nextSlide() { showSlide(currentSlide + 1); }
function goToSlide(i) { showSlide(i); clearInterval(slideInterval); startSlideTimer(); }
function startSlideTimer() { slideInterval = setInterval(nextSlide, 5000); }
function observeRevealElements() {
    const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if(entry.isIntersecting) { entry.target.classList.add('active'); } }); }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
function showToast(msg, type="success") {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="ph ${type === 'success' ? 'ph-check-circle' : 'ph-x-circle'}"></i> ${msg}`;
    toast.style.animation = 'toastIn 0.3s forwards';
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- CONFETI ---
function confettiExplosion() {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';
        const duration = Math.random() * 3 + 2;
        confetti.style.transition = `top ${duration}s ease-out, transform ${duration}s linear`;
        document.body.appendChild(confetti);
        setTimeout(() => { confetti.style.top = '110vh'; confetti.style.transform = `rotate(${Math.random() * 360}deg)`; }, 100);
        setTimeout(() => confetti.remove(), duration * 1000);
    }
}

// INICIALIZACIÓN FINAL
initStore();