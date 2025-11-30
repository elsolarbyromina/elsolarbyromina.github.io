// js/admin.js
import { db } from './config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Hacer funciones globales para que el HTML las vea (necesario al usar módulos)
window.checkLogin = checkLogin;
window.addCategory = addCategory;
window.addSubcategory = addSubcategory;
window.deleteCategory = deleteCategory;
window.deleteSub = deleteSub;
window.updateSubSelect = updateSubSelect;
window.previewImage = previewImage;
window.cancelEdit = cancelEdit;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.addCoupon = addCoupon;
window.deleteCoupon = deleteCoupon;

// VARIABLES DE ESTADO
let categoriesCache = [];

// 1. SEGURIDAD
function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "1234") {
        document.getElementById('login-overlay').style.display = 'none';
        initAdmin();
    } else {
        alert("Incorrecto");
    }
}

function initAdmin() {
    loadCategories();
    loadProducts();
    loadCoupons();
}

// 2. GESTIÓN DE IMÁGENES
function previewImage(input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 800000) return alert("⚠️ La imagen es muy pesada (Máx 800KB). Firestore tiene límite de 1MB por documento.");
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('preview-img').style.display = 'block';
            document.getElementById('p-img-base64').value = e.target.result;
            document.querySelector('.upload-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// 3. GESTIÓN DE CATEGORÍAS (FIRESTORE)
async function loadCategories() {
    const listDiv = document.getElementById('categories-list');
    const selectTarget = document.getElementById('target-cat-select');
    const productCatSelect = document.getElementById('p-cat');
    
    listDiv.innerHTML = 'Cargando...';
    selectTarget.innerHTML = '';
    productCatSelect.innerHTML = '<option value="">Seleccionar...</option>';

    try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        listDiv.innerHTML = '';
        categoriesCache = [];

        querySnapshot.forEach((docSnap) => {
            const cat = { id: docSnap.id, ...docSnap.data() };
            categoriesCache.push(cat);

            // Llenar selects
            const option = `<option value="${cat.id}">${cat.name}</option>`;
            selectTarget.innerHTML += option;
            productCatSelect.innerHTML += option;

            // Llenar lista visual
            let subsHTML = '';
            if(cat.subs) {
                cat.subs.forEach(sub => {
                    subsHTML += `<span class="sub-badge">${sub} <span onclick="deleteSub('${cat.id}', '${sub}')" style="cursor:pointer;margin-left:3px;">×</span></span> `;
                });
            }

            const div = document.createElement('div');
            div.className = 'cat-item';
            div.innerHTML = `
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <strong>${cat.name}</strong>
                    </div>
                    <div style="margin-top:5px;">${subsHTML}</div>
                </div>
                <button onclick="deleteCategory('${cat.id}')" style="color:red;border:none;background:none;cursor:pointer;font-size:1.2rem;"><i class="ph ph-trash"></i></button>
            `;
            listDiv.appendChild(div);
        });
        updateSubSelect();
    } catch (e) {
        console.error("Error cargando categorías: ", e);
        alert("Error de conexión con Firebase");
    }
}

async function addCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return alert("Escribe un nombre");
    
    try {
        await addDoc(collection(db, "categories"), {
            name: name,
            subs: []
        });
        document.getElementById('new-cat-name').value = '';
        loadCategories();
    } catch (e) {
        alert("Error al crear: " + e.message);
    }
}

async function addSubcategory() {
    const catId = document.getElementById('target-cat-select').value;
    const subName = document.getElementById('new-sub-name').value.trim().toLowerCase().replace(/ /g, '-');
    
    if (!subName || !catId) return alert("Faltan datos");

    const cat = categoriesCache.find(c => c.id === catId);
    if(cat) {
        const newSubs = cat.subs ? [...cat.subs, subName] : [subName];
        try {
            await updateDoc(doc(db, "categories", catId), {
                subs: newSubs
            });
            document.getElementById('new-sub-name').value = '';
            loadCategories();
        } catch (e) {
            console.error(e);
        }
    }
}

async function deleteCategory(id) {
    if(!confirm("¿Borrar categoría?")) return;
    await deleteDoc(doc(db, "categories", id));
    loadCategories();
}

async function deleteSub(catId, subName) {
    if(!confirm("¿Borrar subcategoría?")) return;
    const cat = categoriesCache.find(c => c.id === catId);
    if(cat) {
        const newSubs = cat.subs.filter(s => s !== subName);
        await updateDoc(doc(db, "categories", catId), { subs: newSubs });
        loadCategories();
    }
}

