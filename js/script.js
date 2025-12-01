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

// CONSTANTES GLOBALES
const NUMERO_WHATSAPP = "5491100000000"; 
const ENVIO_GRATIS_META = 50000; 

// =========================================
// 2. ESTADO DE LA APLICACIÓN
// =========================================
let allProducts = [];       
let currentProducts = [];   
let categoriesData = [];    
let activeCoupons = [];     

// Recuperar carrito del LocalStorage
let cart = JSON.parse(localStorage.getItem('cart')) || []; 

let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let discount = 0;
let currentOpenProductId = null;
let reviews = JSON.parse(localStorage.getItem('reviews')) || {}; 

// REFERENCIAS AL DOM
const grid = document.getElementById('products-container');
const title = document.getElementById('current-section-title');

// =========================================
// 3. INICIALIZACIÓN
// =========================================
async function initStore() {
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
            if(grid) grid.innerHTML = "<p style='text-align:center; padding:2rem;'>No hay productos cargados en la nube. Ve al Admin para agregar.</p>";
        } else {
            filterByMain('all');
        }

        initSlider();
        renderHistory();
        updateCartUI(); 
        
        setTimeout(showSalesNotification, 10000);
        setTimeout(() => { 
            if(!sessionStorage.getItem('promoShown') && document.getElementById('promo-overlay')) {
                document.getElementById('promo-overlay').classList.add('active'); 
            }
        }, 3000);

    } catch (error) {
        console.error("Error conectando a Firebase:", error);
        if(grid) grid.innerHTML = '<p style="text-align:center; padding:2rem; color:red;">Error de conexión. Verifica tu archivo config.js o tu internet.</p>';
    }
}

// =========================================
// 4. MENÚ LATERAL DINÁMICO
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

// =========================================
// 5. FILTROS Y BÚSQUEDA
// =========================================
function filterByMain(catId) {
    renderWithAnimation(() => {
        const filtered = catId === 'all' ? allProducts : allProducts.filter(p => p.category === catId);
        renderFiltered(filtered);
        if(title) {
            if(catId === 'all') title.innerText = "Todos los Productos";
            else {
                const c = categoriesData.find(x => x.id === catId);
                title.innerText = c ? c.name : catId.toUpperCase();
            }
        }
    });
}

function filterBySub(catId, subId) {
    renderWithAnimation(() => {
        const filtered = allProducts.filter(p => p.category === catId && p.sub === subId);
        renderFiltered(filtered);
        if(title) title.innerText = subId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    });
}

function showFavorites() {
    renderWithAnimation(() => {
        const favs = allProducts.filter(p => wishlist.includes(String(p.id)));
        renderFiltered(favs);
        if(title) title.innerText = "Mis Favoritos ❤️";
    });
}

function searchProducts(query) {
    const term = query.toLowerCase().trim();
    if(term === "") { filterByMain('all'); return; }
    renderWithAnimation(() => {
        const results = allProducts.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p.category && p.category.includes(term)) ||
            (p.sub && p.sub.includes(term))
        );
        renderFiltered(results);
        if(title) title.innerText = `Resultados: "${term}"`;
    });
}

function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window)) { alert("Tu navegador no soporta búsqueda por voz."); return; }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "es-ES";
    const btn = document.querySelector('.voice-btn i');
    recognition.onstart = () => { if(btn) btn.parentElement.classList.add('listening'); const input = document.getElementById('search-input'); if(input) input.placeholder = "Escuchando..."; };
    recognition.onend = () => { if(btn) btn.parentElement.classList.remove('listening'); const input = document.getElementById('search-input'); if(input) input.placeholder = "Buscar..."; };
    recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; const input = document.getElementById('search-input'); if(input) input.value = transcript; searchProducts(transcript); };
    recognition.start();
}

function sortProducts(criteria) {
    let sorted = [...currentProducts];
    switch(criteria) {
        case 'price-asc': sorted.sort((a, b) => a.price - b.price); break;
        case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
        case 'alpha-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
        default: sorted.sort((a, b) => a.id - b.id); break;
    }
    renderFiltered(sorted, false); 
}

