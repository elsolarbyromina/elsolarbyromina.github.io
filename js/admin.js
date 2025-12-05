// =========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN
// =========================================
import { db, storage, auth } from './config.js'; 
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
    ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; 

// =========================================
// 2. EXPOSICIÓN DE FUNCIONES AL HTML
// =========================================
// Auth
window.login = login;
window.logout = logout;

// Gestión Básica
window.previewImage = previewImage;
window.addCategory = addCategory;
window.renameCategory = renameCategory;
window.addSubcategory = addSubcategory;
window.deleteCategory = deleteCategory;
window.deleteSub = deleteSub;
window.updateSubSelect = updateSubSelect;

// Productos y Filtros
window.editProduct = editProduct;
window.cancelEdit = cancelEdit;
window.deleteProduct = deleteProduct;
window.renderAdminProducts = renderAdminProducts; 

// HERRAMIENTAS PRO (RECUPERADAS)
window.cloneProduct = cloneProduct;     // <--- FALTABA
window.printProductQR = printProductQR; // <--- FALTABA

// Cupones
window.addCoupon = addCoupon;
window.deleteCoupon = deleteCoupon;

// Herramientas Masivas
window.resetStock = resetStock;
window.exportToCSV = exportToCSV;
window.batchPriceUpdate = batchPriceUpdate;
window.updateBatchSubcategories = updateBatchSubcategories;

// IA Copiloto
window.toggleDescMode = toggleDescMode;
window.generateAIDescription = generateAIDescription;

// NUEVO: BITÁCORA
window.renderActivityLog = renderActivityLog;

// VARIABLES GLOBALES
let categoriesCache = [];     
let adminProductsCache = [];
let adminCouponsCache = [];
let imageFileToUpload = null; 
let activityLog = JSON.parse(localStorage.getItem('admin_activity_log')) || [];

// =========================================
// 3. SISTEMA DE LOGIN SEGURO
// =========================================
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('login-overlay');
    const content = document.getElementById('admin-content');

    if (user) {
        overlay.style.display = 'none';
        content.style.display = 'block';
        console.log("Usuario autenticado:", user.email);
        initAdmin(); 
    } else {
        overlay.style.display = 'flex';
        content.style.display = 'none';
    }
});

async function login() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        console.error(error);
        if(error.code === 'auth/invalid-credential') {
            alert("Email o contraseña incorrectos.");
        } else {
            alert("Error al entrar: " + error.message);
        }
    }
}

async function logout() {
    try {
        await signOut(auth);
        alert("Sesión cerrada.");
        location.reload();
    } catch (e) {
        alert("Error al salir.");
    }
}

function initAdmin() {
    // Carga en paralelo para velocidad
    Promise.all([loadCategories(), loadProducts(), loadCoupons()]).then(() => {
        updateDashboard();
        populateBatchSelect(); 
        renderActivityLog(); // <--- CARGAR BITÁCORA
    });
}

function updateDashboard() {
    if(document.getElementById('stat-products')) document.getElementById('stat-products').innerText = adminProductsCache.length;
    
    if(document.getElementById('stat-value')) {
        const totalValue = adminProductsCache.reduce((acc, p) => acc + Number(p.price), 0);
        document.getElementById('stat-value').innerText = `$${totalValue.toLocaleString()}`;
    }
    
    if(document.getElementById('stat-cats')) document.getElementById('stat-cats').innerText = categoriesCache.length;
    if(document.getElementById('stat-coupons')) document.getElementById('stat-coupons').innerText = adminCouponsCache.length;
}

// --- FUNCIÓN: REGISTRAR ACTIVIDAD (NUEVO) ---
function addToLog(msg, type='info') {
    const timestamp = new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
    const newEntry = { time: timestamp, text: msg, type: type };
    activityLog.unshift(newEntry);
    if(activityLog.length > 20) activityLog.pop(); // Guardar los últimos 20
    localStorage.setItem('admin_activity_log', JSON.stringify(activityLog));
    renderActivityLog();
}

