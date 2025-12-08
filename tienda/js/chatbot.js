// =========================================
// ASISTENTE VIRTUAL IA (CONECTADO A api-chat.php)
// =========================================
import { db } from './config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN CRÍTICA ---
// Usamos ruta relativa: La barra "/" significa "busca en la raíz del sitio"
const PROXY_URL = '/chat-proxy.php'; 

// =========================================
// 1. CEREBRO DE LA IA (CONTEXTO + INVENTARIO)
// =========================================
let productContext = "";

// Cargar el inventario al iniciar para que la IA sepa qué vendes
async function loadInventoryForAI() {
    try {
        const query = await getDocs(collection(db, "products"));
        let textList = [];
        
        if (query.empty) {
            console.warn("El inventario está vacío.");
        }

        query.forEach(doc => {
            const p = doc.data();
            // Creamos una frase por producto para que la IA entienda
            textList.push(`- ${p.name} (${p.category}): $${p.price}. ${p.desc || ''}`);
        });
        
        // Contexto base del negocio
        productContext = `
        ACTÚA COMO: Asistente de ventas experto de "El Solar by Romina" (Tienda de artesanías, decoración y diseño).
        TU OBJETIVO: Ayudar al cliente a elegir productos, responder dudas y cerrar ventas.
        TU TONO: Cálido, amable, usa emojis 🌸✨. Respuestas cortas y concisas (máximo 3 líneas).
        
        DATOS CLAVE DEL NEGOCIO:
        - Ubicación: Haedo, Buenos Aires (Zona Oeste).
        - Envíos: A todo el país por Correo Andreani. ¡Envío GRATIS solo en Haedo!
        - Pagos: Transferencia, MercadoPago y Efectivo.
        - DESCUENTO: 10% OFF pagando en Efectivo al retirar.
        - Contacto humano: WhatsApp +5491168722917 (Romina).
        - Stock: Los productos son artesanales y de stock limitado.
        
        LISTA DE PRODUCTOS Y PRECIOS ACTUALES:
        ${textList.join("\n")}
        
        REGLAS DE RESPUESTA:
        1. Si te preguntan precios, búscalos en la lista de arriba. Si no está en la lista, di que no tenemos stock.
        2. Si te piden algo personalizado, diles que nos escriban al WhatsApp.
        3. Nunca inventes productos que no están en la lista.
        4. Si el cliente parece listo para comprar, invítalo a agregar al carrito.
        `;
        
        console.log("Cerebro de IA cargado con inventario actualizado.");
        
    } catch (e) {
        console.error("Error cargando contexto IA:", e);
        // Fallback por si falla la base de datos
        productContext = "Eres un asistente de ventas amable de El Solar by Romina. Por favor pide al cliente que contacte por WhatsApp para detalles de stock.";
    }
}

// Iniciar carga de memoria apenas carga la página
loadInventoryForAI();

// =========================================
// 2. INTERFAZ DEL CHAT
// =========================================

function toggleChatWidget() { 
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.classList.toggle('active'); 
        
        const msgs = document.getElementById('chat-messages');
        // Si está vacío, mensaje de bienvenida automático
        if(msgs && msgs.children.length === 0) {
            setTimeout(() => {
                addMessage("¡Hola! 🌸 Soy la IA de El Solar. Conozco todo el stock y los precios. ¿Qué estás buscando hoy?", 'bot');
            }, 500);
        }
    }
}

function handleChat(e) { 
    if (e.key === 'Enter') sendMessage(); 
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    // 1. Mostrar mensaje usuario
    addMessage(msg, 'user');
    input.value = '';
    
    // 2. Mostrar "Escribiendo..."
    showTyping();

    // 3. Llamar a la IA a través del Proxy
    callAIProxy(msg);
}

function addMessage(text, sender) { 
    const container = document.getElementById('chat-messages'); 
    if(!container) return;

    const div = document.createElement('div'); 
    div.className = `message ${sender}`; 
    // Convertir **negritas** de Markdown a HTML para que se vea bonito
    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
    container.appendChild(div); 
    container.scrollTop = container.scrollHeight; 
}

function showTyping() {
    const container = document.getElementById('chat-messages'); 
    if(!container) return;

    const div = document.createElement('div');
    div.className = 'message bot typing';
    div.id = 'bot-typing';
    div.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removeTyping() {
    const el = document.getElementById('bot-typing');
    if(el) el.remove();
}

// =========================================
// 3. CONEXIÓN CON EL SERVIDOR (PHP PROXY)
// =========================================
async function callAIProxy(userQuestion) {
    // Si el usuario escribe muy rápido y el inventario no cargó, esperamos un poco
    if (!productContext) await loadInventoryForAI();

    // Estructura del mensaje para Gemini
    const requestBody = {
        contents: [{
            parts: [{
                text: productContext + "\n\nCLIENTE DICE: " + userQuestion + "\nTU RESPUESTA (Corta y amable):"
            }]
        }]
    };

    try {
        // Llamada al archivo PHP en el servidor
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        removeTyping();

        // Procesar respuesta de Gemini
        if (data.candidates && data.candidates[0].content) {
            const aiText = data.candidates[0].content.parts[0].text;
            addMessage(aiText, 'bot');
        } else if (data.error) {
            console.error("Error API:", data.error);
            addMessage("Lo siento, estoy un poco mareada. 😵 ¿Podrías preguntarme de otra forma?", 'bot');
        } else {
            addMessage("No pude procesar eso. ¿Te gustaría hablar con Romina por WhatsApp?", 'bot');
        }

    } catch (error) {
        console.error("Error de Conexión:", error);
        removeTyping();
        addMessage("Tengo problemas de conexión. Por favor escríbenos al WhatsApp. 🙏", 'bot');
    }
}

// =========================================
// 4. EXPOSICIÓN GLOBAL (Para el HTML)
// =========================================
window.toggleChatWidget = toggleChatWidget;
window.handleChat = handleChat;
window.sendMessage = sendMessage;