function setGridView() { const container = document.getElementById('products-container'); if(container) container.classList.remove('list-view'); document.querySelectorAll('.view-btn')[0]?.classList.add('active'); document.querySelectorAll('.view-btn')[1]?.classList.remove('active'); }
function setListView() { const container = document.getElementById('products-container'); if(container) container.classList.add('list-view'); document.querySelectorAll('.view-btn')[0]?.classList.remove('active'); document.querySelectorAll('.view-btn')[1]?.classList.add('active'); }

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
    if (animate) { observeRevealElements(); } else { document.querySelectorAll('.reveal').forEach(el => el.classList.add('active')); }
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
    else { cart.forEach(item => { total += item.price * item.qty; itemsEl.innerHTML += `<div class="cart-item"><div class="item-info"><h4>${item.name}</h4><small>$${item.price.toLocaleString()}</small></div><div class="item-controls"><button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button><span>${item.qty}</span><button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button><button onclick="window.removeFromCart('${item.id}')" style="border:none;background:none;color:red;cursor:pointer;margin-left:5px;">×</button></div></div>`; }); }
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
// 8. VISTA RÁPIDA (MODIFICADO CON COMPARTIR)
// =========================================
function openQuickView(id) {
    id = String(id);
    const p = allProducts.find(x => String(x.id) === id);
    if(!p) return;
    currentOpenProductId = id;
    addToHistory(id);
    
    document.getElementById('qv-img').src = p.img;
    const catObj = categoriesData.find(c => c.id === p.category);
    document.getElementById('qv-cat').innerText = `${catObj ? catObj.name : p.category} > ${p.sub || ''}`;
    document.getElementById('qv-title').innerText = p.name;
    
    const priceBox = document.getElementById('qv-price-box');
    let priceHtml = `<span class="current-price">$${p.price.toLocaleString()}</span>`;
    if(p.oldPrice && p.oldPrice > p.price) {
        const off = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
        priceHtml = `<span class="old-price">$${p.oldPrice.toLocaleString()}</span> <span class="current-price">$${p.price.toLocaleString()}</span> <span class="discount-tag">-${off}% OFF</span>`;
    }
    if(priceBox) priceBox.innerHTML = priceHtml;
    else document.getElementById('qv-price').innerHTML = priceHtml; 

    document.getElementById('qv-desc').innerText = p.desc || "Producto artesanal exclusivo.";
    
    // Asignar función al botón de agregar
    const addBtn = document.getElementById('qv-add-btn');
    addBtn.onclick = function() { 
        addToCart(p.id, this); 
        closeQuickViewForce(); 
    };

    // ----------------------------------------------------
    // NUEVA FUNCIÓN: INYECTAR BOTÓN COMPARTIR DINÁMICAMENTE
    // ----------------------------------------------------
    let shareBtn = document.getElementById('qv-share-btn');
    if (!shareBtn) {
        // Si no existe, lo creamos
        shareBtn = document.createElement('button');
        shareBtn.id = 'qv-share-btn';
        // Estilo integrado para no tocar CSS
        shareBtn.style.cssText = "margin-left: 10px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 1.2rem; transition: 0.3s;";
        shareBtn.innerHTML = '<i class="ph ph-share-network"></i>';
        shareBtn.title = "Compartir";
        
        // Efecto hover simple
        shareBtn.onmouseover = function() { this.style.background = "var(--input-bg)"; };
        shareBtn.onmouseout = function() { this.style.background = "var(--bg-card)"; };

        // Lo insertamos justo después del botón de agregar
        addBtn.parentNode.insertBefore(shareBtn, addBtn.nextSibling);
    }

    // Lógica del botón compartir
    shareBtn.onclick = async () => {
        const shareData = {
            title: p.name,
            text: `¡Mira este ${p.name} de El Solar by Romina! Precio: $${p.price}`,
            url: window.location.href // Comparte el link de la tienda
        };

        try {
            // Intentar usar la API nativa del celular
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback para PC: Copiar al portapapeles
                navigator.clipboard.writeText(`${shareData.text} en: ${shareData.url}`);
                showToast("¡Link copiado al portapapeles!");
            }
        } catch (err) {
            console.log("Error al compartir:", err);
        }
    };
    // ----------------------------------------------------

    const relatedContainer = document.getElementById('qv-related-container');
    if(relatedContainer) {
        relatedContainer.innerHTML = '';
        const related = allProducts.filter(item => item.category === p.category && String(item.id) !== id).slice(0, 2);
        if(related.length > 0) {
            related.forEach(rel => {
                const relDiv = document.createElement('div');
                relDiv.className = 'related-card';
                relDiv.onclick = () => openQuickView(rel.id);
                relDiv.innerHTML = `<img src="${rel.img}"> <div class="related-info"><h5>${rel.name}</h5><span>$${rel.price.toLocaleString()}</span></div>`;
                relatedContainer.appendChild(relDiv);
            });
        } else { relatedContainer.innerHTML = '<p style="font-size:0.8rem; color:#999;">No hay productos similares.</p>'; }
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
// 9. CHECKOUT Y EXTRAS
// =========================================
function openCheckoutModal() {
    if(cart.length === 0) { showToast("Carrito vacío", "error"); return; }
    toggleCart(false);
    discount = 0;
    document.getElementById('coupon-input').value = '';
    document.getElementById('coupon-msg').innerText = '';
    document.getElementById('modal-subtotal').style.display = 'none';
    document.getElementById('modal-discount').style.display = 'none';
    renderCheckoutItems();
    document.getElementById('checkout-overlay').classList.add('active');
}
function renderCheckoutItems() {
    const body = document.getElementById('modal-body');
    let subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    let html = '';
    cart.forEach(i => { html += `<div class="summary-item"><span>${i.qty}x ${i.name}</span><strong>$${(i.price * i.qty).toLocaleString()}</strong></div>`; });
    body.innerHTML = html;
    const total = subtotal - discount;
    if(discount > 0) {
        document.getElementById('modal-subtotal').style.display = 'block';
        document.getElementById('modal-subtotal').innerText = `Subtotal: $${subtotal.toLocaleString()}`;
        document.getElementById('modal-discount').style.display = 'block';
        document.getElementById('modal-discount').innerText = `Descuento: -$${discount.toLocaleString()}`;
    }
    document.getElementById('modal-total-price').innerText = '$' + total.toLocaleString();
}
function applyCoupon() {
    const code = document.getElementById('coupon-input').value.toUpperCase().trim();
    const msg = document.getElementById('coupon-msg');
    let subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const found = activeCoupons.find(c => c.code === code);
    if (found) { discount = subtotal * found.discount; msg.style.color = "#2ecc71"; msg.innerText = `¡Cupón aplicado! ${found.discount * 100}% OFF`; renderCheckoutItems(); } 
    else { discount = 0; msg.style.color = "#e74c3c"; msg.innerText = "Cupón inválido"; renderCheckoutItems(); }
}
function closeCheckoutModal() { document.getElementById('checkout-overlay').classList.remove('active'); toggleCart(true); }
function sendToWhatsApp() {
    let msg = "Hola! 👋 Quiero confirmar mi pedido:\n\n";
    let subtotal = 0;
    cart.forEach(i => { let s = i.price * i.qty; subtotal += s; msg += `▪️ ${i.qty}x ${i.name} - $${s.toLocaleString()}\n`; });
    if (discount > 0) { msg += `\nSubtotal: $${subtotal.toLocaleString()}\nDescuento: -$${discount.toLocaleString()}`; }
    msg += `\n💰 *Total Final: $${(subtotal - discount).toLocaleString()}*\n\nCoordino pago y entrega.`;
    window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
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
    const randomSale = fakeSales[Math.floor(Math.random() * fakeSales.length)];
    const randomTime = Math.floor(Math.random() * 10) + 2;
    const pImg = allProducts[Math.floor(Math.random() * allProducts.length)].img;
    document.getElementById('sales-name').innerText = randomSale.name;
    document.getElementById('sales-product').innerText = randomSale.prod;
    document.getElementById('sales-time').innerText = `Hace ${randomTime} min`;
    document.getElementById('sales-img').src = pImg;
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

// INICIALIZACIÓN FINAL
initStore();