function renderActivityLog() {
    const container = document.getElementById('activity-log-list');
    // Si el usuario no agregó el HTML de la bitácora, no hacemos nada para no romper
    if(!container) return; 
    
    container.innerHTML = '';
    if(activityLog.length === 0) {
        container.innerHTML = '<p style="color:#999; font-size:0.85rem;">No hay actividad reciente.</p>';
        return;
    }
    activityLog.forEach(log => {
        let color = '#2d3436';
        if(log.type === 'success') color = '#2ecc71';
        if(log.type === 'danger') color = '#e74c3c';
        if(log.type === 'warning') color = '#f1c40f';
        container.innerHTML += `<div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #eee; font-size:0.85rem;"><span style="background:#eee; color:#666; padding:2px 6px; border-radius:4px; font-size:0.75rem;">${log.time}</span><span style="color:${color}; font-weight:500;">${log.text}</span></div>`;
    });
}

// =========================================
// 4. GESTIÓN DE IMÁGENES
// =========================================
function previewImage(input) {
    const file = input.files[0];
    if (file) {
        imageFileToUpload = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('preview-img');
            img.src = e.target.result;
            img.style.display = 'block';
            document.querySelector('.upload-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// =========================================
// 5. GESTIÓN DE CATEGORÍAS
// =========================================
async function loadCategories() {
    const listDiv = document.getElementById('categories-list');
    const selectTarget = document.getElementById('target-cat-select'); 
    const productCatSelect = document.getElementById('p-cat'); 
    
    listDiv.innerHTML = '<p style="text-align:center; color:#888;">Cargando categorías...</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        
        listDiv.innerHTML = '';
        selectTarget.innerHTML = '';
        productCatSelect.innerHTML = '<option value="">Seleccionar...</option>';
        categoriesCache = [];

        querySnapshot.forEach((docSnap) => {
            const cat = { id: docSnap.id, ...docSnap.data() };
            categoriesCache.push(cat);

            const option = `<option value="${cat.id}">${cat.name}</option>`;
            selectTarget.innerHTML += option;
            productCatSelect.innerHTML += option;

            let subsHTML = cat.subs ? cat.subs.map(s => `<span class="sub-badge">${s} <span onclick="deleteSub('${cat.id}', '${s}')" style="cursor:pointer;margin-left:5px;">&times;</span></span>`).join(' ') : '<small>Sin subcategorías</small>';

            const div = document.createElement('div');
            div.className = 'cat-item';
            div.innerHTML = `
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <strong>${cat.name}</strong>
                        <button onclick="renameCategory('${cat.id}', '${cat.name}')" style="border:none; background:none; cursor:pointer; color:#74b9ff;" title="Renombrar"><i class="ph ph-pencil-simple"></i></button>
                    </div>
                    <div style="margin-top:5px;">${subsHTML}</div>
                </div>
                <button onclick="deleteCategory('${cat.id}')" style="color:red;border:none;background:none;cursor:pointer;font-size:1.2rem;" title="Borrar Categoría"><i class="ph ph-trash"></i></button>
            `;
            listDiv.appendChild(div);
        });

        updateSubSelect();
        populateBatchSelect(); 
        updateDashboard();

    } catch (e) {
        console.error("Error cargando categorías: ", e);
    }
}

function populateBatchSelect() {
    const select = document.getElementById('batch-category');
    if(!select) return;
    select.innerHTML = '<option value="all">📦 Todo el Inventario</option>';
    categoriesCache.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

function updateBatchSubcategories() {
    const catId = document.getElementById('batch-category').value;
    const subSelect = document.getElementById('batch-subcategory');
    subSelect.innerHTML = '<option value="all">Todas</option>';
    
    if (catId === 'all') {
        subSelect.disabled = true;
        subSelect.style.background = "#f5f5f5";
        return;
    }

    const cat = categoriesCache.find(c => c.id === catId);
    if (cat && cat.subs && cat.subs.length > 0) {
        subSelect.disabled = false;
        subSelect.style.background = "white";
        cat.subs.forEach(sub => {
            subSelect.innerHTML += `<option value="${sub}">${sub.charAt(0).toUpperCase() + sub.slice(1)}</option>`;
        });
    } else {
        subSelect.disabled = true;
        subSelect.style.background = "#f5f5f5";
    }
}

async function addCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return alert("Escribe un nombre.");
    try { 
        await addDoc(collection(db, "categories"), { name: name, subs: [] }); 
        document.getElementById('new-cat-name').value = ''; 
        loadCategories(); 
        addToLog(`Categoría creada: ${name}`, 'success'); // LOG
    } catch (e) { alert("Error: " + e.message); }
}

async function renameCategory(id, oldName) {
    const newName = prompt("Nuevo nombre para la categoría:", oldName);
    if (newName && newName.trim() !== "") {
        try { await updateDoc(doc(db, "categories", id), { name: newName.trim() }); loadCategories(); addToLog(`Categoría renombrada: ${newName}`); } catch (e) { alert("Error: " + e.message); }
    }
}

async function addSubcategory() {
    const catId = document.getElementById('target-cat-select').value;
    const subName = document.getElementById('new-sub-name').value.trim().toLowerCase().replace(/ /g, '-'); 
    if (!subName || !catId) return alert("Completa los datos.");
    const cat = categoriesCache.find(c => c.id === catId);
    if(cat) {
        const newSubs = cat.subs ? [...cat.subs, subName] : [subName];
        try { await updateDoc(doc(db, "categories", catId), { subs: newSubs }); document.getElementById('new-sub-name').value = ''; loadCategories(); addToLog(`Subcategoría agregada: ${subName}`); } catch (e) { alert("Error."); }
    }
}

async function deleteCategory(id) {
    if(!confirm("¿Estás seguro? Se borrará la categoría.")) return;
    try { await deleteDoc(doc(db, "categories", id)); loadCategories(); addToLog(`Categoría eliminada`, 'danger'); } catch (e) { alert("Error: " + e.message); }
}

async function deleteSub(catId, subName) {
    if(!confirm(`¿Borrar '${subName}'?`)) return;
    const cat = categoriesCache.find(c => c.id === catId);
    if(cat) {
        const newSubs = cat.subs.filter(s => s !== subName);
        try { await updateDoc(doc(db, "categories", catId), { subs: newSubs }); loadCategories(); addToLog(`Subcategoría borrada: ${subName}`, 'danger'); } catch (e) { alert("Error."); }
    }
}

function updateSubSelect() {
    const catId = document.getElementById('p-cat').value;
    const subSelect = document.getElementById('p-sub');
    subSelect.innerHTML = ''; 
    const cat = categoriesCache.find(c => c.id === catId);
    if (cat && cat.subs && cat.subs.length > 0) {
        cat.subs.forEach(sub => {
            const displayName = sub.charAt(0).toUpperCase() + sub.slice(1);
            subSelect.innerHTML += `<option value="${sub}">${displayName}</option>`;
        });
    } else { subSelect.innerHTML = '<option value="">Sin subcategorías</option>'; }
}

// =========================================
// 6. GESTIÓN DE PRODUCTOS
// =========================================
async function loadProducts() {
    const grid = document.getElementById('admin-products-grid');
    grid.innerHTML = '<p style="color:#888;">Cargando productos...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach((doc) => { products.push({ firebaseId: doc.id, ...doc.data() }); });
        
        adminProductsCache = products;
        renderAdminProducts(); 
        updateDashboard();
    } catch (e) { grid.innerHTML = '<p style="color:red;">Error cargando productos.</p>'; }
}

function renderAdminProducts() {
    const grid = document.getElementById('admin-products-grid');
    const sortEl = document.getElementById('sort-admin');
    const searchEl = document.getElementById('search-admin');
    
    if(!grid) return;
    grid.innerHTML = '';

    const sortCriteria = sortEl ? sortEl.value : 'newest';
    const searchTerm = searchEl ? searchEl.value.toLowerCase().trim() : '';

    let filtered = adminProductsCache.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        (p.category && p.category.toLowerCase().includes(searchTerm))
    );

    if(document.getElementById('total-products')) document.getElementById('total-products').innerText = filtered.length;

    switch(sortCriteria) {
        case 'alpha': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
        case 'category': filtered.sort((a, b) => a.category.localeCompare(b.category)); break;
        case 'subcategory': filtered.sort((a, b) => (a.sub || '').localeCompare(b.sub || '')); break;
        case 'newest': default: filtered.sort((a, b) => b.id - a.id); break;
    }

    filtered.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'product-mini';
        div.innerHTML = `
            <div class="actions">
                <button class="action-btn" onclick="printProductQR('${p.firebaseId}')" title="QR" style="background:#6c5ce7; color:white;">🖨️</button>
                <button class="action-btn" onclick="cloneProduct('${p.firebaseId}')" title="Clonar" style="background:#fdcb6e; color:white;">🐑</button>
                <button class="action-btn btn-edit" onclick="editProduct('${p.firebaseId}')" title="Editar">✏️</button>
                <button class="action-btn btn-del" onclick="deleteProduct('${p.firebaseId}')" title="Borrar">🗑</button>
            </div>
            <img src="${p.img}" onerror="this.src='https://placehold.co/100'">
            <h4>${p.name}</h4>
            <p>$${Number(p.price).toLocaleString()}</p>
            <small style="color:#666;">${p.category} ${p.sub ? '> ' + p.sub : ''}</small>
        `;
        grid.appendChild(div);
    });
}

