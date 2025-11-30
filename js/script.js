// js/script.js
import { db } from './config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Exponer funciones al HTML (Necesario porque es un módulo)
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

// CONFIGURACIÓN
const NUMERO_WHATSAPP = "5491100000000"; 
const ENVIO_GRATIS_META = 50000;

// ESTADO
let allProducts = [];
let currentProducts = [];
let categoriesData = [];
let activeCoupons = []; // Se llena desde Firebase
let cart = []; // El carrito es local por sesión
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let discount = 0;
let currentOpenProductId = null;
// Las reseñas las simulamos locales por ahora para no complicar la base de datos
let reviews = JSON.parse(localStorage.getItem('reviews')) || {}; 

const grid = document.getElementById('products-container');
const title = document.getElementById('current-section-title');

// =========================================
// 1. CARGA DESDE FIREBASE
// =========================================
async function initStore() {
    try {
        // Cargar Categorías
        const catSnap = await getDocs(collection(db, "categories"));
        categoriesData = [];
        catSnap.forEach(doc => categoriesData.push({id: doc.id, ...doc.data()}));
        renderDynamicMenu(); // Dibujar menú lateral

        // Cargar Cupones
        const coupSnap = await getDocs(collection(db, "coupons"));
        activeCoupons = [];
        coupSnap.forEach(doc => activeCoupons.push(doc.data()));

        // Cargar Productos
        const prodSnap = await getDocs(collection(db, "products"));
        allProducts = [];
        prodSnap.forEach(doc => {
            // Normalizamos datos para que coincidan con nuestro formato interno
            const data = doc.data();
            allProducts.push({
                id: doc.id, // ID de Firebase (string)
                ...data,
                price: Number(data.price) // Asegurar que sea número
            });
        });
        
        // Iniciar Vista
        filterByMain('all');

        // Iniciar Extras
        initSlider();
        renderHistory();
        setTimeout(showSalesNotification, 10000);
        setTimeout(() => { if(!sessionStorage.getItem('promoShown') && document.getElementById('promo-overlay')) document.getElementById('promo-overlay').classList.add('active'); }, 3000);

    } catch (error) {
        console.error("Error Firebase:", error);
        if(grid) grid.innerHTML = '<p style="text-align:center; padding:2rem;">Error de conexión. Intenta recargar.</p>';
    }
}

// =========================================
// 2. MENÚ LATERAL
// =========================================
function renderDynamicMenu() {
    const menuContainer = document.querySelector('.menu-scroll-content');
    if (!menuContainer) return;
    menuContainer.innerHTML = '';
    
    categoriesData.forEach(cat => {
        const groupDiv = document.createElement('div'); groupDiv.className = 'menu-group';
        const h3 = document.createElement('h3'); h3.innerText = cat.name; h3.onclick = () => filterByMain(cat.id); groupDiv.appendChild(h3);
        const ul = document.createElement('ul');
        if(cat.subs) {
            cat.subs.forEach(sub => {
                const li = document.createElement('li'); li.innerText = sub.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); li.onclick = () => filterBySub(cat.id, sub); ul.appendChild(li);
            });
        }
        groupDiv.appendChild(ul); menuContainer.appendChild(groupDiv);
    });
    const btn = document.createElement('button'); btn.className = 'ver-todo-btn'; btn.innerText = 'Ver Todo'; btn.onclick = () => filterByMain('all'); menuContainer.appendChild(btn);
}

// =========================================
// 3. FILTROS & RENDERIZADO
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

