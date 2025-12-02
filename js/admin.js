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
// 2. EXPOSICIÓN DE FUNCIONES
// =========================================
window.login = login;
window.logout = logout;
window.previewImage = previewImage;
window.addCategory = addCategory;
window.renameCategory = renameCategory;
window.addSubcategory = addSubcategory;
window.deleteCategory = deleteCategory;
window.deleteSub = deleteSub;
window.updateSubSelect = updateSubSelect;
window.editProduct = editProduct;
window.cancelEdit = cancelEdit;
window.deleteProduct = deleteProduct;
window.addCoupon = addCoupon;
window.deleteCoupon = deleteCoupon;
window.resetStock = resetStock;
window.exportToCSV = exportToCSV;
window.toggleDescMode = toggleDescMode;
window.generateAIDescription = generateAIDescription;

let categoriesCache = [];     
let adminProductsCache = [];
let imageFileToUpload = null; 

// =========================================
// 3. LOGIN SEGURO
// =========================================
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('login-overlay');
    const content = document.getElementById('admin-content');
    if (user) {
        overlay.style.display = 'none';
        content.style.display = 'block';
        console.log("Usuario:", user.email);
        initAdmin(); 
    } else {
        overlay.style.display = 'flex';
        content.style.display = 'none';
    }
});

async function login() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch (error) { alert("Error: " + error.message); }
}

async function logout() {
    try { await signOut(auth); location.reload(); } catch (e) { alert("Error al salir."); }
}

function initAdmin() { loadCategories(); loadProducts(); loadCoupons(); }

// =========================================
// 4. IMÁGENES
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
// 5. CATEGORÍAS
// =========================================
async function loadCategories() {
    const listDiv = document.getElementById('categories-list');
    const selectTarget = document.getElementById('target-cat-select'); 
    const productCatSelect = document.getElementById('p-cat'); 
    listDiv.innerHTML = '<p style="color:#888;">Cargando...</p>';
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
            div.innerHTML = `<div><strong>${cat.name}</strong> <button onclick="renameCategory('${cat.id}', '${cat.name}')" style="border:none;background:none;color:#74b9ff;cursor:pointer;">✏️</button><div style="margin-top:5px;">${subsHTML}</div></div><button onclick="deleteCategory('${cat.id}')" style="color:red;border:none;background:none;cursor:pointer;font-size:1.2rem;">🗑</button>`;
            listDiv.appendChild(div);
        });
        updateSubSelect();
    } catch (e) { console.error(e); }
}

async function addCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return alert("Escribe un nombre.");
    try { await addDoc(collection(db, "categories"), { name: name, subs: [] }); document.getElementById('new-cat-name').value = ''; loadCategories(); } catch (e) { alert("Error: " + e.message); }
}

async function renameCategory(id, oldName) {
    const newName = prompt("Nuevo nombre:", oldName);
    if (newName && newName.trim() !== "") {
        try { await updateDoc(doc(db, "categories", id), { name: newName.trim() }); loadCategories(); } catch (e) { alert("Error: " + e.message); }
    }
}

async function addSubcategory() {
    const catId = document.getElementById('target-cat-select').value;
    const subName = document.getElementById('new-sub-name').value.trim().toLowerCase().replace(/ /g, '-'); 
    if (!subName || !catId) return alert("Completa los datos.");
    const cat = categoriesCache.find(c => c.id === catId);
    if(cat) {
        const newSubs = cat.subs ? [...cat.subs, subName] : [subName];
        try { await updateDoc(doc(db, "categories", catId), { subs: newSubs }); document.getElementById('new-sub-name').value = ''; loadCategories(); } catch (e) { alert("Error."); }
    }
}

async function deleteCategory(id) {
    if(!confirm("¿Borrar categoría?")) return;
    try { await deleteDoc(doc(db, "categories", id)); loadCategories(); } catch (e) { alert("Error: " + e.message); }
}

async function deleteSub(catId, subName) {
    if(!confirm(`¿Borrar '${subName}'?`)) return;
    const cat = categoriesCache.find(c => c.id === catId);
    if(cat) {
        const newSubs = cat.subs.filter(s => s !== subName);
        try { await updateDoc(doc(db, "categories", catId), { subs: newSubs }); loadCategories(); } catch (e) { alert("Error."); }
    }
}

function updateSubSelect() {
    const catId = document.getElementById('p-cat').value;
    const subSelect = document.getElementById('p-sub');
    subSelect.innerHTML = ''; 
    const cat = categoriesCache.find(c => c.id === catId);
    if (cat && cat.subs) {
        cat.subs.forEach(sub => { subSelect.innerHTML += `<option value="${sub}">${sub.charAt(0).toUpperCase() + sub.slice(1)}</option>`; });
    } else { subSelect.innerHTML = '<option value="">Sin subcategorías</option>'; }
}