// --- CLONAR PRODUCTO (RECUPERADO) ---
function cloneProduct(id) {
    const p = adminProductsCache.find(x => x.firebaseId === id);
    if(!p) return;
    document.getElementById('p-name').value = p.name + " (Copia)";
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-desc').value = p.desc;
    document.getElementById('p-badge').value = p.badge;
    
    const promoCheck = document.getElementById('p-promo-cash');
    if(promoCheck) promoCheck.checked = p.promoCash || false;

    document.getElementById('p-img-base64').value = p.img;
    document.getElementById('preview-img').src = p.img;
    document.getElementById('preview-img').style.display = 'block';
    document.querySelector('.upload-placeholder').style.display = 'none';
    document.getElementById('p-cat').value = p.category;
    updateSubSelect(); 
    document.getElementById('p-sub').value = p.sub;
    document.getElementById('edit-id').value = ""; 
    imageFileToUpload = null; 
    document.getElementById('form-title').innerText = "🐑 Clonando Producto";
    document.getElementById('save-btn').innerText = "Guardar Copia";
    document.getElementById('cancel-btn').style.display = "inline-block";
    document.getElementById('product-form-card').classList.add('editing-mode');
    document.getElementById('product-form-card').scrollIntoView({ behavior: 'smooth' });
    
    addToLog(`Inició clonación de: ${p.name}`);
    alert("Datos clonados. Edita y guarda.");
}