function renderFiltered(list) {
    if (!grid) return;
    currentProducts = list;
    const countLabel = document.getElementById('product-count');
    if (countLabel) countLabel.innerText = list.length;

    grid.innerHTML = '';
    if(list.length === 0) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;">No hay productos.</p>'; return; }
    
    list.forEach(p => createProductCard(p));
    
    // Reactivar animaciones
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('active'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function createProductCard(p) {
    let badgeHTML = p.badge ? `<span class="card-badge ${p.badge === 'Oferta' ? 'badge-offer' : 'badge-new'}">${p.badge}</span>` : '';
    const isFav = wishlist.includes(p.id) ? 'active' : '';
    const heartIcon = wishlist.includes(p.id) ? 'ph-heart-fill' : 'ph-heart';

    // Precio (Soporta oldPrice si lo guardas en Firebase)
    let priceHTML = `<div class="card-price">$${p.price.toLocaleString()}</div>`;
    if(p.oldPrice && p.oldPrice > p.price) {
        const off = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
        priceHTML = `<div class="card-price"><span class="old-price">$${p.oldPrice.toLocaleString()}</span> $${p.price.toLocaleString()}</div>`;
        if(!p.badge) badgeHTML = `<span class="card-badge badge-offer">-${off}% OFF</span>`;
    }
    
    // Estrellas (Calculadas de reviews locales por ahora)
    const prodReviews = reviews[p.id] || [];
    let ratingHTML = '';
    if (prodReviews.length > 0) {
        const avg = prodReviews.reduce((a, r) => a + parseInt(r.rating), 0) / prodReviews.length;
        const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
        ratingHTML = `<div class="star-rating"><span class="star-gold">${stars}</span> <small>(${prodReviews.length})</small></div>`;
    }

    // OJO: Las comillas en los onclick deben ser simples para el ID (que es string en Firebase)
    const card = document.createElement('div'); card.className = 'card reveal';
    card.innerHTML = `
        <div class="card-img">
            ${badgeHTML}
            <button class="wishlist-btn ${isFav}" onclick="window.toggleWishlist('${p.id}', this)"><i class="ph ${heartIcon}"></i></button>
            <button class="quick-view-btn" onclick="window.openQuickView('${p.id}')"><i class="ph ph-eye"></i></button>
            <img src="${p.img}" alt="${p.name}" onclick="window.openQuickView('${p.id}')" style="cursor:pointer" onerror="this.src='https://placehold.co/300x200?text=Sin+Foto'">
        </div>
        <div class="card-info">
            <div class="card-cat">${p.category} > ${p.sub}</div>
            <div class="card-title">${p.name}</div>
            ${ratingHTML}
            ${priceHTML}
            <button class="add-btn" onclick="window.addToCart('${p.id}', this)"><i class="ph ph-basket"></i> Agregar</button>
        </div>
    `;
    grid.appendChild(card);
}

function renderWithAnimation(cb) {
    if(!grid) return;
    grid.style.opacity = '0';
    setTimeout(() => { cb(); grid.style.opacity = '1'; }, 200);
}

// =========================================
// 4. CARRITO (PRO)
// =========================================
function addToCart(id, btnElement = null) {
    const exist = cart.find(i => i.id === id);
    if(exist) { exist.qty++; showToast("Cantidad actualizada"); } 
    else { const p = allProducts.find(x => x.id === id); cart.push({ ...p, qty: 1 }); showToast("Agregado al carrito"); }
    updateCartUI();
    // Animación de vuelo
    if(btnElement) {
        const card = btnElement.closest('.card') || document.querySelector('.qv-image-col');
        const img = card.querySelector('img');
        if(img) flyToCart(img);
    }
    toggleCart(true);
}

function flyToCart(imgSource) {
    const cartBtn = document.querySelector('.cart-btn'); if(!cartBtn) return;
    const flyingImg = imgSource.cloneNode(); flyingImg.classList.add('flying-img');
    const rect = imgSource.getBoundingClientRect();
    flyingImg.style.left = rect.left + 'px'; flyingImg.style.top = rect.top + 'px'; flyingImg.style.width = rect.width + 'px'; flyingImg.style.height = rect.height + 'px';
    document.body.appendChild(flyingImg); void flyingImg.offsetWidth;
    const cartRect = cartBtn.getBoundingClientRect();
    flyingImg.style.left = (cartRect.left + cartRect.width / 2) + 'px'; flyingImg.style.top = (cartRect.top + cartRect.height / 2) + 'px'; flyingImg.style.width = '20px'; flyingImg.style.height = '20px'; flyingImg.style.opacity = '0';
    setTimeout(() => flyingImg.remove(), 800);
}

function updateCartUI() {
    const itemsEl = document.getElementById('cart-items');
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total');
    const shipBar = document.getElementById('shipping-bar');
    const shipMsg = document.getElementById('shipping-msg');
    
    if(!itemsEl) return;
    
    countEl.innerText = cart.reduce((a, b) => a + b.qty, 0);
    let total = 0; itemsEl.innerHTML = '';
    
    if(cart.length === 0) itemsEl.innerHTML = '<p style="text-align:center;color:#999;">Vacío</p>';
    else {
        cart.forEach(item => {
            total += item.price * item.qty;
            const div = document.createElement('div'); div.className = 'cart-item';
            div.innerHTML = `
                <div class="item-info"><h4>${item.name}</h4><small>$${item.price}</small></div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="window.changeQty('${item.id}',-1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="window.changeQty('${item.id}',1)">+</button>
                    <button onclick="window.removeFromCart('${item.id}')" style="border:none;background:none;color:red;cursor:pointer;margin-left:5px;"><i class="ph ph-trash"></i></button>
                </div>`;
            itemsEl.appendChild(div);
        });
    }
    totalEl.innerText = '$' + total.toLocaleString();

    // Barra Envío
    if(shipBar) {
        const percent = Math.min((total / ENVIO_GRATIS_META) * 100, 100);
        shipBar.style.width = percent + "%";
        if (total >= ENVIO_GRATIS_META) { shipBar.style.backgroundColor = "#2ecc71"; shipMsg.innerHTML = "¡Genial! Tienes <strong>Envío Gratis</strong> 🚀"; } 
        else { shipBar.style.backgroundColor = "var(--primary)"; shipMsg.innerHTML = `Faltan <strong>$${(ENVIO_GRATIS_META - total).toLocaleString()}</strong> para envío gratis.`; }
    }
}

function changeQty(id, chg) { const item = cart.find(i => i.id === id); if(item) { item.qty += chg; if(item.qty<=0) removeFromCart(id); else updateCartUI(); } }
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); updateCartUI(); showToast("Eliminado", "error"); }
function toggleCart(force) { const sb = document.getElementById('sidebar'); const ov = document.getElementById('overlay'); if(!sb) return; if(force) { sb.classList.add('open'); ov.classList.add('active'); } else { sb.classList.toggle('open'); ov.classList.toggle('active'); } }