// =========================================
// 6. PRODUCTOS
// =========================================
async function loadProducts() {
    const grid = document.getElementById('admin-products-grid');
    grid.innerHTML = '<p>Cargando...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach((doc) => { products.push({ firebaseId: doc.id, ...doc.data() }); });
        document.getElementById('total-products').innerText = products.length;
        grid.innerHTML = '';
        products.sort((a, b) => b.id - a.id);
        products.forEach((p) => {
            const div = document.createElement('div');
            div.className = 'product-mini';
            div.innerHTML = `<div class="actions"><button class="action-btn btn-edit" onclick="editProduct('${p.firebaseId}')">✏️</button><button class="action-btn btn-del" onclick="deleteProduct('${p.firebaseId}')">🗑</button></div><img src="${p.img}" onerror="this.src='https://placehold.co/100'"><h4>${p.name}</h4><p>$${Number(p.price).toLocaleString()}</p><small>${p.category}</small>`;
            grid.appendChild(div);
        });
        adminProductsCache = products;
    } catch (e) { grid.innerHTML = '<p>Error.</p>'; }
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
        
        // NUEVO: CARGAR EL CHECKBOX DE DESCUENTO
        document.getElementById('p-promo-cash').checked = p.promoCash || false;

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
    document.getElementById('p-promo-cash').checked = false; // Reset checkbox
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

    if (!imageFileToUpload && !currentImgUrl) return alert("Falta la imagen.");

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

        const productData = {
            id: editId ? undefined : Date.now(), 
            name: document.getElementById('p-name').value,
            price: Number(document.getElementById('p-price').value),
            category: document.getElementById('p-cat').value,
            sub: document.getElementById('p-sub').value,
            img: finalImageUrl, 
            desc: document.getElementById('p-desc').value,
            badge: document.getElementById('p-badge').value || null,
            // NUEVO: GUARDAR ESTADO DEL CHECKBOX
            promoCash: document.getElementById('p-promo-cash').checked 
        };

        if(editId) delete productData.id;

        if (editId) {
            await updateDoc(doc(db, "products", editId), productData);
            alert("Actualizado!");
        } else {
            await addDoc(collection(db, "products"), productData);
            alert("Creado!");
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
    if(!confirm("¿Borrar?")) return;
    try { await deleteDoc(doc(db, "products", firebaseId)); loadProducts(); } catch (e) { alert("Error."); }
}

// =========================================
// 7. CUPONES & UTILS
// =========================================
async function loadCoupons() {
    const container = document.getElementById('coupons-list');
    container.innerHTML = '...';
    try {
        const snapshot = await getDocs(collection(db, "coupons"));
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const c = doc.data();
            container.innerHTML += `<div style="background:#eee;padding:5px;margin:5px;display:flex;justify-content:space-between;"><span>${c.code} (${c.discount * 100}%)</span><button onclick="deleteCoupon('${doc.id}')" style="color:red;border:none;">&times;</button></div>`;
        });
    } catch (e) { console.error(e); }
}

async function addCoupon() {
    const code = document.getElementById('c-code').value.toUpperCase().trim();
    const val = parseFloat(document.getElementById('c-value').value);
    if (!code || !val) return;
    try { await addDoc(collection(db, "coupons"), { code: code, discount: val }); loadCoupons(); } catch (e) { alert("Error."); }
}

async function deleteCoupon(docId) {
    if(confirm("¿Borrar?")) { await deleteDoc(doc(db, "coupons", docId)); loadCoupons(); }
}

function resetStock() {
    if(confirm("⚠️ ¿Borrar TODO?")) alert("Función desactivada por seguridad.");
}

function exportToCSV() {
    if (!adminProductsCache.length) return alert("Nada para exportar.");
    let csv = "ID,NOMBRE,CATEGORIA,PRECIO,PROMO_EFECTIVO\n";
    adminProductsCache.forEach(p => {
        csv += `${p.id},${p.name},${p.category},${p.price},${p.promoCash ? 'SI' : 'NO'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_${Date.now()}.csv`;
    link.click();
}

// =========================================
// 8. IA
// =========================================
function toggleDescMode(mode) {
    const btnGen = document.getElementById('btn-generate-ai');
    const txtArea = document.getElementById('p-desc');
    if (mode === 'manual') {
        btnGen.style.display = "none";
        txtArea.placeholder = "Escribe aquí...";
    } else {
        btnGen.style.display = "flex";
        btnGen.innerHTML = '<i class="ph ph-robot"></i> Copiar Prompt y Abrir IA';
        txtArea.placeholder = "1. Toca el botón.\n2. Pega en tu IA.\n3. Copia el resultado aquí.";
    }
}

function generateAIDescription() {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const cat = document.getElementById('p-cat').options[document.getElementById('p-cat').selectedIndex]?.text;
    
    if(!name || !cat) return alert("Completa nombre y categoría.");

    const prompt = `Actúa como copywriter experto. Crea una descripción corta, emocional y vendedora para este producto artesanal:
- Producto: ${name}
- Categoría: ${cat}
- Precio: $${price}
    
Usa emojis sutiles. No uses comillas.`;

    navigator.clipboard.writeText(prompt).then(() => {
        if(confirm("✅ Prompt copiado.\n\n¿Abrir ChatGPT ahora?")) window.open('https://chatgpt.com', '_blank');
        else if(confirm("¿Abrir Gemini?")) window.open('https://gemini.google.com', '_blank');
    });
}