// --- ETIQUETA QR (RECUPERADO) ---
function printProductQR(firebaseId) {
    const p = adminProductsCache.find(prod => prod.firebaseId === firebaseId);
    if(!p) return;
    const productUrl = `${window.location.origin}${window.location.pathname.replace('admin.html', 'index.html')}?product=${p.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(productUrl)}`;
    const win = window.open('', '', 'width=400,height=600');
    win.document.write(`<html><head><title>${p.name}</title><style>body{font-family:sans-serif;text-align:center;padding:20px;border:2px dashed #333;margin:10px;border-radius:10px}h1{font-size:24px}h2{font-size:32px;color:#6c5ce7}img{width:250px}p{font-size:12px;color:#666}.btn{display:block;width:100%;padding:10px;background:#333;color:white;text-decoration:none;border-radius:5px;margin-top:20px;cursor:pointer}@media print{.btn{display:none}body{border:none}}</style></head><body><p>EL SOLAR BY ROMINA</p><h1>${p.name}</h1><h2>$${Number(p.price).toLocaleString()}</h2><img src="${qrUrl}" alt="QR"><p>Escanea para ver más</p><div class="btn" onclick="window.print()">🖨️ IMPRIMIR</div></body></html>`);
    win.document.close();
}

function editProduct(firebaseId) {
    const p = adminProductsCache.find(prod => prod.firebaseId === firebaseId);
    if (p) {
        document.getElementById('edit-id').value = firebaseId;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-desc').value = p.desc || "";
        document.getElementById('p-badge').value = p.badge || "";
        document.getElementById('p-img-base64').value = p.img;
        
        const promoCheck = document.getElementById('p-promo-cash');
        if(promoCheck) promoCheck.checked = p.promoCash || false;

        imageFileToUpload = null; 
        const preview = document.getElementById('preview-img');
        preview.src = p.img;
        preview.style.display = 'block';
        document.querySelector('.upload-placeholder').style.display = 'none';

        document.getElementById('p-cat').value = p.category;
        updateSubSelect(); 
        document.getElementById('p-sub').value = p.sub;

        document.getElementById('form-title').innerText = "✏️ Editando Producto";
        document.getElementById('save-btn').innerText = "Actualizar";
        document.getElementById('cancel-btn').style.display = "inline-block";
        document.getElementById('product-form-card').classList.add('editing-mode');
        document.getElementById('product-form-card').scrollIntoView({ behavior: 'smooth' });
    }
}