// =========================================
// 5. CHECKOUT & CUPONES
// =========================================
function openCheckoutModal() {
    if(cart.length === 0) return showToast("Carrito vacío", "error");
    toggleCart(false);
    discount = 0; document.getElementById('coupon-input').value = ''; document.getElementById('coupon-msg').innerText = '';
    renderCheckoutItems();
    document.getElementById('checkout-overlay').classList.add('active');
}
function renderCheckoutItems() {
    const body = document.getElementById('modal-body');
    let subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    let html = '';
    cart.forEach(i => html += `<div class="summary-item"><span>${i.qty}x ${i.name}</span><strong>$${(i.price*i.qty).toLocaleString()}</strong></div>`);
    body.innerHTML = html;
    const total = subtotal - discount;
    document.getElementById('modal-subtotal').innerText = `Sub: $${subtotal.toLocaleString()}`;
    document.getElementById('modal-subtotal').style.display = 'block';
    document.getElementById('modal-discount').innerText = `Desc: -$${discount.toLocaleString()}`;
    document.getElementById('modal-discount').style.display = discount > 0 ? 'block' : 'none';
    document.getElementById('modal-total-price').innerText = '$' + total.toLocaleString();
}
function applyCoupon() {
    const code = document.getElementById('coupon-input').value.toUpperCase().trim();
    const msg = document.getElementById('coupon-msg');
    let subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    
    // Buscar en cupones de Firebase
    const found = activeCoupons.find(c => c.code === code);
    if (found) {
        discount = subtotal * found.discount; // Ej: 0.10
        msg.style.color = "green"; msg.innerText = `¡Cupón aplicado! ${found.discount*100}% OFF`;
        renderCheckoutItems();
    } else {
        discount = 0; msg.style.color = "red"; msg.innerText = "Cupón inválido"; renderCheckoutItems();
    }
}
function closeCheckoutModal() { document.getElementById('checkout-overlay').classList.remove('active'); toggleCart(true); }
function sendToWhatsApp() {
    let msg = "Hola! 👋 Pedido:\n";
    let subtotal = 0;
    cart.forEach(i => { 
        let s = i.price * i.qty; subtotal += s; 
        msg += `${i.qty}x ${i.name} - $${s}\n`; 
    });
    if(discount > 0) msg += `Descuento: -$${discount}\n`;
    msg += `\nTotal Final: $${subtotal - discount}`;
    window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
}

