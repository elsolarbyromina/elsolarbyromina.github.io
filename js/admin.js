// js/admin.js

function checkLogin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "1234") {
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

// GESTIÓN DE IMÁGENES Y VIDEO
function previewImage(input) {
    const file = input.files[0];
    if (file) {
        if (file.type.startsWith('video/') && file.size > 5000000) { 
            alert("⚠️ El video es un poco pesado. Intenta que sea de menos de 5MB.");
        }
        if (file.size > 3000000 && !file.type.startsWith('video/')) {
             alert("⚠️ Imagen muy grande. Intenta comprimirla antes.");
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const result = e.target.result;
            const isVideo = result.startsWith('data:video');

            document.getElementById('p-img-base64').value = result;
            document.querySelector('.upload-placeholder').style.display = 'none';

            if (isVideo) {
                document.getElementById('preview-img').style.display = 'none';
                const vid = document.getElementById('preview-video');
                if(vid) {
                    vid.src = result;
                    vid.style.display = 'block';
                }
            } else {
                if(document.getElementById('preview-video')) document.getElementById('preview-video').style.display = 'none';
                const img = document.getElementById('preview-img');
                img.src = result;
                img.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
}

// CATEGORÍAS
function loadCategories() {
    const cats = JSON.parse(localStorage.getItem('categories')) || [];
    const listDiv = document.getElementById('categories-list');
    const selectTarget = document.getElementById('target-cat-select');
    const productCatSelect = document.getElementById('p-cat');
    
    listDiv.innerHTML = '';
    selectTarget.innerHTML = '';
    productCatSelect.innerHTML = '<option value="">Seleccionar...</option>';

    cats.forEach((cat) => {
        const option = `<option value="${cat.id}">${cat.name}</option>`;
        selectTarget.innerHTML += option;
        productCatSelect.innerHTML += option;

        let subsHTML = '';
        cat.subs.forEach((sub) => {
            subsHTML += `<span class="sub-badge">${sub} <span onclick="deleteSub('${cat.id}', '${sub}')" style="cursor:pointer;margin-left:3px;opacity:0.7;">&times;</span></span> `;
        });

        const div = document.createElement('div');
        div.className = 'cat-item';
        div.innerHTML = `
            <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <strong>${cat.name}</strong>
                    <button onclick="renameCategory('${cat.id}')" style="border:none; background:none; cursor:pointer; color:#74b9ff;"><i class="ph ph-pencil-simple"></i></button>
                </div>
                <div style="margin-top:5px;">${subsHTML}</div>
            </div>
            <button onclick="deleteCategory('${cat.id}')" style="color:red;border:none;background:none;cursor:pointer;font-size:1.2rem;"><i class="ph ph-trash"></i></button>
        `;
        listDiv.appendChild(div);
    });
    updateSubSelect();
}

function addCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return alert("Escribe un nombre");
    const id = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    let cats = JSON.parse(localStorage.getItem('categories')) || [];
    if (cats.find(c => c.id === id)) return alert("Ya existe");
    cats.push({ id: id, name: name, subs: [] });
    localStorage.setItem('categories', JSON.stringify(cats));
    document.getElementById('new-cat-name').value = '';
    loadCategories();
}

function renameCategory(id) {
    let cats = JSON.parse(localStorage.getItem('categories'));
    const catIndex = cats.findIndex(c => c.id === id);
    if (catIndex === -1) return;
    const newName = prompt("Nuevo nombre:", cats[catIndex].name);
    if (newName) {
        cats[catIndex].name = newName.trim();
        localStorage.setItem('categories', JSON.stringify(cats));
        loadCategories();
    }
}

function addSubcategory() {
    const catId = document.getElementById('target-cat-select').value;
    const subName = document.getElementById('new-sub-name').value.trim().toLowerCase().replace(/ /g, '-');
    if (!subName || !catId) return alert("Faltan datos");
    let cats = JSON.parse(localStorage.getItem('categories'));
    const cat = cats.find(c => c.id === catId);
    if (cat) {
        if (!cat.subs.includes(subName)) {
            cat.subs.push(subName);
            localStorage.setItem('categories', JSON.stringify(cats));
            document.getElementById('new-sub-name').value = '';
            loadCategories();
        } else { alert("Ya existe"); }
    }
}

function deleteCategory(id) {
    if(!confirm("¿Borrar categoría?")) return;
    let cats = JSON.parse(localStorage.getItem('categories'));
    cats = cats.filter(c => c.id !== id);
    localStorage.setItem('categories', JSON.stringify(cats));
    loadCategories();
    loadProducts();
}

function deleteSub(catId, subName) {
    if(!confirm("¿Borrar subcategoría?")) return;
    let cats = JSON.parse(localStorage.getItem('categories'));
    const cat = cats.find(c => c.id === catId);
    if (cat) {
        cat.subs = cat.subs.filter(s => s !== subName);
        localStorage.setItem('categories', JSON.stringify(cats));
        loadCategories();
    }
}

function updateSubSelect() {
    const catId = document.getElementById('p-cat').value;
    const subSelect = document.getElementById('p-sub');
    subSelect.innerHTML = '';
    const cats = JSON.parse(localStorage.getItem('categories')) || [];
    const cat = cats.find(c => c.id === catId);
    if (cat && cat.subs) {
        cat.subs.forEach(sub => {
            subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
}

// PRODUCTOS
function loadProducts() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const grid = document.getElementById('admin-products-grid');
    document.getElementById('total-products').innerText = products.length;
    grid.innerHTML = '';
    products.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'product-mini';
        
        // Miniatura: video o imagen
        let mediaTag = `<img src="${p.img}" alt="${p.name}">`;
        if (p.img.startsWith('data:video')) {
            mediaTag = `<video src="${p.img}" muted></video>`;
        }

        div.innerHTML = `
            <div class="actions">
                <button class="action-btn btn-edit" onclick="editProduct(${p.id})"><i class="ph ph-pencil-simple"></i></button>
                <button class="action-btn btn-del" onclick="deleteProduct(${p.id})"><i class="ph ph-trash"></i></button>
            </div>
            ${mediaTag}
            <h4>${p.name}</h4>
            <p>$${p.price}</p>
            <small>${p.category} > ${p.sub}</small>
        `;
        grid.appendChild(div);
    });
}

function editProduct(id) {
    const products = JSON.parse(localStorage.getItem('products'));
    const p = products.find(prod => prod.id === id);
    if (p) {
        document.getElementById('edit-id').value = p.id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-img-base64').value = p.img;
        
        document.querySelector('.upload-placeholder').style.display = 'none';
        
        // Detección de video para preview en edición
        const isVideo = p.img.startsWith('data:video') || p.img.endsWith('.mp4');
        if (isVideo) {
            document.getElementById('preview-img').style.display = 'none';
            const vid = document.getElementById('preview-video');
            if(vid) {
                vid.src = p.img;
                vid.style.display = 'block';
            }
        } else {
            if(document.getElementById('preview-video')) document.getElementById('preview-video').style.display = 'none';
            const img = document.getElementById('preview-img');
            img.src = p.img;
            img.style.display = 'block';
        }

        document.getElementById('p-desc').value = p.desc || "";
        document.getElementById('p-badge').value = p.badge || "";
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
    document.getElementById('preview-img').style.display = 'none';
    if(document.getElementById('preview-video')) document.getElementById('preview-video').style.display = 'none';
    
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('form-title').innerText = "➕ Agregar Producto";
    document.getElementById('save-btn').innerText = "Guardar";
    document.getElementById('cancel-btn').style.display = "none";
    document.getElementById('product-form-card').classList.remove('editing-mode');
}

document.getElementById('add-product-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let products = JSON.parse(localStorage.getItem('products')) || [];
    const editId = document.getElementById('edit-id').value;
    const imgValue = document.getElementById('p-img-base64').value || "https://placehold.co/300x200?text=Sin+Foto";

    const productData = {
        id: editId ? parseInt(editId) : Date.now(),
        name: document.getElementById('p-name').value,
        price: Number(document.getElementById('p-price').value),
        category: document.getElementById('p-cat').value,
        sub: document.getElementById('p-sub').value,
        img: imgValue,
        desc: document.getElementById('p-desc').value,
        badge: document.getElementById('p-badge').value || null
    };

    if (editId) {
        const index = products.findIndex(p => p.id == editId);
        if (index !== -1) { products[index] = productData; alert("Actualizado"); }
    } else {
        products.unshift(productData);
        alert("Creado");
    }

    localStorage.setItem('products', JSON.stringify(products));
    cancelEdit();
    loadProducts();
});

function deleteProduct(id) {
    if(!confirm("¿Borrar?")) return;
    let products = JSON.parse(localStorage.getItem('products'));
    products = products.filter(p => p.id !== id);
    localStorage.setItem('products', JSON.stringify(products));
    loadProducts();
}

// CUPONES
function loadCoupons() {
    const coupons = JSON.parse(localStorage.getItem('coupons')) || {};
    const container = document.getElementById('coupons-list');
    container.innerHTML = '';
    for (const [code, discount] of Object.entries(coupons)) {
        const div = document.createElement('div');
        div.style.cssText = "background:var(--input-bg); padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between;";
        div.innerHTML = `<span><b>${code}</b> (${discount * 100}% OFF)</span><button onclick="deleteCoupon('${code}')" style="color:red;border:none;background:none;cursor:pointer;"><i class="ph ph-trash"></i></button>`;
        container.appendChild(div);
    }
}

function addCoupon() {
    const code = document.getElementById('c-code').value.toUpperCase();
    const val = parseFloat(document.getElementById('c-value').value);
    if (!code || !val) return alert("Datos incompletos");
    let coupons = JSON.parse(localStorage.getItem('coupons')) || {};
    coupons[code] = val;
    localStorage.setItem('coupons', JSON.stringify(coupons));
    loadCoupons();
    document.getElementById('c-code').value = ''; document.getElementById('c-value').value = '';
}

function deleteCoupon(code) {
    let coupons = JSON.parse(localStorage.getItem('coupons'));
    delete coupons[code];
    localStorage.setItem('coupons', JSON.stringify(coupons));
    loadCoupons();
}

function resetStock() {
    if(confirm("⚠ ¿RESET TOTAL? Se borrará todo.")) {
        localStorage.clear();
        location.reload();
    }
}