function cancelEdit() {
    document.getElementById('add-product-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('p-img-base64').value = ""; 
    
    const promoCheck = document.getElementById('p-promo-cash');
    if(promoCheck) promoCheck.checked = false;

    imageFileToUpload = null; 
    document.getElementById('preview-img').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('form-title').innerText = "➕ Agregar Producto";
    document.getElementById('save-btn').innerText = "Guardar en Nube";
    document.getElementById('cancel-btn').style.display = "none";
    document.getElementById('product-form-card').classList.remove('editing-mode');
}

document.getElementById('add-product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    const editId = document.getElementById('edit-id').value;
    const currentImgUrl = document.getElementById('p-img-base64').value; 

    if (!imageFileToUpload && !currentImgUrl) return alert("Por favor selecciona una imagen.");

    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        let finalImageUrl = currentImgUrl;
        if (imageFileToUpload) {
            const fileName = `products/${Date.now()}_${imageFileToUpload.name}`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, imageFileToUpload);
            finalImageUrl = await getDownloadURL(storageRef);
        }

        const promoCheck = document.getElementById('p-promo-cash');
        
        const productData = {
            id: editId ? undefined : Date.now(), 
            name: document.getElementById('p-name').value,
            price: Number(document.getElementById('p-price').value),
            category: document.getElementById('p-cat').value,
            sub: document.getElementById('p-sub').value,
            img: finalImageUrl, 
            desc: document.getElementById('p-desc').value,
            badge: document.getElementById('p-badge').value || null,
            promoCash: promoCheck ? promoCheck.checked : false
        };

        if(editId) delete productData.id;

        if (editId) {
            await updateDoc(doc(db, "products", editId), productData);
            alert("Producto actualizado correctamente.");
            addToLog(`Producto editado: ${productData.name}`, 'success');
        } else {
            await addDoc(collection(db, "products"), productData);
            alert("Producto creado correctamente.");
            addToLog(`Producto creado: ${productData.name}`, 'success');
        }
        
        cancelEdit();
        loadProducts(); 

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        btn.innerText = editId ? "Actualizar" : "Guardar en Nube";
        btn.disabled = false;
    }
});

