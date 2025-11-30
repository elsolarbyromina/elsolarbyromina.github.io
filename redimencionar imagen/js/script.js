// Referencias DOM
const inputImages = document.getElementById('inputImages');
const countLabel = document.getElementById('countLabel');
const inputLogo = document.getElementById('inputLogo');
const statusText = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const btnProcess = document.getElementById('btnProcess');
const btnGif = document.getElementById('btnGif');
const btnCollage = document.getElementById('btnCollage');
const btnGrid = document.getElementById('btnGrid');
const rangeBrightness = document.getElementById('rangeBrightness');
const valBrightness = document.getElementById('valBrightness');
const rangeContrast = document.getElementById('rangeContrast');
const valContrast = document.getElementById('valContrast');
const aiStatus = document.getElementById('aiStatus');

// Eventos Básicos
rangeBrightness.addEventListener('input', (e) => valBrightness.innerText = e.target.value + '%');
rangeContrast.addEventListener('input', (e) => valContrast.innerText = e.target.value + '%');
function setSticker(text) { document.getElementById('stickerText').value = text; }

function togglePolaroid() {
    // Verificamos si existe el checkPola antes de usarlo
    const checkPola = document.getElementById('checkPola');
    if (!checkPola) return; 
    
    const isPola = checkPola.checked;
    const socialMode = document.getElementById('socialMode');
    
    if(isPola) { 
        socialMode.value = "none"; 
        socialMode.disabled = true; 
    } else { 
        socialMode.disabled = false; 
    }
}

inputImages.addEventListener('change', function() { 
    const count = this.files.length; 
    countLabel.innerText = count > 0 ? `✅ ${count} imágenes seleccionadas` : 'No has seleccionado imágenes'; 
    aiStatus.innerText = ""; 
});

function loadImage(file) { 
    return new Promise((resolve, reject) => { 
        const reader = new FileReader(); 
        reader.onload = (e) => { 
            const img = new Image(); 
            img.onload = () => resolve(img); 
            img.onerror = reject; 
            img.src = e.target.result; 
        }; 
        reader.readAsDataURL(file); 
    }); 
}

// 🧠 IA AUTO FIX
async function runAutoFix() {
    if (inputImages.files.length === 0) { alert("¡Sube fotos primero!"); return; }
    aiStatus.innerText = "🤖 Analizando...";
    try {
        const img = await loadImage(inputImages.files[0]);
        const canvas = document.createElement('canvas'); canvas.width = 500; canvas.height = 500;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 500, 500);
        const data = ctx.getImageData(0, 0, 500, 500).data;
        let total = 0; 
        for (let i = 0; i < data.length; i += 4) total += Math.floor((data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114));
        const avg = total / (data.length / 4);
        
        let newB = 100; let newC = 100;
        if (avg < 100) { newB = 100 + (128-avg)*0.8; aiStatus.innerText = "✨ Foto oscura. Aclarando..."; }
        else if (avg > 180) { newB = 100 - (avg-160)*0.5; aiStatus.innerText = "✨ Foto clara. Ajustando..."; }
        else { newC = 110; aiStatus.innerText = "✨ Luz correcta. Mejorando contraste."; }
        
        rangeBrightness.value = Math.min(150, Math.max(50, Math.round(newB)));
        rangeContrast.value = Math.min(150, Math.max(50, Math.round(newC)));
        valBrightness.innerText = rangeBrightness.value + "%"; 
        valContrast.innerText = rangeContrast.value + "%";
    } catch (e) { console.error(e); }
}

// 🎨 PALETA DE COLORES
function getDominantColors(img, count=5) {
    const canvas = document.createElement('canvas');
    canvas.width = 100; canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 100, 100);
    const data = ctx.getImageData(0, 0, 100, 100).data;
    const colorCounts = {};
    for (let i = 0; i < data.length; i += 40) { 
        const r = data[i], g = data[i+1], b = data[i+2];
        const rgb = `${r},${g},${b}`;
        colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
    }
    let sorted = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
    const finalColors = [];
    const threshold = 40; 
    for (let color of sorted) {
        if (finalColors.length >= count) break;
        const [r,g,b] = color.split(',').map(Number);
        let isDistinct = true;
        for (let existing of finalColors) {
            const [er,eg,eb] = existing.split(',').map(Number);
            if (Math.sqrt((r-er)**2 + (g-eg)**2 + (b-eb)**2) < threshold) { isDistinct = false; break; }
        }
        if (isDistinct) finalColors.push(color);
    }
    return finalColors.map(c => {
        const [r,g,b] = c.split(',').map(Number);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    });
}

