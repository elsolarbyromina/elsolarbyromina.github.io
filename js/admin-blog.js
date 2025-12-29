// js/admin-blog.js
import { db, auth, storage } from './config.js';
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REFERENCIAS DOM ---
const loginOverlay = document.getElementById('login-overlay');
const adminContent = document.getElementById('admin-content');
const postsList = document.getElementById('posts-list');
const postForm = document.getElementById('blog-form');

// --- AUTENTICACIÓN (Reutilizada) ---
window.loginBlog = async () => {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Error: " + error.message);
    }
};

window.logoutBlog = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginOverlay.style.display = 'none';
        adminContent.style.display = 'block';
        loadPosts();
    } else {
        loginOverlay.style.display = 'flex';
        adminContent.style.display = 'none';
    }
});

// --- GESTIÓN DE NOTICIAS ---
async function loadPosts() {
    postsList.innerHTML = '';
    // Ordenamos por fecha descendente (lo más nuevo arriba)
    const q = query(collection(db, "news"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    if(snapshot.empty) {
        postsList.innerHTML = '<p>No hay noticias publicadas.</p>';
        return;
    }

    snapshot.forEach(docSnap => {
        const post = docSnap.data();
        const div = document.createElement('div');
        div.className = 'cat-item'; // Reutilizamos estilos de admin.css
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${post.image}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
                <div>
                    <strong>${post.title}</strong><br>
                    <small>${post.date}</small>
                </div>
            </div>
            <div>
                <button onclick="deletePost('${docSnap.id}')" class="action-btn btn-del"><i class="ph ph-trash"></i></button>
            </div>
        `;
        postsList.appendChild(div);
    });
}

// --- GUARDAR / SUBIR ---
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-post-btn');
    btn.textContent = "Guardando...";
    btn.disabled = true;

    try {
        const title = document.getElementById('post-title').value;
        const date = document.getElementById('post-date').value;
        const text = document.getElementById('post-text').value;
        const link = document.getElementById('post-link').value;
        const file = document.getElementById('post-img-file').files[0];

        let imageUrl = document.getElementById('post-preview-img').src;

        // Si hay archivo nuevo, subirlo
        if (file) {
            const storageRef = ref(storage, `blog/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }

        const newPost = { title, date, text, link, image: imageUrl };

        // Guardar en Firestore
        await addDoc(collection(db, "news"), newPost);
        
        alert("✅ Nota publicada con éxito");
        postForm.reset();
        document.getElementById('post-preview-img').style.display = 'none';
        loadPosts();

    } catch (error) {
        console.error(error);
        alert("Error al publicar: " + error.message);
    } finally {
        btn.textContent = "Publicar Nota";
        btn.disabled = false;
    }
});

// --- UTILIDADES ---
window.deletePost = async (id) => {
    if(!confirm("¿Borrar esta noticia permanentemente?")) return;
    await deleteDoc(doc(db, "news", id));
    loadPosts();
};

window.previewPostImage = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('post-preview-img');
            img.src = e.target.result;
            img.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
};