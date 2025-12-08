// =========================================
// ASISTENTE VIRTUAL PRO: LÓGICA DE PRECIOS EXACTA
// =========================================
import { db } from './config.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SESSION_ID = "session_" + Date.now();

// =========================================
// 1. CEREBRO LOCAL
// =========================================
let productsMemory = []; 
let uniqueCategories = []; 

async function loadInventory() {
    try {
        const query = await getDocs(collection(db, "products"));
        productsMemory = [];
        const catSet = new Set(); 
        
        query.forEach(doc => {
            const p = doc.data();
            productsMemory.push({
                id: p.id, 
                name: p.name.toLowerCase(),
                category: p.category.toLowerCase(), 
                originalCategory: p.category,       
                price: Number(p.price),
                originalName: p.name
            });
            if(p.category) catSet.add(p.category.trim());
        });

        uniqueCategories = Array.from(catSet).sort();
        console.log(`✅ Cerebro nutrido: ${productsMemory.length} productos.`);
        
    } catch (e) {
        console.error("Error cargando inventario:", e);
    }
}

loadInventory();

// =========================================
// 2. GUARDAR HISTORIAL
// =========================================
async function saveToHistory(text, sender) {
    try {
        await addDoc(collection(db, "chat_logs"), {
            session: SESSION_ID,
            message: text,
            sender: sender,
            timestamp: new Date(),
            dateString: new Date().toLocaleString()
        });
    } catch (e) { console.warn("Log error"); }
}

// =========================================
// 3. INTELIGENCIA LÓGICA (CORREGIDA)
// =========================================
function getSmartResponse(userText) {
    const text = userText.toLowerCase().trim();

    // --- A. DETECTOR DE PRESUPUESTO (CORREGIDO) ---
    // Detectamos números grandes (precios)
    const numbers = text.match(/\d+/g);
    
    // Palabras que indican dinero/intención de gasto
    const moneyTriggers = ['tengo', 'gast', 'presupuesto', 'hasta', 'menos', 'sale', 'puedo', 'cuento', 'dinero', 'plata', 'valor', '$'];
    
    const hasMoneyIntent = moneyTriggers.some(trigger => text.includes(trigger));

    if (numbers && numbers.length > 0 && hasMoneyIntent) {
        const budget = parseInt(numbers[0]); // El primer número es el presupuesto
        
        // FILTRO ESTRICTO: Solo productos MENORES o IGUALES al presupuesto
        const affordable = productsMemory.filter(p => p.price <= budget);
        
        // Ordenamos: Primero los más cercanos al presupuesto (Mayor a menor precio)
        affordable.sort((a, b) => b.price - a.price);

        if (affordable.length > 0) {
            let html = `💰 **Con $${budget.toLocaleString()} puedes comprar:**<br><br>`;
            
            // Mostramos top 3
            affordable.slice(0, 3).forEach(p => {
                html += `▪️ <strong>${p.originalName}</strong>: $${p.price.toLocaleString()}
                <div class="btn-group">
                    <button class="mini-btn" onclick="window.openQuickView('${p.id}')">👀 Ver</button>
                    <button class="mini-btn-add" onclick="window.addToCart('${p.id}')">🛒 Agregar</button>
                </div><br>`;
            });
            
            if(affordable.length > 3) html += `...y ${affordable.length - 3} opciones más económicas.`;
            return html;
        } else {
            return `Uy! 😅 Por $${budget.toLocaleString()} no tengo nada en este momento.<br>¿Te gustaría ver opciones más económicas o de otro precio?`;
        }
    }

    // --- B. DETECTOR DE CUPONES ---
    if (text.match(/cupon|descuento|promo|oferta|codigo/)) {
        return "🎉 **¡Tengo un regalo para ti!**\n\nUsa el cupón: <strong>TIENDA10</strong>\nPara obtener un descuento especial. 🎁";
    }

    // --- C. INTENCIÓN "VER CATEGORÍAS" ---
    if (text.match(/categoria|menu|ver productos|catalogo|explorar|lista/)) {
        return "SHOW_CATEGORIES_TRIGGER"; 
    }

    // --- D. RECOMENDACIONES AL AZAR ---
    if (text.match(/recomienda|sugerencia|regalo|inspirame|sugerime/)) {
        const randomProducts = productsMemory.sort(() => 0.5 - Math.random()).slice(0, 3);
        let html = "🎁 **¡Mira estas bellezas!** 🎁<br><br>";
        randomProducts.forEach(p => {
            html += `▪️ <strong>${p.originalName}</strong>: $${p.price.toLocaleString()}
            <div class="btn-group">
                <button class="mini-btn" onclick="window.openQuickView('${p.id}')">👀 Ver</button>
                <button class="mini-btn-add" onclick="window.addToCart('${p.id}')">🛒 Agregar</button>
            </div><br>`;
        });
        return html;
    }

    // --- E. PREGUNTAS FIJAS ---
    if (text.match(/envio|llevan|zona|haedo|entrega/)) return "🚚 **Envíos:**\n- Andreani a todo el país.\n- ¡En **Haedo** es GRATIS! 🏠";
    if (text.match(/pago|tarjeta|efectivo|transferencia/)) return "💳 **Pagos:**\n- Transferencia / MercadoPago.\n- ✨ **10% OFF** Efectivo.";
    if (text.match(/donde|ubicacion|local|calle/)) return "📍 Estamos en **Haedo, Zona Oeste**.";
    if (text.match(/humano|persona|romina|hablar/)) return "💬 Habla con Romina: \n👉 +54 9 11 6872 2917";
    if (text.match(/^(hola|buen|dia|tarde|noche|hi|alo)/)) return "¡Hola! 🌸 Bienvenida a El Solar.<br>Escribe tu presupuesto (ej: 'tengo 20000') y te digo qué te alcanza.";

    // --- F. BÚSQUEDA POR TEXTO ---
    const stopWords = ["hola", "precio", "cuanto", "sale", "tenes", "quiero", "busco", "el", "la", "que", "puedo", "comprar", "con"];
    const keywords = text.split(" ").filter(w => w.length > 2 && !stopWords.includes(w));

    if (keywords.length > 0) {
        const matches = productsMemory.filter(p => keywords.some(k => p.name.includes(k) || p.category.includes(k)));
        
        if (matches.length > 0) {
            let html = "¡Encontré esto! 🔎<br><br>";
            matches.slice(0, 3).forEach(p => {
                html += `▪️ <strong>${p.originalName}</strong>: $${p.price.toLocaleString()}
                <div class="btn-group">
                    <button class="mini-btn" onclick="window.openQuickView('${p.id}')">👀 Ver</button>
                    <button class="mini-btn-add" onclick="window.addToCart('${p.id}')">🛒 Sumar</button>
                </div><br>`;
            });
            if(matches.length > 3) html += `...y ${matches.length - 3} más.`;
            return html;
        }
    }

    return "Mmm, no entendí bien. 🤔\nPrueba escribiendo 'tengo 15000' o el nombre de un producto.";
}