// 🖌️ GENERADOR MAESTRO (CORREGIDO)
async function generateImageCanvas(img, logoImg) {
    // 1. RECOLECTAR VALORES (Con seguridad para evitar el error NULL)
    const inputW = document.getElementById('inputWidth');
    const widthReq = inputW ? (parseInt(inputW.value) || 0) : 0;
    
    const inputH = document.getElementById('inputHeight');
    const heightReq = inputH ? (parseInt(inputH.value) || 0) : 0;
    
    const checkR = document.getElementById('checkRatio');
    const keepRatio = checkR ? checkR.checked : true;

    const brightnessVal = rangeBrightness.value;
    const contrastVal = rangeContrast.value;
    const filterVal = document.getElementById('selectFilter').value;
    const socialMode = document.getElementById('socialMode').value;
    const borderWidth = parseInt(document.getElementById('borderWidth').value) || 0;
    const borderColor = document.getElementById('borderColor').value;
    
    // Sticker
    const stickerText = document.getElementById('stickerText').value.toUpperCase().trim();
    const stickerColor = document.getElementById('stickerColor').value;
    const stickerTextColor = "#ffffff"; // Valor por defecto
    const stickerPos = document.getElementById('stickerPos').value;
    
    // CORRECCIÓN PRINCIPAL AQUÍ:
    // Ya no pedimos 'catContact', 'catBgColor', ni 'catTextColor' porque no existen en el HTML
    const catProductInput = document.getElementById('catProduct');
    const catPriceInput = document.getElementById('catPrice');
    const catProduct = catProductInput ? catProductInput.value.trim() : "";
    const catPrice = catPriceInput ? catPriceInput.value.trim() : "";
    
    // Colores por defecto elegantes para el catálogo
    const catBgColor = "#2c3e50"; // Azul oscuro elegante
    const catTextColor = "#ffffff"; // Blanco

    // Extras
    const checkPola = document.getElementById('checkPola');
    const isPola = checkPola ? checkPola.checked : false;
    
    const polaTextInput = document.getElementById('polaText');
    const polaText = polaTextInput ? polaTextInput.value.trim() : "";
    
    // Paleta (verificamos si existe el checkbox, si no, es falso)
    const checkPalette = document.getElementById('checkPalette');
    const usePalette = checkPalette ? checkPalette.checked : false;
    
    // 2. CÁLCULOS DE TAMAÑO
    let baseW, baseH;
    if (isPola) { 
        let w = widthReq > 0 ? widthReq : 1080; 
        baseW = w; 
        baseH = Math.round(img.height * (w / img.width)); 
    } else {
        if (socialMode === 'square') { let w = widthReq>0?widthReq:img.width; baseW=w; baseH=w; }
        else if (socialMode === 'story') { let w = widthReq>0?widthReq:img.width; baseW=w; baseH=Math.round(w*(16/9)); }
        else {
            if (widthReq>0 || heightReq>0) {
                if (keepRatio) {
                    if (widthReq>0 && heightReq===0) { baseW=widthReq; baseH=Math.round(img.height*(widthReq/img.width)); }
                    else if (heightReq>0 && widthReq===0) { baseH=heightReq; baseW=Math.round(img.width*(heightReq/img.height)); }
                    else { const r=Math.min(widthReq/img.width, heightReq/img.height); baseW=Math.round(img.width*r); baseH=Math.round(img.height*r); }
                } else { baseW=widthReq||img.width; baseH=heightReq||img.height; }
            } else { baseW=img.width; baseH=img.height; }
        }
    }

    // 3. ALTURAS EXTRA
    let footerH = 0;
    if (!isPola && (catProduct || catPrice)) { 
        footerH += Math.round(baseW * 0.15); 
    }
    let paletteH = 0;
    if (usePalette) { 
        paletteH = Math.round(baseW * 0.12); 
        footerH += paletteH; 
    }

    let polaTop=0, polaSide=0, polaBottom=0;
    if (isPola) {
        polaSide = Math.round(baseW * 0.08); 
        polaTop = Math.round(baseW * 0.08); 
        polaBottom = Math.round(baseW * 0.25);
    }

    let canvasW = isPola ? baseW + (polaSide * 2) : baseW;
    let canvasH = isPola ? (baseH + polaTop + polaBottom + footerH) : (baseH + footerH);

    const canvas = document.createElement('canvas'); canvas.width = canvasW; canvas.height = canvasH;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = "white"; ctx.fillRect(0,0, canvasW, canvasH);
    if(isPola){ ctx.strokeStyle="#e0e0e0"; ctx.lineWidth=1; ctx.strokeRect(0,0,canvasW,canvasH-footerH); }

    let imgX=0, imgY=0, imgW=baseW, imgH=baseH;
    if (isPola) { imgX=polaSide; imgY=polaTop; }

    ctx.save(); ctx.beginPath(); ctx.rect(imgX, imgY, imgW, imgH); ctx.clip();
    
    if (!isPola && socialMode !== 'none') {
        ctx.save();
        let bgF = `blur(20px) brightness(${brightnessVal}%) contrast(${contrastVal}%)`;
        if (filterVal !== 'none') bgF += ` ${filterVal}`;
        ctx.filter = bgF; ctx.drawImage(img, imgX-20, imgY-20, imgW+40, imgH+40); ctx.restore();
        
        let dW, dH, dX, dY; const rC = imgW/imgH; const rI = img.width/img.height;
        if (rI > rC) { dW=imgW; dH=imgW/rI; } else { dH=imgH; dW=imgH*rI; }
        dX = imgX + (imgW-dW)/2; dY = imgY + (imgH-dH)/2;
        let fgF = `brightness(${brightnessVal}%) contrast(${contrastVal}%)`;
        if (filterVal !== 'none') fgF += ` ${filterVal}`;
        ctx.filter = fgF; ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=20; ctx.shadowOffsetY=10;
        ctx.drawImage(img, dX, dY, dW, dH);
    } else {
        let fgF = `brightness(${brightnessVal}%) contrast(${contrastVal}%)`;
        if (filterVal !== 'none') fgF += ` ${filterVal}`;
        ctx.filter = fgF; ctx.drawImage(img, imgX, imgY, imgW, imgH);
    }
    ctx.restore();

    if (!isPola && borderWidth>0) { ctx.strokeStyle=borderColor; ctx.lineWidth=borderWidth*2; ctx.strokeRect(0,0,baseW,baseH); }

    // POLAROID TEXT
    if (isPola && polaText) {
        ctx.font = `700 ${Math.round(polaBottom * 0.4)}px 'Dancing Script', cursive`;
        ctx.fillStyle = "#333"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        let polaTextY = baseH + polaTop + (polaBottom / 2);
        ctx.fillText(polaText, canvasW / 2, polaTextY);
    }

    // FOOTER (Catálogo + Paleta)
    let currentFooterY = isPola ? (baseH + polaTop + polaBottom) : baseH;

    if (!isPola && (catProduct || catPrice)) {
        const catH = Math.round(baseW * 0.15);
        ctx.fillStyle = catBgColor; ctx.fillRect(0, currentFooterY, baseW, catH);
        ctx.fillStyle = catTextColor; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        let fs1 = Math.round(catH*0.35); ctx.font = `bold ${fs1}px Arial`;
        let textY1 = currentFooterY + (catH * 0.35);
        if(catProduct) ctx.fillText(catProduct.toUpperCase(), baseW/2, textY1);
        
        let fs2 = Math.round(catH*0.25); ctx.font = `${fs2}px Arial`;
        let textY2 = currentFooterY + (catH * 0.75);
        ctx.fillText(catPrice, baseW/2, textY2);
        
        currentFooterY += catH;
    }

    // PALETA
    if (usePalette) {
        const colors = getDominantColors(img, 5);
        ctx.fillStyle = "#ffffff"; 
        ctx.fillRect(0, currentFooterY, canvasW, paletteH);
        
        const circleSize = Math.round(paletteH * 0.5);
        const gap = Math.round(circleSize * 0.5);
        const totalW = (colors.length * circleSize) + ((colors.length-1)*gap);
        let startX = (canvasW - totalW) / 2;
        let centerY = currentFooterY + (paletteH / 2);
        
        ctx.font = `bold ${Math.round(paletteH*0.15)}px Arial`;
        ctx.textAlign = "center"; ctx.textBaseline = "top";

        colors.forEach(c => {
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(startX + circleSize/2, centerY - 5, circleSize/2, 0, Math.PI*2);
            ctx.fillStyle = c; ctx.fill(); ctx.restore();
            ctx.fillStyle = "#666"; ctx.fillText(c, startX + circleSize/2, centerY + circleSize/2 + 2);
            startX += circleSize + gap;
        });
    }

    // LOGO
    if (logoImg) {
        const lr = logoImg.width/logoImg.height; let lw = canvasW*0.20; let lh = lw/lr;
        const pad = (canvasW*0.05) + borderWidth; const pos = document.getElementById('logoPos').value;
        let lx=0, ly=0;
        let bottomLimit = isPola ? (baseH + polaTop - lh - 10) : (baseH - lh - pad);
        
        if (pos==="bottom-right") { lx=canvasW-lw-pad; ly=bottomLimit; }
        else if (pos==="center") { lx=(canvasW-lw)/2; ly=(canvasH - footerH)/2 - lh/2; } 
        
        ctx.save();
        if (document.getElementById('checkRoundLogo').checked) {
            ctx.beginPath(); ctx.arc(lx+lw/2, ly+lh/2, Math.min(lw,lh)/2, 0, Math.PI*2); ctx.closePath(); ctx.clip();
        }
        ctx.drawImage(logoImg, lx, ly, lw, lh); ctx.restore();
    }

    // STICKER
    if (stickerText) {
        ctx.save();
        const rh = canvasW*0.08; ctx.font=`bold ${Math.round(canvasW*0.04)}px Arial`;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        const sP = document.getElementById('stickerPos').value;
        const sC = document.getElementById('stickerColor').value;
        
        let refW = canvasW; 
        if (sP.includes('top')) {
            let ang = sP==='top-left'?-45:45; let ox=sP==='top-left'?0:refW;
            ctx.translate(ox,0); ctx.rotate(ang*Math.PI/180);
            ctx.fillStyle=sC; ctx.shadowColor="rgba(0,0,0,0.3)"; ctx.shadowBlur=5;
            ctx.fillRect(-refW, refW*0.15, refW*2, rh);
            ctx.shadowBlur=0; ctx.fillStyle="#ffffff"; ctx.fillText(stickerText, 0, (refW*0.15)+(rh/2));
        }
        ctx.restore();
    }

    return canvas;
}

