// js/components.js

// =========================================
// 1. CARGAR ENCABEZADO (HEADER)
// =========================================
function loadHeader() {
    const headerHTML = `
    <header>
       <div class="logo">
            <a href="index.html" style="text-decoration:none; display:flex; align-items:center; gap: 10px;">
                <img src="logo/logo romina.png" alt="Logo" style="height:60px;">
                <span style="font-weight: 600; font-size: 1.2rem; color: var(--text-main);">
                    El Solar by Romina
                </span>
            </a>
        </div>
        
        <div class="header-right">
            
            <div class="search-box">
                <input type="text" id="search-input" class="search-input" placeholder="Buscar..." onkeyup="if(typeof searchProducts === 'function') searchProducts(this.value)">
                
                <div class="voice-btn" onclick="if(typeof startVoiceSearch === 'function') startVoiceSearch()" title="Buscar por voz">
                    <i class="ph ph-microphone"></i>
                </div>

                <div class="search-btn">
                    <i class="ph ph-magnifying-glass"></i>
                </div>
            </div>

            <div class="theme-btn" onclick="toggleTheme()" title="Cambiar Tema">
                <i id="theme-icon" class="ph ph-moon"></i>
            </div>

            <nav class="main-nav" id="main-nav">
                <a href="index.html" class="nav-link">Inicio</a>
                <a href="nosotros.html" class="nav-link">Nosotros</a>
                <a href="contacto.html" class="nav-link">Contacto</a>
                <a href="#" class="nav-link" onclick="if(typeof showFavorites === 'function') { showFavorites(); return false; }">Favoritos ❤️</a>
            </nav>

            <div class="cart-btn" onclick="if(typeof toggleCart === 'function') toggleCart()">
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
    
    // Inyectar el HTML en el contenedor del header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = headerHTML;
        
        // Una vez inyectado el HTML, aplicamos el tema guardado (si existe)
        applySavedTheme();
    }
    
    // Resaltar el enlace activo según la página actual
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        // Si el href del enlace coincide con la página actual, le agregamos la clase 'active'
        if(link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

// =========================================
// 2. CARGAR PIE DE PÁGINA (FOOTER)
// =========================================
function loadFooter() {
    const footerHTML = `
    <footer>
        <div class="footer-content">
            <div class="footer-column">
                <h3>Sobre Nosotros</h3>
                <p>Creaciones artesanales hechas con amor y dedicación. Transformamos materiales simples en objetos únicos para tu hogar y estilo de vida.</p>
            </div>
            
            <div class="footer-column">
                <h3>Contacto</h3>
                <p><i class="ph ph-map-pin"></i> Haedo, Buenos Aires</p>
                <p><i class="ph ph-envelope"></i> elsolarbyromina@gmail.com </p>
                <p><i class="ph ph-whatsapp-logo"></i> +54 9 11 6872 2917</p>
            </div>
            
            <div class="footer-column">
                <h3>Síguenos</h3>
                <div class="social-icons">
                    <a href="https://www.instagram.com/elsolarbyromina?utm_source=qr&igsh=MXVqbDFxYjc0ZXpvaw==" target="_blank" rel="noopener noreferrer" title="Instagram">
                        <i class="ph ph-instagram-logo"></i>
                    </a>
                    
                    <a href="https://www.facebook.com/share/1Ha2bBCK7h/" target="_blank" rel="noopener noreferrer" title="Facebook">
                        <i class="ph ph-facebook-logo"></i>
                    </a>
                    
                    <a href="https://www.tiktok.com/@elsolarbyromina?_r=1&_t=ZS-91q0hTWpKc9" target="_blank" rel="noopener noreferrer" title="TikTok">
                        <i class="ph ph-tiktok-logo"></i>
                    </a>
                </div>
            </div>
        </div>
        
        <div class="footer-bottom">
            <p>&copy; 2025 Mi Marca Artesanal. Todos los derechos reservados.</p>
        </div>
    </footer>
    `;
    
    // Inyectar el HTML en el contenedor del footer
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.innerHTML = footerHTML;
    }
}

// =========================================
// 3. FUNCIONALIDAD MENÚ MÓVIL
// =========================================
function toggleMobileMenu() {
    const nav = document.getElementById('main-nav');
    if (nav) {
        nav.classList.toggle('active');
    }
}

// =========================================
// 4. FUNCIONALIDAD MODO OSCURO (DARK MODE)
// =========================================
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    // Alternar la clase 'dark-mode' en el body
    body.classList.toggle('dark-mode');
    
    // Cambiar el icono y guardar la preferencia
    if (body.classList.contains('dark-mode')) {
        if(icon) icon.classList.replace('ph-moon', 'ph-sun'); // Cambia luna por sol
        localStorage.setItem('theme', 'dark');
    } else {
        if(icon) icon.classList.replace('ph-sun', 'ph-moon'); // Cambia sol por luna
        localStorage.setItem('theme', 'light');
    }
}

function applySavedTheme() {
    const theme = localStorage.getItem('theme');
    const icon = document.getElementById('theme-icon');
    
    // Si el usuario tenía guardado 'dark', lo aplicamos al cargar
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if(icon) icon.classList.replace('ph-moon', 'ph-sun');
    }
}

// =========================================
// 5. INICIALIZACIÓN
// =========================================
// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
    loadFooter();
    
    // Intentar actualizar el numerito del carrito si la lógica principal ya cargó
    // Esto evita que muestre 0 si recargas la página y ya tenías cosas en el carrito
    if(typeof updateCartUI === 'function' && typeof cart !== 'undefined') {
        updateCartUI();
    }
});