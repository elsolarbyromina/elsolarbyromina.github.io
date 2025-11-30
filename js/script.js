// =========================================
// 1. CONFIGURACIÓN Y DATOS
// =========================================
const NUMERO_WHATSAPP = "5491100000000"; 
const ENVIO_GRATIS_META = 50000;

// DATOS INICIALES
const defaultProducts = [
    { id: 101, name: "Cesta Organizadora", price: 8500, category: "crochet", sub: "deco", img: "https://images.unsplash.com/photo-1616402939726-326b79495e71?auto=format&fit=crop&w=500&q=80", badge: "Nuevo", desc: "Cesta multiuso tejida a mano con hilo de algodón reforzado." },
    { id: 102, name: "Gorro Lana Merino", price: 15000, category: "crochet", sub: "prendas", img: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=500&q=80", badge: "Oferta", desc: "Gorro súper abrigado de lana merino natural. Ideal para invierno." },
    { id: 103, name: "Discos Desmaquillantes", price: 4500, category: "crochet", sub: "kit-eco", img: "https://images.unsplash.com/photo-1620495265690-97d9c0837e9c?auto=format&fit=crop&w=500&q=80", desc: "Pack de 3 discos reutilizables lavables. Ecológicos y suaves." },
    { id: 104, name: "Bufanda Infinita", price: 18000, category: "crochet", sub: "accesorios", img: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=500&q=80", desc: "Bufanda circular sin costuras, muy suave al tacto." },
    { id: 201, name: "Collar Piedras", price: 9200, category: "biyou", sub: "collares", img: "https://images.unsplash.com/photo-1599643478518-17488fbbcd75?auto=format&fit=crop&w=500&q=80", desc: "Collar artesanal con piedras semi-preciosas y terminaciones en plata." },
    { id: 202, name: "Pulsera Hilo Rojo", price: 3500, category: "biyou", sub: "pulseras", img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=500&q=80", desc: "Pulsera regulable de protección contra malas energías." },
    { id: 203, name: "Llavero Pompon", price: 2500, category: "biyou", sub: "llaveros", img: "https://images.unsplash.com/photo-1586182227820-6702d442677d?auto=format&fit=crop&w=500&q=80", desc: "Llavero colorido con pompones y borlas." },
    { id: 204, name: "Hebilla Decorada", price: 1500, category: "biyou", sub: "apliques", img: "https://images.unsplash.com/photo-1571168270233-37963a63c240?auto=format&fit=crop&w=500&q=80", desc: "Hebilla francesa decorada con perlas." },
    { id: 301, name: "Mandala Colgante", price: 12000, category: "deco-gral", sub: "mandalas", img: "https://images.unsplash.com/photo-1564632252332-791977f321a2?auto=format&fit=crop&w=500&q=80", badge: "Nuevo", desc: "Mandala tejido de 30cm de diámetro para colgar." },
    { id: 302, name: "Espejo Mosaiquismo", price: 25000, category: "deco-gral", sub: "mosaiquismo", img: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=500&q=80", desc: "Espejo decorativo con marco de venecitas artesanales." },
    { id: 303, name: "Caja Té Madera", price: 9800, category: "deco-gral", sub: "madera", img: "https://images.unsplash.com/photo-1549216463-78c21bf08736?auto=format&fit=crop&w=500&q=80", desc: "Caja de madera pintada a mano para saquitos de té." },
    { id: 304, name: "Atrapasueños", price: 7500, category: "deco-gral", sub: "atrapasuenos", img: "https://images.unsplash.com/photo-1515961896317-adf9e14bdcc0?auto=format&fit=crop&w=500&q=80", desc: "Atrapasueños con plumas naturales y cuentas de madera." },
    { id: 401, name: "Sorpresa 1", price: 5000, category: "otros", sub: "otros1", img: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=500&q=80", badge: "Oferta", desc: "Caja sorpresa pequeña con accesorios varios." },
];

const defaultCategories = [
    { id: 'crochet', name: 'Crochet', subs: ['deco', 'accesorios', 'prendas', 'kit-eco'] },
    { id: 'biyou', name: 'Biyou', subs: ['collares', 'pulseras', 'llaveros', 'apliques'] },
    { id: 'deco-gral', name: 'Deco Hogar', subs: ['mandalas', 'mosaiquismo', 'madera', 'atrapasuenos', 'colgantes'] },
    { id: 'otros', name: 'Otros', subs: ['otros1', 'otros2', 'otros3'] }
];

const defaultCoupons = { "TIENDA10": 0.10 };

const defaultReviews = {
    101: [{ user: "Ana", rating: 5, text: "¡Me encantó! Muy buena calidad." }, { user: "Sol", rating: 4, text: "Linda, aunque tardó un poquito el envío." }],
    102: [{ user: "Pedro", rating: 5, text: "Súper abrigado y suave." }]
};

// CARGA MEMORIA
let products = JSON.parse(localStorage.getItem('products')); if (!products || products.length === 0) { products = defaultProducts; localStorage.setItem('products', JSON.stringify(products)); }
let categories = JSON.parse(localStorage.getItem('categories')); if (!categories || categories.length === 0) { categories = defaultCategories; localStorage.setItem('categories', JSON.stringify(categories)); }
let activeCoupons = JSON.parse(localStorage.getItem('coupons')); if (!activeCoupons) { activeCoupons = defaultCoupons; localStorage.setItem('coupons', JSON.stringify(activeCoupons)); }
let reviews = JSON.parse(localStorage.getItem('reviews')); if (!reviews) { reviews = defaultReviews; localStorage.setItem('reviews', JSON.stringify(reviews)); }

let cart = []; let wishlist = JSON.parse(localStorage.getItem('wishlist')) || []; let currentProducts = []; let discount = 0; let currentOpenProductId = null;
const grid = document.getElementById('products-container'); const title = document.getElementById('current-section-title');

// HELPER MULTIMEDIA
function getMediaHTML(src, alt, className = "", events = "") {
    const isVideo = src && (src.startsWith('data:video') || src.endsWith('.mp4') || src.endsWith('.webm'));
    if (isVideo) {
        return `<video src="${src}" class="${className}" autoplay loop muted playsinline ${events}></video>`;
    } else {
        return `<img src="${src}" alt="${alt}" class="${className}" ${events} onerror="this.src='https://placehold.co/300x200?text=Sin+Foto'">`;
    }
}

// MENU
function renderDynamicMenu() {
    const menuContainer = document.querySelector('.menu-scroll-content'); if (!menuContainer) return;
    menuContainer.innerHTML = '';
    categories.forEach(cat => {
        const groupDiv = document.createElement('div'); groupDiv.className = 'menu-group';
        const h3 = document.createElement('h3'); h3.innerText = cat.name; h3.onclick = () => filterByMain(cat.id); groupDiv.appendChild(h3);
        const ul = document.createElement('ul');
        cat.subs.forEach(sub => { const li = document.createElement('li'); li.innerText = sub.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); li.onclick = () => filterBySub(cat.id, sub); ul.appendChild(li); });
        groupDiv.appendChild(ul); menuContainer.appendChild(groupDiv);
    });
    const btn = document.createElement('button'); btn.className = 'ver-todo-btn'; btn.innerText = 'Ver Todo'; btn.onclick = () => filterByMain('all'); menuContainer.appendChild(btn);
}

// TOAST
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container'); if(!container) return;
    const toast = document.createElement('div'); toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<i class="ph ph-check-circle"></i>' : '<i class="ph ph-warning-circle"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`; container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// BUSQUEDA POR VOZ
function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window)) { alert("Tu navegador no soporta búsqueda por voz."); return; }
    const recognition = new webkitSpeechRecognition(); recognition.lang = "es-ES"; const btn = document.querySelector('.voice-btn i');
    recognition.onstart = () => { if(btn) btn.parentElement.classList.add('listening'); document.getElementById('search-input').placeholder = "Escuchando..."; };
    recognition.onend = () => { if(btn) btn.parentElement.classList.remove('listening'); document.getElementById('search-input').placeholder = "Buscar..."; };
    recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; document.getElementById('search-input').value = transcript; searchProducts(transcript); };
    recognition.start();
}

// FILTROS
function searchProducts(query) {
    const term = query.toLowerCase().trim();
    if(term === "") { filterByMain('all'); return; }
    renderWithAnimation(() => {
        const results = products.filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
        renderFiltered(results);
        if(title) title.innerText = `Resultados: "${term}"`;
    });
}
function sortProducts(criteria) {
    let sorted = [...currentProducts];
    switch (criteria) { case 'price-asc': sorted.sort((a, b) => a.price - b.price); break; case 'price-desc': sorted.sort((a, b) => b.price - a.price); break; case 'alpha-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break; default: sorted.sort((a, b) => a.id - b.id); break; }
    renderFilteredOnly(sorted);
}
function filterByMain(catId) {
    renderWithAnimation(() => {
        const filtered = catId === 'all' ? products : products.filter(p => p.category === catId);
        renderFiltered(filtered);
        if(title) { if(catId === 'all') title.innerText = "Todos los Productos"; else { const c = categories.find(x => x.id === catId); title.innerText = c ? c.name : catId.toUpperCase(); } }
    });
}
function filterBySub(catId, subId) {
    renderWithAnimation(() => {
        const filtered = products.filter(p => p.category === catId && p.sub === subId);
        renderFiltered(filtered);
        if(title) title.innerText = subId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    });
}
function showFavorites() {
    renderWithAnimation(() => {
        const favs = products.filter(p => wishlist.includes(p.id));
        renderFiltered(favs);
        if(title) title.innerText = "Mis Favoritos ❤️";
        if(favs.length === 0 && grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;">No tienes favoritos guardados.</p>';
    });
    const mainNav = document.getElementById('main-nav'); if(mainNav) mainNav.classList.remove('active');
}
function setGridView() { document.getElementById('products-container').classList.remove('list-view'); document.querySelectorAll('.view-btn')[0].classList.add('active'); document.querySelectorAll('.view-btn')[1].classList.remove('active'); }
function setListView() { document.getElementById('products-container').classList.add('list-view'); document.querySelectorAll('.view-btn')[0].classList.remove('active'); document.querySelectorAll('.view-btn')[1].classList.add('active'); }

// RENDER
function renderWithAnimation(cb) { if (!grid) return; grid.style.opacity = '0'; setTimeout(() => { cb(); grid.style.opacity = '1'; }, 200); }
function renderFiltered(list) {
    if (!grid) return; currentProducts = list;
    const countLabel = document.getElementById('product-count'); if (countLabel) countLabel.innerText = list.length;
    grid.innerHTML = ''; if(list.length === 0) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;">No hay productos.</p>'; return; }
    list.forEach(p => createProductCard(p)); observeRevealElements();
}
function renderFilteredOnly(list) { if (!grid) return; grid.innerHTML = ''; list.forEach(p => createProductCard(p)); observeRevealElements(); }

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

    const mediaHTML = getMediaHTML(p.img, p.name, "", `onclick="openQuickView(${p.id})" style="cursor:pointer"`);

    const card = document.createElement('div'); card.className = 'card reveal';
    card.innerHTML = `<div class="card-img">${badgeHTML}<button class="wishlist-btn ${isFav}" onclick="toggleWishlist(${p.id}, this)"><i class="ph ${heartIcon}"></i></button><button class="quick-view-btn" onclick="openQuickView(${p.id})"><i class="ph ph-eye"></i></button>${mediaHTML}</div><div class="card-info"><div class="card-cat">${p.category}</div><div class="card-title">${p.name}</div>${ratingHTML}${priceHTML}<button class="add-btn" onclick="addToCart(${p.id}, this)"><i class="ph ph-basket"></i> Agregar</button></div>`;
    grid.appendChild(card);
}

// CART & WISHLIST
function toggleWishlist(id, btn) { const idx = wishlist.indexOf(id); const icon = btn.querySelector('i'); if (idx === -1) { wishlist.push(id); btn.classList.add('active', 'animating'); icon.classList.replace('ph-heart', 'ph-heart-fill'); showToast("Agregado a favoritos"); } else { wishlist.splice(idx, 1); btn.classList.remove('active'); icon.classList.replace('ph-heart-fill', 'ph-heart'); if(title && title.innerText.includes("Favoritos")) showFavorites(); } localStorage.setItem('wishlist', JSON.stringify(wishlist)); setTimeout(() => btn.classList.remove('animating'), 500); }
function addToCart(id, btnElement = null) { const exist = cart.find(i => i.id === id); if(exist) { exist.qty++; showToast("Cantidad actualizada (+1)"); } else { const p = products.find(x => x.id === id); cart.push({ ...p, qty: 1 }); showToast("Agregado al carrito"); } updateCartUI(); if(btnElement) { const card = btnElement.closest('.card') || document.querySelector('.qv-image-col'); const img = card.querySelector('img, video'); if(img) flyToCart(img); } toggleCart(true); }
function flyToCart(imgSource) { const cartBtn = document.querySelector('.cart-btn'); if(!cartBtn) return; const flyingImg = imgSource.cloneNode(); flyingImg.classList.add('flying-img'); const rect = imgSource.getBoundingClientRect(); flyingImg.style.left = rect.left + 'px'; flyingImg.style.top = rect.top + 'px'; flyingImg.style.width = rect.width + 'px'; flyingImg.style.height = rect.height + 'px'; document.body.appendChild(flyingImg); void flyingImg.offsetWidth; const cartRect = cartBtn.getBoundingClientRect(); flyingImg.style.left = (cartRect.left + cartRect.width / 2) + 'px'; flyingImg.style.top = (cartRect.top + cartRect.height / 2) + 'px'; flyingImg.style.width = '20px'; flyingImg.style.height = '20px'; flyingImg.style.opacity = '0'; setTimeout(() => flyingImg.remove(), 800); }
function changeQty(id, chg) { const item = cart.find(i => i.id === id); if(!item) return; item.qty += chg; if(item.qty <= 0) removeFromCart(id); else updateCartUI(); }
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); updateCartUI(); showToast("Eliminado", "error"); }
function updateCartUI() {
    const itemsEl = document.getElementById('cart-items'); const countEl = document.getElementById('cart-count'); const totalEl = document.getElementById('cart-total'); const shipBar = document.getElementById('shipping-bar'); const shipMsg = document.getElementById('shipping-msg');
    if(!itemsEl) return;
    countEl.innerText = cart.reduce((a, b) => a + b.qty, 0); let total = 0; itemsEl.innerHTML = '';
    if(cart.length === 0) itemsEl.innerHTML = '<p style="text-align:center;color:#999;">Vacío</p>';
    else {
        cart.forEach(item => {
            total += item.price * item.qty;
            const div = document.createElement('div'); div.className = 'cart-item';
            const mediaHTML = getMediaHTML(item.img, item.name);
            div.innerHTML = `<div style="display:flex;align-items:center;">${mediaHTML}<div class="item-info"><h4>${item.name}</h4><div style="color:#888;font-size:0.8rem">$${item.price.toLocaleString()} x un.</div></div></div><div class="item-controls"><button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button><span class="item-qty">${item.qty}</span><button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button><button onclick="removeFromCart(${item.id})" style="border:none;background:none;color:red;cursor:pointer"><i class="ph ph-trash"></i></button></div>`;
            itemsEl.appendChild(div);
        });
    }
    totalEl.innerText = '$' + total.toLocaleString();
    if (shipBar && shipMsg) { const percent = Math.min((total / ENVIO_GRATIS_META) * 100, 100); shipBar.style.width = percent + "%"; if (total >= ENVIO_GRATIS_META) { shipBar.style.backgroundColor = "#2ecc71"; shipMsg.innerHTML = "¡Genial! Tienes <strong>Envío Gratis</strong> 🚀"; } else { shipBar.style.backgroundColor = "var(--primary)"; shipMsg.innerHTML = `Faltan <strong>$${(ENVIO_GRATIS_META - total).toLocaleString()}</strong> para envío gratis.`; } }
}
function toggleCart(force) { const sb = document.getElementById('sidebar'); const ov = document.getElementById('overlay'); if(!sb) return; if(force) { sb.classList.add('open'); ov.classList.add('active'); } else { sb.classList.toggle('open'); ov.classList.toggle('active'); } }

// MODALES
function openQuickView(id) {
    const p = products.find(x => x.id === id); if(!p) return;
    currentOpenProductId = id; addToHistory(id);
    
    // Inyectar Video o Imagen en Modal
    const imgCol = document.querySelector('.qv-image-col');
    const isVideo = p.img && (p.img.startsWith('data:video') || p.img.endsWith('.mp4') || p.img.endsWith('.webm'));
    if (isVideo) {
        imgCol.innerHTML = `<video src="${p.img}" controls autoplay loop muted class="qv-media-element"></video>`;
    } else {
        imgCol.innerHTML = `<img src="${p.img}" id="qv-img" class="qv-media-element">`;
    }

    const catObj = categories.find(c => c.id === p.category);
    document.getElementById('qv-cat').innerText = `${catObj ? catObj.name : p.category} > ${p.sub}`;
    document.getElementById('qv-title').innerText = p.name;
    
    // PRECIO CORREGIDO
    let priceHtml = `$${p.price.toLocaleString()}`;
    if(p.oldPrice && p.oldPrice > p.price) { 
        priceHtml = `<span class="old-price">$${p.oldPrice.toLocaleString()}</span> <span class="current-price">$${p.price.toLocaleString()}</span> <span class="discount-tag">-${Math.round(((p.oldPrice - p.price)/p.oldPrice)*100)}% OFF</span>`; 
    }
    document.getElementById('qv-price-box').innerHTML = priceHtml;
    
    document.getElementById('qv-desc').innerText = p.desc || "Producto artesanal exclusivo.";
    
    const viewers = Math.floor(Math.random() * 20) + 5; 
    if(document.getElementById('qv-viewers')) document.getElementById('qv-viewers').innerText = viewers;
    
    const prodReviews = reviews[p.id] || [];
    let starsHTML = "";
    if(prodReviews.length > 0) { 
        const avg = prodReviews.reduce((a, r) => a + parseInt(r.rating), 0) / prodReviews.length; 
        starsHTML = `<span class="star-gold">${"★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg))}</span> <small>(${prodReviews.length} opiniones)</small>`; 
    } else { 
        starsHTML = "<small>Sin opiniones aún</small>"; 
    }
    document.getElementById('qv-stars-display').innerHTML = starsHTML;
    
    document.getElementById('qv-add-btn').onclick = function() { addToCart(p.id, this); closeQuickViewForce(); };
    
    const relatedContainer = document.getElementById('qv-related-container'); 
    relatedContainer.innerHTML = '';
    const related = products.filter(item => item.category === p.category && item.id !== p.id).slice(0, 2);
    if(related.length > 0) { 
        related.forEach(rel => { 
            const relDiv = document.createElement('div'); relDiv.className = 'related-card'; relDiv.onclick = () => openQuickView(rel.id); 
            const mediaThumb = getMediaHTML(rel.img, rel.name);
            relDiv.innerHTML = `${mediaThumb} <div class="related-info"><h5>${rel.name}</h5><span>$${rel.price.toLocaleString()}</span></div>`; 
            relatedContainer.appendChild(relDiv); 
        }); 
    } else { relatedContainer.innerHTML = '<p style="font-size:0.8rem; color:#999;">No hay productos similares.</p>'; }
    
    switchTab('details'); renderReviews(id); document.getElementById('qv-overlay').classList.add('active');
}

function switchTab(tab) { document.querySelectorAll('.qv-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); if(tab === 'details') { document.querySelector('.qv-tab:nth-child(1)').classList.add('active'); document.getElementById('tab-details').classList.add('active'); } else { document.querySelector('.qv-tab:nth-child(2)').classList.add('active'); document.getElementById('tab-reviews').classList.add('active'); } }
function renderReviews(id) { const list = document.getElementById('reviews-list'); const prodReviews = reviews[id] || []; document.getElementById('qv-review-count').innerText = prodReviews.length; list.innerHTML = ''; if(prodReviews.length === 0) { list.innerHTML = '<p style="color:#999; text-align:center; margin-bottom:1rem;">Sé el primero en opinar.</p>'; } else { prodReviews.forEach(r => { const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating); list.innerHTML += `<div class="review-item"><div class="review-header"><span>${r.user}</span><span class="star-gold">${stars}</span></div><div class="review-text">${r.text}</div></div>`; }); } }
function submitReview() { const name = document.getElementById('review-name').value; const text = document.getElementById('review-text').value; const ratingEl = document.querySelector('input[name="rating"]:checked'); if(!name || !text || !ratingEl) return alert("Completa todo."); const rating = parseInt(ratingEl.value); if(!reviews[currentOpenProductId]) reviews[currentOpenProductId] = []; reviews[currentOpenProductId].unshift({ user: name, rating: rating, text: text }); localStorage.setItem('reviews', JSON.stringify(reviews)); document.getElementById('review-name').value = ''; document.getElementById('review-text').value = ''; ratingEl.checked = false; renderReviews(currentOpenProductId); showToast("¡Gracias!"); if(grid) renderFiltered(currentProducts); }
function closeQuickView(e) { if(e.target.id === 'qv-overlay') closeQuickViewForce(); }
function closeQuickViewForce() { document.getElementById('qv-overlay').classList.remove('active'); }

// CHECKOUT
function openCheckoutModal() { if(cart.length === 0) { showToast("Carrito vacío", "error"); return; } toggleCart(false); discount = 0; document.getElementById('coupon-input').value = ''; document.getElementById('coupon-msg').innerText = ''; document.getElementById('modal-subtotal').style.display = 'none'; document.getElementById('modal-discount').style.display = 'none'; renderCheckoutItems(); document.getElementById('checkout-overlay').classList.add('active'); }
function renderCheckoutItems() { const body = document.getElementById('modal-body'); let html = '', subtotal = 0; cart.forEach(i => { let sub = i.price * i.qty; subtotal += sub; html += `<div class="summary-item"><span>${i.qty}x ${i.name}</span><strong>$${sub.toLocaleString()}</strong></div>`; }); body.innerHTML = html; const total = subtotal - discount; if(discount > 0) { document.getElementById('modal-subtotal').style.display = 'block'; document.getElementById('modal-subtotal').innerText = `Subtotal: $${subtotal.toLocaleString()}`; document.getElementById('modal-discount').style.display = 'block'; document.getElementById('modal-discount').innerText = `Descuento: -$${discount.toLocaleString()}`; } document.getElementById('modal-total-price').innerText = '$' + total.toLocaleString(); }
function applyCoupon() { const code = document.getElementById('coupon-input').value.toUpperCase().trim(); const msg = document.getElementById('coupon-msg'); let subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0); if (activeCoupons.hasOwnProperty(code)) { discount = subtotal * activeCoupons[code]; msg.style.color = "#2ecc71"; msg.innerText = "¡Cupón aplicado!"; renderCheckoutItems(); } else { discount = 0; msg.style.color = "#e74c3c"; msg.innerText = "Cupón inválido"; renderCheckoutItems(); } }
function closeCheckoutModal() { document.getElementById('checkout-overlay').classList.remove('active'); toggleCart(true); }
function sendToWhatsApp() { let msg = "Hola! 👋 Pedido:\n"; let subtotal = 0; cart.forEach(i => { let sub = i.price * i.qty; subtotal += sub; msg += `▪️ ${i.qty}x ${i.name} - $${sub}\n`; }); if (discount > 0) msg += `\nSubtotal: $${subtotal}\nDescuento: -$${discount}`; msg += `\n💰 *Total Final: $${subtotal - discount}*\n\nCoordino pago y entrega.`; window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank'); }

// EXTRAS
function addToHistory(id) { let history = JSON.parse(localStorage.getItem('history')) || []; history = history.filter(x => x !== id); history.unshift(id); if(history.length > 6) history.pop(); localStorage.setItem('history', JSON.stringify(history)); renderHistory(); }
function renderHistory() { const container = document.getElementById('history-container'); const section = document.getElementById('history-section'); if(!container || !section) return; const history = JSON.parse(localStorage.getItem('history')) || []; if(history.length === 0) { section.style.display = 'none'; return; } section.style.display = 'block'; container.innerHTML = ''; history.forEach(id => { const p = products.find(x => x.id === id); if(p) { const card = document.createElement('div'); card.className = 'card'; card.innerHTML = `<div class="card-img" style="height:150px;"><img src="${p.img}" onclick="openQuickView(${p.id})" style="cursor:pointer"></div><div class="card-info" style="padding:0.8rem;"><div class="card-title" style="font-size:0.9rem;">${p.name}</div><div class="card-price" style="font-size:1rem;">$${p.price.toLocaleString()}</div></div>`; container.appendChild(card); } }); }
const botKnowledge = { saludo: ["hola", "buenos", "hi"], precio: ["precio", "cuanto", "valor"], envio: ["envio", "entrega", "llevan", "haedo"], pago: ["pago", "tarjeta", "efectivo"], gracias: ["gracias", "ok", "listo"] };
function toggleChatWidget() { const chat = document.getElementById('chat-window'); chat.classList.toggle('active'); if(chat.classList.contains('active')) document.getElementById('chat-input').focus(); }
function handleChat(e) { if (e.key === 'Enter') sendMessage(); }
function sendMessage() { const input = document.getElementById('chat-input'); const msg = input.value.trim(); if (!msg) return; addMessage(msg, 'user'); input.value = ''; setTimeout(() => { addMessage(getBotResponse(msg.toLowerCase()), 'bot'); }, 600); }
function addMessage(text, sender) { const container = document.getElementById('chat-messages'); const div = document.createElement('div'); div.className = `message ${sender}`; div.innerText = text; container.appendChild(div); container.scrollTop = container.scrollHeight; }
function getBotResponse(text) { const clean = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); if (botKnowledge.saludo.some(k => clean.includes(k))) return "¡Hola! 😊 ¿En qué puedo ayudarte?"; if (botKnowledge.precio.some(k => clean.includes(k))) return "Los precios están en cada producto. Aceptamos transferencia."; if (botKnowledge.envio.some(k => clean.includes(k))) return "Envíos en Zona Oeste o retiro en Haedo."; if (botKnowledge.pago.some(k => clean.includes(k))) return "Efectivo o Transferencia Bancaria."; if (botKnowledge.gracias.some(k => clean.includes(k))) return "¡De nada! A tu disposición."; return "Soy una IA entrenada para responder sobre la tienda. 🤖"; }

// NOTIFICACIONES VENTAS - CORREGIDO
const fakeNames = [
    {name:"María", loc:"Morón"},
    {name:"Lucía", loc:"Haedo"},
    {name:"Sofía", loc:"Ramos"},
    {name:"Ana", loc:"Castelar"},
    {name:"Julieta", loc:"Palomar"},
    {name:"Andrea", loc:"Morón"}
];

function showSalesNotification() { 
    const notif = document.getElementById('sales-notification'); 
    if(!notif) return; 
    
    // Elegir persona aleatoria
    const person = fakeNames[Math.floor(Math.random() * fakeNames.length)];
    // Elegir producto REAL aleatorio
    const randomProduct = products[Math.floor(Math.random() * products.length)];

    document.getElementById('sales-name').innerText = person.name; 
    document.getElementById('sales-loc').innerText = person.loc; 
    document.getElementById('sales-product').innerText = randomProduct.name; 
    document.getElementById('sales-time').innerText = `Hace ${Math.floor(Math.random()*10)+2} min`; 
    
    // Usar imagen real del producto
    document.getElementById('sales-img').src = randomProduct.img; 
    
    notif.classList.add('active'); 
    setTimeout(() => { notif.classList.remove('active'); }, 5000); 
}

function closeSalesNotification() { document.getElementById('sales-notification').classList.remove('active'); }
setInterval(showSalesNotification, 40000); setTimeout(showSalesNotification, 10000);

function closePromo() { document.getElementById('promo-overlay').classList.remove('active'); sessionStorage.setItem('promoShown', 'true'); }
setTimeout(() => { if(!sessionStorage.getItem('promoShown') && document.getElementById('promo-overlay')) document.getElementById('promo-overlay').classList.add('active'); }, 3000);

// INIT
let currentSlide = 0; const slides = document.querySelectorAll('.slide'); const dots = document.querySelectorAll('.dot'); let slideInterval;
function initSlider() { if (slides.length > 0) startSlideTimer(); }
function showSlide(idx) { slides.forEach(s => s.classList.remove('active')); dots.forEach(d => d.classList.remove('active')); if (idx >= slides.length) currentSlide = 0; else if (idx < 0) currentSlide = slides.length - 1; else currentSlide = idx; slides[currentSlide].classList.add('active'); dots[currentSlide].classList.add('active'); }
function nextSlide() { showSlide(currentSlide + 1); }
function goToSlide(i) { showSlide(i); clearInterval(slideInterval); startSlideTimer(); }
function startSlideTimer() { slideInterval = setInterval(nextSlide, 5000); }
function observeRevealElements() { const observer = new IntersectionObserver((e) => { e.forEach(en => { if(en.isIntersecting) en.target.classList.add('active'); }); }, { threshold: 0.1 }); document.querySelectorAll('.reveal').forEach(el => observer.observe(el)); }

renderDynamicMenu(); if (grid) filterByMain('all'); initSlider(); observeRevealElements(); renderHistory();