async function deleteProduct(firebaseId) {
    if(!confirm("¿Seguro que quieres borrar este producto permanentemente?")) return;
    try { 
        await deleteDoc(doc(db, "products", firebaseId)); 
        loadProducts(); 
        addToLog('Producto eliminado', 'danger');
    } catch (e) { alert("Error."); }
}

// =========================================
// 7. GESTIÓN DE CUPONES
// =========================================
async function loadCoupons() {
    const container = document.getElementById('coupons-list');
    container.innerHTML = 'Cargando...';
    try {
        const snapshot = await getDocs(collection(db, "coupons"));
        container.innerHTML = '';
        adminCouponsCache = [];
        
        if(snapshot.empty) {
            container.innerHTML = '<small>No hay cupones activos.</small>';
            return;
        }
        snapshot.forEach(doc => {
            const c = doc.data();
            adminCouponsCache.push(c);
            const div = document.createElement('div');
            div.style.cssText = "background:var(--input-bg); padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between; border:1px solid var(--border-color); align-items:center;";
            div.innerHTML = `
                <span><b>${c.code}</b> (${c.discount * 100}% OFF)</span>
                <button onclick="deleteCoupon('${doc.id}')" style="color:red;border:none;background:none;cursor:pointer;font-size:1.2rem;">&times;</button>
            `;
            container.appendChild(div);
        });
        updateDashboard();
    } catch (e) { console.error(e); }
}

async function addCoupon() {
    const code = document.getElementById('c-code').value.toUpperCase().trim();
    const val = parseFloat(document.getElementById('c-value').value);
    if (!code || !val) return alert("Datos incorrectos.");
    try { 
        await addDoc(collection(db, "coupons"), { code: code, discount: val }); 
        loadCoupons(); 
        document.getElementById('c-code').value = ''; 
        document.getElementById('c-value').value = ''; 
        addToLog(`Cupón creado: ${code}`, 'success');
    } catch (e) { alert("Error."); }
}

async function deleteCoupon(docId) {
    if(confirm("¿Borrar cupón?")) { await deleteDoc(doc(db, "coupons", docId)); loadCoupons(); addToLog('Cupón eliminado', 'danger'); }
}

// =========================================
// 8. HERRAMIENTAS PRO
// =========================================
async function batchPriceUpdate(type) {
    const categoryFilter = document.getElementById('batch-category').value;
    const subFilter = document.getElementById('batch-subcategory').value; 
    const percentVal = document.getElementById('batch-percent').value;
    
    if (!percentVal) return alert("Ingresa un porcentaje.");
    const percent = parseFloat(percentVal);
    if (isNaN(percent) || percent <= 0) return alert("Porcentaje inválido.");

    let productsToUpdate = adminProductsCache;
    if (categoryFilter !== 'all') {
        productsToUpdate = productsToUpdate.filter(p => p.category === categoryFilter);
        if (subFilter && subFilter !== 'all') {
            productsToUpdate = productsToUpdate.filter(p => p.sub === subFilter);
        }
    }

    if (productsToUpdate.length === 0) return alert("No hay productos con ese filtro.");

    const actionText = type === 'increase' ? 'AUMENTAR' : 'DESCONTAR';
    if (!confirm(`⚠️ ¿Estás seguro?\n\nVas a ${actionText} un ${percent}% a ${productsToUpdate.length} productos.`)) return;

    let count = 0;
    try {
        for (const p of productsToUpdate) {
            let newPrice = p.price;
            if (type === 'increase') newPrice = p.price * (1 + percent / 100);
            else newPrice = p.price * (1 - percent / 100);
            newPrice = Math.round(newPrice);
            await updateDoc(doc(db, "products", p.firebaseId), { price: newPrice });
            count++;
        }
        alert(`✅ Éxito: Se actualizaron ${count} productos.`);
        loadProducts(); 
        addToLog(`Ajuste masivo: ${count} items`, 'warning');
    } catch (error) { console.error(error); alert("Hubo un error."); }
}