// =========================================
// 6. EXTRAS (Favoritos, Buscador, Sort, Chat)
// =========================================
function toggleWishlist(id, btn) {
    const idx = wishlist.indexOf(id);
    const icon = btn.querySelector('i');
    if(idx === -1) { wishlist.push(id); btn.classList.add('active', 'animating'); icon.classList.replace('ph-heart', 'ph-heart-fill'); showToast("Agregado a favoritos"); }
    else { wishlist.splice(idx, 1); btn.classList.remove('active'); icon.classList.replace('ph-heart-fill', 'ph-heart'); if(title && title.innerText.includes("Favoritos")) showFavorites(); }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    setTimeout(() => btn.classList.remove('animating'), 500);
}
function showFavorites() {
    const favs = allProducts.filter(p => wishlist.includes(p.id));
    renderFiltered(favs);
    if(title) title.innerText = "Favoritos ❤️";
}
function searchProducts(query) {
    const term = query.toLowerCase().trim();
    if(term === "") { filterByMain('all'); return; }
    renderWithAnimation(() => {
        const results = allProducts.filter(p => p.name.toLowerCase().includes(term) || (p.category && p.category.includes(term)));
        renderFiltered(results);
        if(title) title.innerText = `Resultados: "${term}"`;
    });
}
function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window)) return alert("Tu navegador no soporta voz.");
    const recognition = new webkitSpeechRecognition(); recognition.lang = "es-ES"; const btn = document.querySelector('.voice-btn i');
    recognition.onstart = () => { if(btn) btn.parentElement.classList.add('listening'); document.getElementById('search-input').placeholder = "Escuchando..."; };
    recognition.onend = () => { if(btn) btn.parentElement.classList.remove('listening'); document.getElementById('search-input').placeholder = "Buscar..."; };
    recognition.onresult = (event) => { const t = event.results[0][0].transcript; document.getElementById('search-input').value = t; searchProducts(t); };
    recognition.start();
}
function sortProducts(criteria) {
    let sorted = [...currentProducts];
    if(criteria === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    if(criteria === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    if(criteria === 'alpha-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    renderFilteredOnly(sorted);
}
function setGridView() { document.getElementById('products-container').classList.remove('list-view'); document.querySelectorAll('.view-btn')[0].classList.add('active'); document.querySelectorAll('.view-btn')[1].classList.remove('active'); }
function setListView() { document.getElementById('products-container').classList.add('list-view'); document.querySelectorAll('.view-btn')[0].classList.remove('active'); document.querySelectorAll('.view-btn')[1].classList.add('active'); }

function showToast(msg, type='success') {
    const box = document.getElementById('toast-container');
    if(box) { const d = document.createElement('div'); d.className=`toast ${type}`; d.innerHTML=`${type==='success'?'<i class="ph ph-check-circle"></i>':'<i class="ph ph-warning-circle"></i>'} ${msg}`; box.appendChild(d); setTimeout(() => d.remove(), 3000); }
}

// Chatbot
const botData = { saludo: ["hola"], precio: ["precio"], envio: ["envio"], pago: ["pago"] };
function toggleChatWidget() { document.getElementById('chat-window').classList.toggle('active'); }
function handleChat(e) { if (e.key === 'Enter') sendMessage(); }
function sendMessage() {
    const inp = document.getElementById('chat-input');
    if(inp.value.trim()) {
        const d = document.createElement('div'); d.className='message user'; d.innerText=inp.value;
        document.getElementById('chat-messages').appendChild(d);
        inp.value='';
        setTimeout(() => {
            const r = document.createElement('div'); r.className='message bot'; r.innerText="Soy una IA. Pregúntame sobre envíos o productos.";
            document.getElementById('chat-messages').appendChild(r);
        }, 600);
    }
}

// Notificaciones
function showSalesNotification() {
    const n = document.getElementById('sales-notification');
    if(n && allProducts.length > 0) {
        const p = allProducts[Math.floor(Math.random()*allProducts.length)];
        document.getElementById('sales-product').innerText = p.name;
        document.getElementById('sales-img').src = p.img;
        n.classList.add('active');
        setTimeout(() => n.classList.remove('active'), 5000);
    }
}
function closeSalesNotification() { document.getElementById('sales-notification').classList.remove('active'); }
setInterval(showSalesNotification, 30000);

function closePromo() { document.getElementById('promo-overlay').classList.remove('active'); sessionStorage.setItem('promoShown', 'true'); }

// =========================================
// 7. VISTA RÁPIDA & RESEÑAS
// =========================================
function openQuickView(id) {
    const p = allProducts.find(x => x.id === id); if(!p) return;
    currentOpenProductId = id;
    addToHistory(id);
    
    document.getElementById('qv-img').src = p.img;
    const catObj = categoriesData.find(c => c.id === p.category);
    document.getElementById('qv-cat').innerText = `${catObj ? catObj.name : p.category} > ${p.sub}`;
    document.getElementById('qv-title').innerText = p.name;
    document.getElementById('qv-price').innerText = `$${p.price.toLocaleString()}`;
    document.getElementById('qv-desc').innerText = p.desc || "Producto artesanal exclusivo.";

    const viewers = Math.floor(Math.random() * 20) + 5;
    if(document.getElementById('qv-viewers')) document.getElementById('qv-viewers').innerText = viewers;

    // Estrellas
    const prodReviews = reviews[p.id] || [];
    let starsHTML = "";
    if(prodReviews.length > 0) {
        const avg = prodReviews.reduce((a, r) => a + parseInt(r.rating), 0) / prodReviews.length;
        starsHTML = `<span class="star-gold">${"★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg))}</span> <small>(${prodReviews.length} op.)</small>`;
    } else starsHTML = "<small>Sin opiniones</small>";
    document.getElementById('qv-stars-display').innerHTML = starsHTML;

    document.getElementById('qv-add-btn').onclick = function() { addToCart(p.id, this); closeQuickViewForce(); };

    // Relacionados
    const relatedContainer = document.getElementById('qv-related-container');
    if(relatedContainer) {
        relatedContainer.innerHTML = '';
        const related = allProducts.filter(item => item.category === p.category && item.id !== p.id).slice(0, 2);
        if(related.length > 0) {
            related.forEach(rel => {
                const relDiv = document.createElement('div'); relDiv.className = 'related-card';
                relDiv.onclick = () => openQuickView(rel.id);
                relDiv.innerHTML = `<img src="${rel.img}"> <div class="related-info"><h5>${rel.name}</h5><span>$${rel.price.toLocaleString()}</span></div>`;
                relatedContainer.appendChild(relDiv);
            });
        } else { relatedContainer.innerHTML = '<p style="font-size:0.8rem; color:#999;">No hay similares.</p>'; }
    }

    switchTab('details'); renderReviews(id); document.getElementById('qv-overlay').classList.add('active');
}

function switchTab(tab) {
    document.querySelectorAll('.qv-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    if(tab === 'details') { document.querySelector('.qv-tab:nth-child(1)').classList.add('active'); document.getElementById('tab-details').classList.add('active'); }
    else { document.querySelector('.qv-tab:nth-child(2)').classList.add('active'); document.getElementById('tab-reviews').classList.add('active'); }
}

function renderReviews(id) {
    const list = document.getElementById('reviews-list'); const prodReviews = reviews[id] || [];
    if(document.getElementById('qv-review-count')) document.getElementById('qv-review-count').innerText = prodReviews.length;
    list.innerHTML = '';
    if(prodReviews.length === 0) list.innerHTML = '<p style="color:#999; text-align:center;">Sé el primero en opinar.</p>';
    else prodReviews.forEach(r => { list.innerHTML += `<div class="review-item"><div class="review-header"><span>${r.user}</span><span class="star-gold">${"★".repeat(r.rating)}</span></div><div class="review-text">${r.text}</div></div>`; });
}

function submitReview() {
    const name = document.getElementById('review-name').value; const text = document.getElementById('review-text').value; const ratingEl = document.querySelector('input[name="rating"]:checked');
    if(!name || !text || !ratingEl) return alert("Completa todo.");
    const rating = parseInt(ratingEl.value); if(!reviews[currentOpenProductId]) reviews[currentOpenProductId] = [];
    reviews[currentOpenProductId].unshift({ user: name, rating: rating, text: text });
    localStorage.setItem('reviews', JSON.stringify(reviews));
    document.getElementById('review-name').value = ''; document.getElementById('review-text').value = ''; ratingEl.checked = false;
    renderReviews(currentOpenProductId); showToast("¡Gracias!");
}

function closeQuickView(e) { if(e.target.id === 'qv-overlay') closeQuickViewForce(); }
function closeQuickViewForce() { document.getElementById('qv-overlay').classList.remove('active'); }

// SLIDER
let currentSlide = 0; const slides = document.querySelectorAll('.slide'); const dots = document.querySelectorAll('.dot'); let slideInterval;
function initSlider() { if (slides.length > 0) startSlideTimer(); }
function showSlide(idx) { slides.forEach(s => s.classList.remove('active')); dots.forEach(d => d.classList.remove('active')); if (idx >= slides.length) currentSlide = 0; else if (idx < 0) currentSlide = slides.length - 1; else currentSlide = idx; slides[currentSlide].classList.add('active'); dots[currentSlide].classList.add('active'); }
function nextSlide() { showSlide(currentSlide + 1); }
function goToSlide(i) { showSlide(i); clearInterval(slideInterval); startSlideTimer(); }
function startSlideTimer() { slideInterval = setInterval(nextSlide, 5000); }

// INIT
initStore();