function updateSubSelect() {
    const catId = document.getElementById('p-cat').value;
    const subSelect = document.getElementById('p-sub');
    subSelect.innerHTML = '';
    const cat = categoriesCache.find(c => c.id === catId);
    if (cat && cat.subs) {
        cat.subs.forEach(sub => {
            subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
}

// 4. GESTIÓN DE PRODUCTOS (FIRESTORE)
async function loadProducts() {
    const grid = document.getElementById('admin-products-grid');
    grid.innerHTML = 'Cargando productos de la nube...';
    
    const querySnapshot = await getDocs(collection(db, "products"));
    const products = [];
    querySnapshot.forEach((doc) => {
        products.push({ firebaseId: doc.id, ...doc.data() });
    });

    document.getElementById('total-products').innerText = products.length;
    grid.innerHTML = '';
    
    products.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'product-mini';
        div.innerHTML = `
            <div class="actions">
                <button class="action-btn btn-edit" onclick="editProduct('${p.firebaseId}')"><i class="ph ph-pencil-simple"></i></button>
                <button class="action-btn btn-del" onclick="deleteProduct('${p.firebaseId}')"><i class="ph ph-trash"></i></button>
            </div>
            <img src="${p.img}" alt="${p.name}">
            <h4>${p.name}</h4>
            <p>$${p.price}</p>
            <small>${p.category} > ${p.sub}</small>
        `;
        grid.appendChild(div);
    });
    
    // Guardar en variable global para editar sin re-fetchear
    window.adminProductsCache = products;
}

function editProduct(firebaseId) {
    const p = window.adminProductsCache.find(prod => prod.firebaseId === firebaseId);
    if (p) {
        document.getElementById('edit-id').value = firebaseId; // Usamos ID de Firebase
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-img-base64').value = p.img;
        document.getElementById('preview-img').src = p.img;
        document.getElementById('preview-img').style.display = 'block';
        document.querySelector('.upload-placeholder').style.display = 'none';
        document.getElementById('p-desc').value = p.desc || "";
        document.getElementById('p-badge').value = p.badge || "";
        document.getElementById('p-cat').value = p.category;
        updateSubSelect();
        document.getElementById('p-sub').value = p.sub;

        document.getElementById('form-title').innerText = "✏️ Editando Producto";
        document.getElementById('save-btn').innerText = "Actualizar en Nube";
        document.getElementById('cancel-btn').style.display = "inline-block";
        document.getElementById('product-form-card').classList.add('editing-mode');
        document.getElementById('product-form-card').scrollIntoView({ behavior: 'smooth' });
    }
}

function cancelEdit() {
    document.getElementById('add-product-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('p-img-base64').value = "";
    document.getElementById('preview-img').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('form-title').innerText = "➕ Agregar Producto";
    document.getElementById('save-btn').innerText = "Guardar";
    document.getElementById('cancel-btn').style.display = "none";
    document.getElementById('product-form-card').classList.remove('editing-mode');
}

document.getElementById('add-product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const imgValue = document.getElementById('p-img-base64').value || "https://placehold.co/300x200?text=Sin+Foto";

    const productData = {
        id: Date.now(), // ID numérico para compatibilidad interna
        name: document.getElementById('p-name').value,
        price: Number(document.getElementById('p-price').value),
        category: document.getElementById('p-cat').value,
        sub: document.getElementById('p-sub').value,
        img: imgValue,
        desc: document.getElementById('p-desc').value,
        badge: document.getElementById('p-badge').value || null
    };

    const btn = document.getElementById('save-btn');
    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        if (editId) {
            // Actualizar
            await updateDoc(doc(db, "products", editId), productData);
            alert("Producto actualizado en la nube.");
        } else {
            // Crear
            await addDoc(collection(db, "products"), productData);
            alert("Producto creado en la nube.");
        }
        cancelEdit();
        loadProducts();
    } catch (e) {
        console.error(e);
        alert("Error al guardar: " + e.message);
    } finally {
        btn.innerText = "Guardar";
        btn.disabled = false;
    }
});

async function deleteProduct(firebaseId) {
    if(!confirm("¿Borrar producto de la base de datos?")) return;
    try {
        await deleteDoc(doc(db, "products", firebaseId));
        loadProducts();
    } catch (e) {
        alert("Error al borrar: " + e.message);
    }
}

// 5. GESTIÓN DE CUPONES (FIRESTORE)
async function loadCoupons() {
    const container = document.getElementById('coupons-list');
    container.innerHTML = 'Cargando...';
    const snapshot = await getDocs(collection(db, "coupons"));
    container.innerHTML = '';

    snapshot.forEach(doc => {
        const c = doc.data();
        const div = document.createElement('div');
        div.style.cssText = "background:var(--input-bg); padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between;";
        div.innerHTML = `<span><b>${c.code}</b> (${c.discount * 100}% OFF)</span><button onclick="deleteCoupon('${doc.id}')" style="color:red;border:none;background:none;cursor:pointer;"><i class="ph ph-trash"></i></button>`;
        container.appendChild(div);
    });
}

async function addCoupon() {
    const code = document.getElementById('c-code').value.toUpperCase();
    const val = parseFloat(document.getElementById('c-value').value);
    if (!code || !val) return alert("Datos incompletos");
    
    await addDoc(collection(db, "coupons"), { code: code, discount: val });
    loadCoupons();
    document.getElementById('c-code').value = ''; document.getElementById('c-value').value = '';
}

async function deleteCoupon(docId) {
    if(!confirm("¿Borrar cupón?")) return;
    await deleteDoc(doc(db, "coupons", docId));
    loadCoupons();
}