function resetStock() {
    if(confirm("⚠️ ¡PELIGRO! ¿Borrar TODO?")) alert("Función desactivada por seguridad.");
}

function exportToCSV() {
    if (!adminProductsCache.length) return alert("No hay productos.");
    let csv = "ID,NOMBRE,CATEGORIA,SUBCATEGORIA,PRECIO,ETIQUETA,PROMO_EFECTIVO\n";
    adminProductsCache.forEach(p => {
        const cleanName = p.name.replace(/,/g, " "); 
        const cleanCat = p.category.replace(/,/g, " ");
        const cleanSub = p.sub ? p.sub.replace(/,/g, " ") : "";
        const badge = p.badge || "Normal";
        csv += `${p.id},${cleanName},${cleanCat},${cleanSub},${p.price},${badge},${p.promoCash ? 'SI' : 'NO'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_${Date.now()}.csv`;
    link.click();
    addToLog('Exportación a Excel generada');
}

// =========================================
// 9. IA COPILOTO (VERSIÓN COMPLETA)
// =========================================
function toggleDescMode(mode) {
    const btnGen = document.getElementById('btn-generate-ai');
    const txtArea = document.getElementById('p-desc');
    const btnManual = document.getElementById('btn-mode-manual');
    const btnAi = document.getElementById('btn-mode-ai');

    if (mode === 'manual') {
        btnManual.style.background = "#e0e0e0";
        btnManual.style.fontWeight = "bold";
        btnAi.style.background = "white";
        btnAi.style.fontWeight = "normal";
        btnGen.style.display = "none";
        txtArea.placeholder = "Escribe los detalles aquí...";
        txtArea.readOnly = false;
    } else {
        btnManual.style.background = "white";
        btnManual.style.fontWeight = "normal";
        btnAi.style.background = "linear-gradient(45deg, #10a37f, #2563eb)"; 
        btnAi.style.color = "white";
        btnAi.style.fontWeight = "bold";
        btnGen.style.display = "flex";
        btnGen.innerHTML = '<i class="ph ph-robot"></i> Copiar Prompt y Abrir IA';
        txtArea.placeholder = "1. Toca el botón de arriba.\n2. Pega en tu IA favorita (Ctrl+V).\n3. Copia el resultado y pégalo aquí.";
    }
}

function generateAIDescription() {
    const name = document.getElementById('p-name').value.trim();
    const catSelect = document.getElementById('p-cat');
    
    if (catSelect.selectedIndex === -1 || !name) return alert("⚠️ Primero escribe el Nombre y elige la Categoría.");
    
    const categoryName = catSelect.options[catSelect.selectedIndex].text;
    const sub = document.getElementById('p-sub').value;
    const price = document.getElementById('p-price').value;

    const prompt = `Actúa como un experto copywriter de e-commerce especializado en productos artesanales y decoración.
    
Necesito una descripción de producto atractiva, emocional y persuasiva para la venta.
    
Datos del producto:
- Nombre: ${name}
- Categoría: ${categoryName}
- Subcategoría: ${sub || 'General'}
- Precio: $${price}
    
Requisitos:
1. Usa un tono cálido, cercano y profesional.
2. Destaca que es un producto único o artesanal.
3. Menciona posibles usos (regalo, decoración, uso diario).
4. Incluye emojis sutiles.
5. La longitud debe ser de máximo 3 o 4 líneas.
6. NO pongas comillas al principio ni al final.`;

    navigator.clipboard.writeText(prompt).then(() => {
        if(confirm("✅ ¡Prompt Copiado!\n\n¿Quieres abrir ChatGPT para pegarlo ahora? \n(Cancelar para abrir Gemini o quedarte aquí)")) {
            window.open('https://chatgpt.com', '_blank');
        } else {
            if(confirm("¿Prefieres abrir Google Gemini?")) {
                window.open('https://gemini.google.com', '_blank');
            }
        }
    }).catch(err => {
        alert("Hubo un error al copiar. Hazlo manual.");
    });
}