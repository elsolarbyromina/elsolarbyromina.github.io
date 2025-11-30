// =========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN
// =========================================
import { db } from './config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =========================================
// 2. EXPOSICIÓN DE FUNCIONES AL HTML
// =========================================
// Como es un módulo, las funciones no son globales por defecto.
// Las asignamos manualmente a 'window' para que los botones onclick="" funcionen.

window.checkLogin = checkLogin;
window.previewImage = previewImage;

// Categorías
window.addCategory = addCategory;
window.renameCategory = renameCategory;
window.addSubcategory = addSubcategory;
window.deleteCategory = deleteCategory;
window.deleteSub = deleteSub;
window.updateSubSelect = updateSubSelect;

// Productos
window.editProduct = editProduct;
window.cancelEdit = cancelEdit;
window.deleteProduct = deleteProduct;

// Cupones
window.addCoupon = addCoupon;
window.deleteCoupon = deleteCoupon;

// Sistema
window.resetStock = resetStock;

// VARIABLES DE ESTADO
let categoriesCache = [];     // Para no consultar a Firebase a cada rato al llenar selects
let adminProductsCache = [];  // Para tener los datos a mano al editar

// =========================================
// 3. LOGIN Y SEGURIDAD
// =========================================
function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "1234") { // Contraseña simple
        document.getElementById('login-overlay').style.display = 'none';
        initAdmin();
    } else {
        alert("Contraseña incorrecta");
    }
}

function initAdmin() {
    loadCategories();
    loadProducts();
    loadCoupons();
}

