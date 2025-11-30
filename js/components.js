// js/components.js

function loadHeader() {
    const headerHTML = `
    <header>
        <div class="logo">
            <a href="index.html" style="text-decoration:none; display:flex; align-items:center; gap: 10px;">
                <img src="logo/logo romina.png" alt="El Solar by Romina" style="height:40px;" onerror="this.src='https://placehold.co/50x50/6c5ce7/white?text=R'">
                <span style="font-weight: 700; font-size: 1.2rem; color: var(--primary); letter-spacing: 0.5px;">El Solar by Romina</span>
            </a>
        </div>
        <div class="header-right">
            <div class="search-box">
                <input type="text" id="search-input" class="search-input" placeholder="Buscar..." onkeyup="if(typeof searchProducts === 'function') searchProducts(this.value)">
                <div class="voice-btn" onclick="if(typeof startVoiceSearch === 'function') startVoiceSearch()" title="Voz"><i class="ph ph-microphone"></i></div>
                <div class="search-btn"><i class="ph ph-magnifying-glass"></i></div>
            </div>
            <div class="theme-btn" onclick="toggleTheme()" title="Cambiar Tema"><i id="theme-icon" class="ph ph-moon"></i></div>
            <nav class="main-nav" id="main-nav">
                <a href="index.html" class="nav-link">Inicio</a>
                <a href="nosotros.html" class="nav-link">Nosotros</a>
                <a href="contacto.html" class="nav-link">Contacto</a>
                <a href="#" class="nav-link" onclick="if(typeof showFavorites === 'function') { showFavorites(); return false; }">Favoritos ❤️</a>
            </nav>
            <div class="cart-btn" onclick="toggleCart()">
                <i class="ph ph-shopping-cart"></i>
                <span>Carrito</span>
                <span class="cart-count" id="cart-count">0</span>
            </div>
            <div class="mobile-menu-btn" onclick="toggleMobileMenu()">
                <i class="ph ph-list"></i>
            </div>
        </div>
    </header>
    `;
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = headerHTML;
        applySavedTheme();
    }
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll('.nav-link').forEach(link => {
        if(link.getAttribute('href') === currentPage) link.classList.add('active');
    });
}

function loadFooter() {
    const footerHTML = `
    <footer>
        <div class="footer-content">
            <div class="footer-column">
                <h3>Sobre Nosotros</h3>
                <p>Creaciones artesanales hechas con amor y dedicación. Transformamos materiales simples en objetos únicos para tu hogar.</p>
            </div>
            <div class="footer-column">
                <h3>Contacto</h3>
                <p><i class="ph ph-map-pin"></i> Haedo, Buenos Aires</p>
                <p><i class="ph ph-envelope"></i> elsolarbyromina@gmail.com</p>
                <p><i class="ph ph-whatsapp-logo"></i> +54 9 11 6872 2917</p>
            </div>
            <div class="footer-column">
                <h3>Síguenos</h3>
                <div class="social-icons">
                    <a href="#"><i class="ph ph-instagram-logo"></i></a>
                    <a href="#"><i class="ph ph-facebook-logo"></i></a>
                    <a href="#"><i class="ph ph-tiktok-logo"></i></a>
                </div>
            </div>
        </div>
        <div class="footer-bottom"><p>&copy; 2025 El Solar by Romina.</p></div>
    </footer>
    `;
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) footerContainer.innerHTML = footerHTML;
}

function toggleMobileMenu() {
    const nav = document.getElementById('main-nav');
    if (nav) nav.classList.toggle('active');
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const icon = document.getElementById('theme-icon');
    if (body.classList.contains('dark-mode')) {
        if(icon) icon.classList.replace('ph-moon', 'ph-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        if(icon) icon.classList.replace('ph-sun', 'ph-moon');
        localStorage.setItem('theme', 'light');
    }
}

function applySavedTheme() {
    const theme = localStorage.getItem('theme');
    const icon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if(icon) icon.classList.replace('ph-moon', 'ph-sun');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
    loadFooter();
    if(typeof updateCartUI === 'function' && typeof cart !== 'undefined') {
        updateCartUI();
    }
});