// BOTONES
async function processImages() {
    if (inputImages.files.length===0) return alert("¡Sube fotos!");
    toggleBtns(true); statusText.innerText="Preparando...";
    let logo=null; if(inputLogo.files[0]) logo=await loadImage(inputLogo.files[0]);
    const zip=new JSZip(); const base=document.getElementById('inputBaseName').value.trim();
    for(let i=0; i<inputImages.files.length; i++){
        updProg(i, inputImages.files.length);
        const c=await generateImageCanvas(await loadImage(inputImages.files[i]), logo);
        zip.file(base?`${base}_${i+1}.jpg`:`${inputImages.files[i].name.split('.')[0]}_edit.jpg`, await new Promise(r=>c.toBlob(r,"image/jpeg",0.95)));
    }
    statusText.innerText="ZIP Listo"; zip.generateAsync({type:"blob"}).then(b=>{saveAs(b,"fotos_elsolar.zip"); resetUI();});
}
async function createGif() {
    if (inputImages.files.length===0) return alert("¡Sube fotos!");
    toggleBtns(true); statusText.innerText="GIF...";
    let logo=null; if(inputLogo.files[0]) logo=await loadImage(inputLogo.files[0]);
    const f=[]; for(let i=0; i<inputImages.files.length; i++){ updProg(i, inputImages.files.length); const c=await generateImageCanvas(await loadImage(inputImages.files[i]), logo); f.push(c.toDataURL("image/jpeg",0.9)); }
    const tC=await generateImageCanvas(await loadImage(inputImages.files[0]), null);
    gifshot.createGIF({images:f, gifWidth:tC.width, gifHeight:tC.height, interval:parseFloat(document.getElementById('gifInterval').value)||0.5}, o=>{if(!o.error){saveAs(dataURItoBlob(o.image),"animacion.gif");resetUI();} });
}
async function createCollage() {
    if (inputImages.files.length===0) return alert("¡Sube fotos!");
    toggleBtns(true); statusText.innerText="Collage...";
    let logo=null; if(inputLogo.files[0]) logo=await loadImage(inputLogo.files[0]);
    const cs=[]; let th=0; let mw=0; const gap=parseInt(document.getElementById('collageGap').value)||0;
    for(let i=0; i<inputImages.files.length; i++){ updProg(i, inputImages.files.length); const c=await generateImageCanvas(await loadImage(inputImages.files[i]), logo); cs.push(c); th+=c.height; if(c.width>mw) mw=c.width; }
    th+=(cs.length-1)*gap; const m=document.createElement('canvas'); m.width=mw; m.height=th; const x=m.getContext('2d'); x.fillStyle="white"; x.fillRect(0,0,mw,th); let cy=0;
    for(let c of cs){ x.drawImage(c,(mw-c.width)/2,cy); cy+=c.height+gap; }
    m.toBlob(b=>{saveAs(b,"collage_tira.jpg"); resetUI();},"image/jpeg",0.95);
}
async function createGrid() {
    if (inputImages.files.length === 0) return alert("¡Sube fotos!");
    toggleBtns(true); statusText.innerText="Creando Mosaico...";
    let logo=null; if(inputLogo.files[0]) logo=await loadImage(inputLogo.files[0]);
    const count = inputImages.files.length; const canvases = [];
    const gap = parseInt(document.getElementById('gridGap').value)||0;
    const originalSocialMode = document.getElementById('socialMode').value;
    document.getElementById('socialMode').value = "square"; 
    for(let i=0; i<count; i++){
        updProg(i, count);
        const img = await loadImage(inputImages.files[i]);
        const c = await generateImageCanvas(img, null);
        canvases.push(c);
    }
    document.getElementById('socialMode').value = originalSocialMode;
    let cols, rows;
    if (count === 2) { cols=2; rows=1; } else if (count <= 4) { cols=2; rows=2; } else { cols=3; rows=Math.ceil(count/3); }
    const cellW = canvases[0].width; const cellH = canvases[0].height;
    const masterW = (cellW * cols) + (gap * (cols-1)); const masterH = (cellH * rows) + (gap * (rows-1));
    const m = document.createElement('canvas'); m.width = masterW; m.height = masterH;
    const ctx = m.getContext('2d'); ctx.fillStyle="white"; ctx.fillRect(0,0, masterW, masterH);
    let idx = 0;
    for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
            if (idx < canvases.length) {
                let x = c * (cellW + gap); let y = r * (cellH + gap);
                ctx.drawImage(canvases[idx], x, y, cellW, cellH); idx++;
            }
        }
    }
    if (logo) {
        const lr = logo.width/logo.height; let lw = masterW*0.15; let lh = lw/lr;
        let lx = (masterW-lw)/2; let ly = (masterH-lh)/2;
        ctx.save();
        if (document.getElementById('checkRoundLogo').checked) {
             ctx.beginPath(); ctx.arc(lx+lw/2, ly+lh/2, Math.min(lw,lh)/2, 0, Math.PI*2); ctx.closePath(); ctx.clip();
        }
        ctx.drawImage(logo, lx, ly, lw, lh); ctx.restore();
    }
    m.toBlob(b=>{saveAs(b,"mosaico_grilla.jpg"); resetUI("¡Mosaico Listo!");},"image/jpeg",0.95);
}
function toggleBtns(d){btnProcess.disabled=d;btnGif.disabled=d;btnCollage.disabled=d;btnGrid.disabled=d;}
function updProg(i,t){const p=Math.round((i/t)*100); progressBar.style.width=p+"%";}
function resetUI(msg){if(msg)statusText.innerText=msg; setTimeout(()=>{toggleBtns(false);progressBar.style.width="0%";statusText.innerText="";},3000);}
function dataURItoBlob(d){const b=atob(d.split(',')[1]); const a=new Uint8Array(b.length); for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i); return new Blob([a],{type:'image/gif'});}