// =========================================
// 4. GESTIÓN DE IMÁGENES (FILE READER)
// =========================================
function previewImage(input) {
    const file = input.files[0];
    if (file) {
        // Validación de peso (Firebase tiene límites en documentos)
        if (file.size > 800000) { 
            alert("⚠️ La imagen es muy pesada (Más de 800KB). Es probable que Firebase rechace el documento o que la tienda cargue lento. Por favor, redimensiónala.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            // 1. Mostrar vista previa visual
            const img = document.getElementById('preview-img');
            img.src = e.target.result;
            img.style.display = 'block';
            
            // 2. Guardar el string Base64 en el input oculto
            document.getElementById('p-img-base64').value = e.target.result;
            
            // 3. Ocultar el texto de "subir"
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
    const selectTarget = document.getElementById('target-cat-select'); // Select para agregar sub
    const productCatSelect = document.getElementById('p-cat'); // Select del formulario producto
    
    listDiv.innerHTML = '<p style="text-align:center; color:#888;">Cargando categorías...</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        
        // Limpiar UI
        listDiv.innerHTML = '';
        selectTarget.innerHTML = '';
        productCatSelect.innerHTML = '<option value="">Seleccionar...</option>';
        categoriesCache = [];

        querySnapshot.forEach((docSnap) => {
            const cat = { id: docSnap.id, ...docSnap.data() };
            categoriesCache.push(cat);

            // Llenar Selects
            const option = `<option value="${cat.id}">${cat.name}</option>`;
            selectTarget.innerHTML += option;
            productCatSelect.innerHTML += option;

            // Generar HTML de Subcategorías (Badges)
            let subsHTML = '';
            if(cat.subs && cat.subs.length > 0) {
                cat.subs.forEach(sub => {
                    subsHTML += `<span class="sub-badge">${sub} <span onclick="deleteSub('${cat.id}', '${sub}')" style="cursor:pointer;margin-left:5px;opacity:0.7;" title="Borrar Sub">&times;</span></span> `;
                });
            } else {
                subsHTML = '<small style="color:#999;">Sin subcategorías</small>';
            }

            // Crear Elemento Visual en la Lista
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

        // Actualizar el select de subcategorías del formulario de productos
        updateSubSelect();

    } catch (e) {
        console.error("Error cargando categorías: ", e);
        alert("Error de conexión con Firebase al cargar categorías.");
    }
}

async function addCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return alert("Escribe un nombre para la categoría.");
    
    try {
        await addDoc(collection(db, "categories"), {
            name: name,
            subs: [] // Inicia sin subcategorías
        });
        document.getElementById('new-cat-name').value = '';
        loadCategories(); // Recargar lista
    } catch (e) {
        alert("Error al crear: " + e.message);
    }
}

async function renameCategory(id, oldName) {
    const newName = prompt("Nuevo nombre para la categoría:", oldName);
    if (newName && newName.trim() !== "") {
        try {
            await updateDoc(doc(db, "categories", id), { name: newName.trim() });
            loadCategories();
        } catch (e) {
            alert("Error al renombrar: " + e.message);
        }
    }
}

async function addSubcategory() {
    const catId = document.getElementById('target-cat-select').value;
    const subName = document.getElementById('new-sub-name').value.trim().toLowerCase().replace(/ /g, '-'); // Slugify simple
    
    if (!subName || !catId) return alert("Selecciona una categoría y escribe un nombre.");

    const cat = categoriesCache.find(c => c.id === catId);
    if(cat) {
        // Evitar duplicados
        if(cat.subs && cat.subs.includes(subName)) return alert("Esa subcategoría ya existe.");

        const newSubs = cat.subs ? [...cat.subs, subName] : [subName];
        
        try {
            await updateDoc(doc(db, "categories", catId), { subs: newSubs });
            document.getElementById('new-sub-name').value = '';
            loadCategories();
        } catch (e) {
            console.error(e);
            alert("Error al guardar subcategoría.");
        }
    }
}

async function deleteCategory(id) {
    if(!confirm("¿Estás seguro? Se borrará la categoría y sus subcategorías.")) return;
    try {
        await deleteDoc(doc(db, "categories", id));
        loadCategories();
    } catch (e) {
        alert("Error al borrar: " + e.message);
    }
}

async function deleteSub(catId, subName) {
    if(!confirm(`¿Borrar subcategoría '${subName}'?`)) return;
    
    const cat = categoriesCache.find(c => c.id === catId);
    if(cat) {
        const newSubs = cat.subs.filter(s => s !== subName);
        try {
            await updateDoc(doc(db, "categories", catId), { subs: newSubs });
            loadCategories();
        } catch (e) {
            alert("Error al borrar subcategoría.");
        }
    }
}

// Función auxiliar para actualizar el select de "Subcategoría" cuando cambia la "Categoría" en el form de producto
function updateSubSelect() {
    const catId = document.getElementById('p-cat').value;
    const subSelect = document.getElementById('p-sub');
    subSelect.innerHTML = ''; // Limpiar
    
    const cat = categoriesCache.find(c => c.id === catId);
    
    if (cat && cat.subs && cat.subs.length > 0) {
        cat.subs.forEach(sub => {
            // Formatear nombre para mostrar (capitalizar primera letra)
            const displayName = sub.charAt(0).toUpperCase() + sub.slice(1);
            subSelect.innerHTML += `<option value="${sub}">${displayName}</option>`;
        });
    } else {
        subSelect.innerHTML = '<option value="">Sin subcategorías</option>';
    }
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
        
        querySnapshot.forEach((doc) => {
            // Guardamos el ID de firebase y los datos
            products.push({ firebaseId: doc.id, ...doc.data() });
        });

        document.getElementById('total-products').innerText = products.length;
        grid.innerHTML = '';
        
        // Ordenar: Primero los más nuevos (por ID timestamp descendente)
        products.sort((a, b) => b.id - a.id);
        
        products.forEach((p) => {
            const div = document.createElement('div');
            div.className = 'product-mini';
            div.innerHTML = `
                <div class="actions">
                    <button class="action-btn btn-edit" onclick="editProduct('${p.firebaseId}')" title="Editar">✏️</button>
                    <button class="action-btn btn-del" onclick="deleteProduct('${p.firebaseId}')" title="Borrar">🗑</button>
                </div>
                <img src="${p.img}" alt="${p.name}" onerror="this.src='https://placehold.co/300x200?text=Sin+Imagen'">
                <h4>${p.name}</h4>
                <p>$${Number(p.price).toLocaleString()}</p>
                <small>${p.category} > ${p.sub}</small>
            `;
            grid.appendChild(div);
        });
        
        // Guardar en caché para la edición rápida
        adminProductsCache = products;
        
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p style="color:red;">Error cargando productos.</p>';
    }
}

// Cargar datos en el formulario para editar
function editProduct(firebaseId) {
    const p = adminProductsCache.find(prod => prod.firebaseId === firebaseId);
    if (p) {
        // 1. Llenar campos simples
        document.getElementById('edit-id').value = firebaseId;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-desc').value = p.desc || "";
        document.getElementById('p-badge').value = p.badge || "";
        
        // 2. Manejo de Imagen
        document.getElementById('p-img-base64').value = p.img;
        const preview = document.getElementById('preview-img');
        preview.src = p.img;
        preview.style.display = 'block';
        document.querySelector('.upload-placeholder').style.display = 'none';

        // 3. Manejo de Categorías (Secuencial para que se cargue el sub-select)
        document.getElementById('p-cat').value = p.category;
        updateSubSelect(); // Forzar actualización de subcategorías
        document.getElementById('p-sub').value = p.sub;

        // 4. Cambiar UI a Modo Edición
        document.getElementById('form-title').innerText = "✏️ Editando Producto";
        document.getElementById('save-btn').innerText = "Actualizar Producto";
        document.getElementById('cancel-btn').style.display = "inline-block";
        document.getElementById('product-form-card').classList.add('editing-mode');
        
        // Scroll al formulario
        document.getElementById('product-form-card').scrollIntoView({ behavior: 'smooth' });
    }
}

function cancelEdit() {
    document.getElementById('add-product-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('p-img-base64').value = "";
    
    // Resetear imagen
    document.getElementById('preview-img').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';

    // Resetear UI
    document.getElementById('form-title').innerText = "➕ Agregar Producto";
    document.getElementById('save-btn').innerText = "Guardar en Nube";
    document.getElementById('cancel-btn').style.display = "none";
    document.getElementById('product-form-card').classList.remove('editing-mode');
}

// EVENTO SUBMIT DEL FORMULARIO (Crear o Actualizar)
document.getElementById('add-product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Referencias
    const btn = document.getElementById('save-btn');
    const editId = document.getElementById('edit-id').value;
    const imgValue = document.getElementById('p-img-base64').value;

    // Validación básica
    if (!imgValue) return alert("Por favor selecciona una imagen.");

    // Bloquear botón
    btn.innerText = "Guardando...";
    btn.disabled = true;

    // Objeto de datos
    const productData = {
        id: Date.now(), // Timestamp como ID único numérico para el frontend
        name: document.getElementById('p-name').value,
        price: Number(document.getElementById('p-price').value),
        category: document.getElementById('p-cat').value,
        sub: document.getElementById('p-sub').value,
        img: imgValue,
        desc: document.getElementById('p-desc').value,
        badge: document.getElementById('p-badge').value || null
    };

    try {
        if (editId) {
            // MODO EDICIÓN: Update
            // No sobrescribimos el ID numérico original, solo los datos
            delete productData.id; 
            await updateDoc(doc(db, "products", editId), productData);
            alert("Producto actualizado correctamente.");
        } else {
            // MODO CREACIÓN: Add
            await addDoc(collection(db, "products"), productData);
            alert("Producto creado correctamente.");
        }
        
        cancelEdit();
        loadProducts(); // Refrescar lista

    } catch (e) {
        console.error(e);
        alert("Error al guardar en Firebase: " + e.message);
    } finally {
        btn.innerText = editId ? "Actualizar Producto" : "Guardar en Nube";
        btn.disabled = false;
    }
});

async function deleteProduct(firebaseId) {
    if(!confirm("¿Seguro que quieres borrar este producto permanentemente?")) return;
    
    try {
        await deleteDoc(doc(db, "products", firebaseId));
        loadProducts();
    } catch (e) {
        alert("Error al borrar: " + e.message);
    }
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
        
        if(snapshot.empty) {
            container.innerHTML = '<small>No hay cupones activos.</small>';
            return;
        }

        snapshot.forEach(doc => {
            const c = doc.data();
            const div = document.createElement('div');
            div.style.cssText = "background:var(--input-bg); padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between; border:1px solid var(--border-color); align-items:center;";
            div.innerHTML = `
                <span><b>${c.code}</b> (${c.discount * 100}% OFF)</span>
                <button onclick="deleteCoupon('${doc.id}')" style="color:red;border:none;background:none;cursor:pointer;font-size:1.2rem;">&times;</button>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error(e);
    }
}

async function addCoupon() {
    const code = document.getElementById('c-code').value.toUpperCase().trim();
    const val = parseFloat(document.getElementById('c-value').value);
    
    if (!code || !val) return alert("Ingresa un código y un valor decimal (ej: 0.10 para 10%).");
    
    try {
        await addDoc(collection(db, "coupons"), { code: code, discount: val });
        loadCoupons();
        document.getElementById('c-code').value = '';
        document.getElementById('c-value').value = '';
    } catch (e) {
        alert("Error al crear cupón.");
    }
}

async function deleteCoupon(docId) {
    if(!confirm("¿Borrar cupón?")) return;
    await deleteDoc(doc(db, "coupons", docId));
    loadCoupons();
}

// =========================================
// 8. UTILS
// =========================================
function resetStock() {
    if(confirm("⚠️ ¡PELIGRO! Esta función borraría toda tu base de datos en la nube. ¿Estás seguro de que quieres borrar TODO?")) {
        // Aquí iría la lógica de batch delete si se quisiera implementar real, 
        // por ahora solo recarga para evitar accidentes graves.
        alert("Por seguridad, el borrado masivo de la nube está desactivado en este script.");
        location.reload();
    }
}