// =========================================
// 4. FUNCIONES VISUALES PRO
// =========================================

function showCategoryChips() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const catContainer = document.createElement('div');
    catContainer.className = 'chat-suggestions';
    catContainer.style.marginTop = "10px";
    catContainer.innerHTML = "<small style='width:100%; color:#666; margin-bottom:5px;'>Selecciona una sección:</small>";

    uniqueCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-chip';
        btn.style.background = "#fff";
        btn.style.border = "1px solid #6c5ce7";
        btn.style.color = "#6c5ce7";
        btn.innerText = cat.charAt(0).toUpperCase() + cat.slice(1);
        
        btn.onclick = () => {
            const input = document.getElementById('chat-input');
            input.value = cat; 
            sendMessage();
            catContainer.remove(); 
        };
        catContainer.appendChild(btn);
    });

    container.appendChild(catContainer);
    container.scrollTop = container.scrollHeight;
}

function renderMainSuggestions() {
    const container = document.getElementById('chat-messages');
    if (!container || document.getElementById('suggestions-row')) return;

    const div = document.createElement('div');
    div.id = 'suggestions-row';
    div.className = 'chat-suggestions';
    
    // Opciones iniciales rápidas
    const topics = ["📂 Categorías", "💰 Tengo $20.000", "🎁 Sorprendeme", "🎟️ Cupón"];

    topics.forEach(topic => {
        const btn = document.createElement('div');
        btn.className = 'suggestion-chip';
        btn.innerText = topic;
        btn.onclick = () => {
            const input = document.getElementById('chat-input');
            // Quitamos el emoji para la búsqueda
            input.value = topic.replace("💰 ", "").replace("🎁 ", "").replace("🎟️ ", "").replace("📂 ", ""); 
            sendMessage();       
            div.remove(); 
        };
        div.appendChild(btn);
    });

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function toggleChatWidget() { 
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.classList.toggle('active'); 
        const msgs = document.getElementById('chat-messages');
        if(msgs && msgs.children.length === 0) {
            setTimeout(() => {
                addMessage("¡Hola! 🌸 Soy la asistente virtual. ¿Qué te gustaría ver hoy?", 'bot');
                saveToHistory("Saludo Inicial", 'bot');
                renderMainSuggestions();
            }, 500);
        }
    }
}

function handleChat(e) { if (e.key === 'Enter') sendMessage(); }

function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    const old = document.getElementById('suggestions-row');
    if(old) old.remove();

    addMessage(msg, 'user');
    saveToHistory(msg, 'user');
    input.value = '';
    showTyping();
    
    setTimeout(() => {
        const reply = getSmartResponse(msg); 
        removeTyping();

        if (reply === "SHOW_CATEGORIES_TRIGGER") {
            addMessage("Aquí tienes nuestras secciones disponibles 👇", 'bot');
            showCategoryChips(); 
        } else {
            addMessage(reply, 'bot');
            setTimeout(renderMainSuggestions, 1500);
        }
        
        saveToHistory(reply, 'bot');
    }, 600); 
}

function addMessage(text, sender) { 
    const container = document.getElementById('chat-messages'); 
    if(!container) return;
    const div = document.createElement('div'); 
    div.className = `message ${sender}`; 
    div.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
    container.appendChild(div); 
    container.scrollTop = container.scrollHeight; 
}

function showTyping() {
    const c = document.getElementById('chat-messages');
    if(!c) return;
    const d = document.createElement('div');
    d.className = 'message bot typing'; d.id = 'bot-typing';
    d.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
}

function removeTyping() { const el = document.getElementById('bot-typing'); if(el) el.remove(); }

window.toggleChatWidget = toggleChatWidget;
window.handleChat = handleChat;
window.sendMessage = sendMessage;