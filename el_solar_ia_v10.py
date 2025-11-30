import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageOps, ImageDraw, ImageTk
import os
import io

# INTENTAR IMPORTAR LA LIBRERÍA DE IA
AI_AVAILABLE = False
try:
    from rembg import remove
    AI_AVAILABLE = True
    print("✅ Librería de IA 'rembg' detectada correctamente.")
except ImportError:
    print("❌ No se encontró 'rembg'. La función de quitar fondo no estará disponible.")
    print("   Para activarla, instala: pip install rembg[cli] onnxruntime")

class ImageToolApp:
    def __init__(self, root):
        self.root = root
        self.root.title("El Solar STUDIO IA - Romina v10 (Escritorio)")
        self.root.geometry("650x750")
        # self.root.resizable(False, False) # Permitir redimensionar por si acaso

        # --- Estilos ---
        style = ttk.Style()
        style.configure("Big.TButton", font=("Helvetica", 11, "bold"))
        style.configure("Title.TLabel", font=("Helvetica", 10, "bold"))
        style.configure("AITitle.TLabel", font=("Helvetica", 10, "bold"), foreground="#6c3483") # Color violeta para IA

        # --- PESTAÑAS ---
        self.notebook = ttk.Notebook(root)
        self.notebook.pack(expand=True, fill="both", padx=5, pady=5)

        self.tab_resize = ttk.Frame(self.notebook)
        self.tab_rename = ttk.Frame(self.notebook)

        self.notebook.add(self.tab_resize, text=" 📐 Editor Pro + IA ")
        self.notebook.add(self.tab_rename, text=" 🏷️ Renombrar Lote ")

        self.init_resize_tool(self.tab_resize)
        self.init_rename_tool(self.tab_rename)
        
        if not AI_AVAILABLE:
            messagebox.showwarning("IA No Disponible", "No se ha instalado la librería 'rembg'.\nLa función de quitar fondo estará desactivada.\n\nInstala con: pip install rembg[cli] onnxruntime")

    # ====================================================================
    #           PESTAÑA 1: EDITOR PRO + IA
    # ====================================================================
    def init_resize_tool(self, parent):
        # Variables
        self.source_dir = tk.StringVar()
        self.dest_dir = tk.StringVar()
        self.target_format = tk.StringVar(value="PNG") # PNG por defecto para transparencia
        self.keep_aspect_ratio = tk.BooleanVar(value=True)
        self.watermark_path = tk.StringVar()
        self.watermark_position = tk.StringVar(value="Abajo Derecha")
        self.round_watermark = tk.BooleanVar(value=False)
        # NUEVA VARIABLE IA
        self.remove_bg = tk.BooleanVar(value=False)

        # Marco Principal con Scroll (por si la pantalla es chica)
        main_canvas = tk.Canvas(parent)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=main_canvas.yview)
        scrollable_frame = ttk.Frame(main_canvas)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: main_canvas.configure(scrollregion=main_canvas.bbox("all"))
        )

        main_canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        main_canvas.configure(yscrollcommand=scrollbar.set)

        main_canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # CONTENIDO DEL FRAME SCROLLABLE
        pad_x = 10; pad_y = 5

        # 1. Ubicaciones
        frame_folders = ttk.LabelFrame(scrollable_frame, text="1. Ubicaciones", padding=10)
        frame_folders.pack(fill="x", padx=pad_x, pady=pad_y)

        ttk.Label(frame_folders, text="Origen:").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame_folders, textvariable=self.source_dir, width=45).grid(row=0, column=1, padx=5)
        ttk.Button(frame_folders, text="📂", width=4, command=lambda: self.select_folder(self.source_dir)).grid(row=0, column=2)

        ttk.Label(frame_folders, text="Destino:").grid(row=1, column=0, sticky="w", pady=5)
        ttk.Entry(frame_folders, textvariable=self.dest_dir, width=45).grid(row=1, column=1, padx=5, pady=5)
        ttk.Button(frame_folders, text="📂", width=4, command=lambda: self.select_folder(self.dest_dir)).grid(row=1, column=2, pady=5)

        # NUEVA SECCIÓN: INTELIGENCIA ARTIFICIAL
        frame_ai = ttk.LabelFrame(scrollable_frame, text="🧠 Inteligencia Artificial (Nuevo)", padding=10)
        frame_ai.pack(fill="x", padx=pad_x, pady=pad_y)
        
        ai_check = ttk.Checkbutton(frame_ai, text="✂️ Quitar fondo automáticamente (Hacer transparente)", 
                        variable=self.remove_bg, style="AITitle.TLabel")
        ai_check.pack(anchor="w")
        
        if not AI_AVAILABLE:
            ai_check.config(state="disabled")
            ttk.Label(frame_ai, text="(Librería 'rembg' no instalada)", foreground="red", font=("Arial", 8)).pack(anchor="w")
        else:
             ttk.Label(frame_ai, text="(El proceso será más lento la primera vez)", foreground="gray", font=("Arial", 8, "italic")).pack(anchor="w")


        # 2. Tamaño
        frame_size = ttk.LabelFrame(scrollable_frame, text="2. Configuración de Tamaño", padding=10)
        frame_size.pack(fill="x", padx=pad_x, pady=pad_y)

        ttk.Label(frame_size, text="Ancho (px):").grid(row=0, column=0, sticky="w")
        self.entry_width = ttk.Entry(frame_size, width=12)
        self.entry_width.grid(row=0, column=1, padx=5)

        ttk.Label(frame_size, text="Alto (px):").grid(row=0, column=2, sticky="w", padx=10)
        self.entry_height = ttk.Entry(frame_size, width=12)
        self.entry_height.grid(row=0, column=3, padx=5)

        ttk.Checkbutton(frame_size, text="Mantener proporción (Automático)", 
                        variable=self.keep_aspect_ratio).grid(row=1, column=0, columnspan=4, sticky="w", pady=(10,0))

        # 3. Marca de Agua
        frame_watermark = ttk.LabelFrame(scrollable_frame, text="3. Marca de Agua", padding=10)
        frame_watermark.pack(fill="x", padx=pad_x, pady=pad_y)

        ttk.Label(frame_watermark, text="Logo:").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame_watermark, textvariable=self.watermark_path, width=45).grid(row=0, column=1, padx=5)
        ttk.Button(frame_watermark, text="📂", width=4, command=self.select_watermark).grid(row=0, column=2)

        ttk.Label(frame_watermark, text="Posición:").grid(row=1, column=0, sticky="w", pady=5)
        self.combo_pos = ttk.Combobox(frame_watermark, values=["Abajo Derecha", "Abajo Izquierda", "Arriba Derecha", "Arriba Izquierda", "Centro"], 
                                      state="readonly", textvariable=self.watermark_position, width=15)
        self.combo_pos.grid(row=1, column=1, sticky="w", padx=5, pady=5)

        ttk.Checkbutton(frame_watermark, text="✂️ Recortar logo en forma redonda", 
                        variable=self.round_watermark).grid(row=2, column=0, columnspan=3, sticky="w", pady=(10,0))


        # 4. Formato y Botones
        frame_action = ttk.Frame(scrollable_frame, padding=10)
        frame_action.pack(fill="x", padx=pad_x)
        
        ttk.Label(frame_action, text="Formato Salida (Recomendado PNG para fondo transparente):").pack(anchor="w")
        self.combo_format = ttk.Combobox(frame_action, values=["PNG", "JPG", "WEBP"], state="readonly", textvariable=self.target_format)
        self.combo_format.pack(fill="x", pady=5)
        self.combo_format.current(0)

        ttk.Button(frame_action, text="👁️ PREVISUALIZAR (1ª imagen)", command=self.preview_image).pack(pady=(10, 5), fill="x")
        self.btn_process = ttk.Button(frame_action, text="⚡ PROCESAR LOTE COMPLETO ⚡", style="Big.TButton", command=self.process_images)
        self.btn_process.pack(pady=5, fill="x", ipady=5)
        
        self.lbl_status_resize = ttk.Label(scrollable_frame, text="Esperando...", foreground="gray", wraplength=500)
        self.lbl_status_resize.pack(pady=10)

    # ====================================================================
    #           PESTAÑA 2: RENOMBRAR (Igual que antes)
    # ====================================================================
    def init_rename_tool(self, parent):
        self.rename_dir = tk.StringVar()
        self.base_name = tk.StringVar()
        
        frame_sel = ttk.LabelFrame(parent, text="Seleccionar Carpeta", padding=20)
        frame_sel.pack(fill="x", padx=20, pady=20)
        input_frame = ttk.Frame(frame_sel)
        input_frame.pack(fill="x", pady=5)
        ttk.Entry(input_frame, textvariable=self.rename_dir).pack(side="left", fill="x", expand=True, padx=(0,5))
        ttk.Button(input_frame, text="📂 Buscar", command=lambda: self.select_folder(self.rename_dir)).pack(side="right")

        frame_conf = ttk.LabelFrame(parent, text="Nuevo Nombre Base", padding=20)
        frame_conf.pack(fill="x", padx=20, pady=10)
        ttk.Entry(frame_conf, textvariable=self.base_name, font=("Arial", 12)).pack(fill="x", pady=10)

        ttk.Button(parent, text="🏷️ RENOMBRAR ARCHIVOS", style="Big.TButton", 
                   command=self.run_rename).pack(fill="x", padx=20, pady=30, ipady=10)
        self.lbl_status_rename = ttk.Label(parent, text="Listo.", foreground="gray")
        self.lbl_status_rename.pack()

    # ====================================================================
    #           FUNCIONES AUXILIARES
    # ====================================================================
    def select_folder(self, string_var):
        path = filedialog.askdirectory()
        if path: string_var.set(path)
    def select_watermark(self):
        path = filedialog.askopenfilename(filetypes=[("Imágenes", "*.png;*.jpg;*.jpeg")])
        if path: self.watermark_path.set(path)
    def get_dimensions(self):
        try:
            w = int(self.entry_width.get()) if self.entry_width.get() else 0
            h = int(self.entry_height.get()) if self.entry_height.get() else 0
            return w, h
        except ValueError: return -1, -1

    # ====================================================================
    #           LÓGICA CENTRAL (CON IA)
    # ====================================================================
    def process_single_image_in_memory(self, img_path, w_req, h_req, watermark_img, position_str, status_callback=None):
        
        # 1. CARGAR IMAGEN
        with Image.open(img_path) as img:
            img = ImageOps.exif_transpose(img) # Corregir rotación de celular
            
            # --- SECCIÓN IA: QUITAR FONDO ---
            if self.remove_bg.get() and AI_AVAILABLE:
                if status_callback: status_callback("🤖 La IA está quitando el fondo... (Paciencia)")
                # La librería rembg trabaja con bytes, así que convertimos
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()
                
                # MAGIA DE IA AQUI:
                output_bytes = remove(img_bytes)
                
                # Volver a convertir a imagen PIL
                img = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
                if status_callback: status_callback("✅ Fondo quitado. Procesando...")
            # --------------------------------
            
            # Asegurar RGBA para el resto del proceso
            if img.mode != 'RGBA': img = img.convert('RGBA')

            # 2. REDIMENSIONAR
            orig_w, orig_h = img.size
            new_w, new_h = orig_w, orig_h

            if self.keep_aspect_ratio.get():
                if w_req > 0 and h_req == 0:
                    ratio = w_req / orig_w
                    new_w, new_h = w_req, int(orig_h * ratio)
                elif h_req > 0 and w_req == 0:
                    ratio = h_req / orig_h
                    new_w, new_h = int(orig_w * ratio), h_req
                elif w_req > 0 and h_req > 0:
                    img.thumbnail((w_req, h_req), Image.Resampling.LANCZOS)
                    new_w, new_h = img.size
            else:
                new_w = w_req if w_req else orig_w
                new_h = h_req if h_req else orig_h
            
            if img.size != (new_w, new_h):
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # 3. MARCA DE AGUA
            if watermark_img:
                wm_copy = watermark_img.copy()
                # Recorte circular del logo
                if self.round_watermark.get():
                    wm_copy = wm_copy.convert("RGBA")
                    min_side = min(wm_copy.size)
                    wm_copy = ImageOps.fit(wm_copy, (min_side, min_side), centering=(0.5, 0.5))
                    mask = Image.new('L', (min_side, min_side), 0)
                    draw = ImageDraw.Draw(mask)
                    draw.ellipse((0, 0, min_side, min_side), fill=255)
                    wm_copy.putalpha(mask)

                # Redimensionar logo (20% del ancho de la foto)
                wm_ratio = (new_w * 0.20) / wm_copy.width
                wm_w, wm_h = int(new_w * 0.20), int(wm_copy.height * wm_ratio)
                wm_copy = wm_copy.resize((wm_w, wm_h), Image.Resampling.LANCZOS)
                
                padding = int(new_w * 0.05)
                pos_x, pos_y = 0, 0
                if position_str == "Abajo Derecha": pos_x, pos_y = new_w - wm_w - padding, new_h - wm_h - padding
                elif position_str == "Abajo Izquierda": pos_x, pos_y = padding, new_h - wm_h - padding
                elif position_str == "Arriba Derecha": pos_x, pos_y = new_w - wm_w - padding, padding
                elif position_str == "Arriba Izquierda": pos_x, pos_y = padding, padding
                elif position_str == "Centro": pos_x, pos_y = (new_w - wm_w) // 2, (new_h - wm_h) // 2
                
                img.paste(wm_copy, (pos_x, pos_y), wm_copy)
            
            return img

    # ====================================================================
    #           FUNCIONES DE ACCIÓN (PREVIEW Y PROCESAR)
    # ====================================================================
    def update_status(self, text, color="blue"):
        self.lbl_status_resize.config(text=text, foreground=color)
        self.root.update()

    def preview_image(self):
        src = self.source_dir.get()
        wm_path = self.watermark_path.get()
        w_req, h_req = self.get_dimensions()
        
        if not src: messagebox.showwarning("Falta Origen", "Selecciona carpeta de origen."); return
        if w_req == -1: messagebox.showerror("Error", "Dimensiones inválidas."); return
        if w_req == 0 and h_req == 0: messagebox.showerror("Error", "Define al menos ancho o alto."); return

        valid = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
        files = [f for f in os.listdir(src) if f.lower().endswith(valid)]
        if not files: messagebox.showinfo("Info", "Carpeta vacía."); return
        
        watermark_img = None
        if wm_path and os.path.exists(wm_path): watermark_img = Image.open(wm_path)

        self.update_status("Generando previsualización... (Si usas IA, espera un momento)")
        
        try:
            # Procesamos la imagen pasando una función para actualizar el estado
            final_img = self.process_single_image_in_memory(
                os.path.join(src, files[0]), w_req, h_req, watermark_img, 
                self.watermark_position.get(), self.update_status
            )
            
            # Crear ventana de vista previa
            top = tk.Toplevel(self.root)
            top.title(f"Vista Previa: {files[0]}")
            
            # Reducir para mostrar en pantalla si es muy grande
            display_img = final_img.copy()
            display_img.thumbnail((800, 600))
            
            # Si tiene fondo transparente, ponerle un fondo de cuadritos para que se note
            bg = Image.new('RGBA', display_img.size, (255, 255, 255, 255))
            checker = Image.new('RGBA', (20, 20), (200, 200, 200, 255))
            checker_bg = Image.new('RGBA', display_img.size)
            for x in range(0, display_img.width, 20):
                for y in range(0, display_img.height, 20):
                    if (x//20 + y//20) % 2 == 0:
                        checker_bg.paste(checker, (x, y))
            
            bg = Image.alpha_composite(bg, checker_bg)
            final_display = Image.alpha_composite(bg, display_img)
            
            tk_img = ImageTk.PhotoImage(final_display.convert("RGB"))
            lbl = tk.Label(top, image=tk_img)
            lbl.image = tk_img
            lbl.pack(padx=10, pady=10)
            
            self.update_status("Vista previa generada.", "green")

        except Exception as e:
            messagebox.showerror("Error", str(e))
            self.update_status("Error en previsualización.", "red")

    def process_images(self):
        src = self.source_dir.get()
        dst = self.dest_dir.get()
        fmt = self.target_format.get().lower()
        
        wm_path = self.watermark_path.get()
        w_req, h_req = self.get_dimensions()

        if not src or not dst: messagebox.showwarning("Falta datos", "Revisa las carpetas."); return
        
        if self.remove_bg.get() and fmt in ['jpg', 'jpeg']:
             messagebox.showwarning("Atención", "Si quitas el fondo, te recomiendo guardar en PNG.\nEl formato JPG no soporta transparencia y pondrá un fondo blanco.")

        watermark_img = None
        if wm_path and os.path.exists(wm_path): watermark_img = Image.open(wm_path)
        
        valid = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
        files = [f for f in os.listdir(src) if f.lower().endswith(valid)]
        
        count = 0
        self.btn_process.config(state="disabled") # Bloquear botón
        
        for i, filename in enumerate(files):
            try:
                self.update_status(f"Procesando {i+1}/{len(files)}: {filename}...")
                
                final = self.process_single_image_in_memory(
                    os.path.join(src, filename), w_req, h_req, watermark_img, 
                    self.watermark_position.get()
                )
                
                name_only = os.path.splitext(filename)[0]
                save_path = os.path.join(dst, f"{name_only}_ia.{fmt}")
                
                # Guardar según formato
                if fmt in ['jpg', 'jpeg']:
                    # JPG no tiene transparencia, hay que poner fondo blanco
                    bg = Image.new("RGB", final.size, (255, 255, 255))
                    bg.paste(final, mask=final.split()[3])
                    bg.save(save_path, quality=95, optimize=True)
                elif fmt == 'webp':
                    final.save(save_path, quality=95, method=6)
                else:
                    # PNG (ideal para transparencia)
                    final.save(save_path, optimize=True)
                count += 1
            except Exception as e:
                print(f"Error en {filename}: {e}")
        
        self.btn_process.config(state="normal") # Desbloquear botón
        messagebox.showinfo("Éxito", f"Se procesaron {count} imágenes.")
        self.update_status("Proceso completado.", "green")

    # ====================================================================
    #           LÓGICA DE RENOMBRADO (Igual que antes)
    # ====================================================================
    def run_rename(self):
        folder = self.rename_dir.get()
        base_name = self.base_name.get().strip()
        if not folder or not os.path.exists(folder): messagebox.showwarning("Error", "Selecciona una carpeta válida."); return
        if not base_name: messagebox.showwarning("Error", "Debes escribir un nombre base."); return

        confirm = messagebox.askyesno("Confirmar", f"¿Renombrar TODOS los archivos en?\n{folder}")
        if not confirm: return

        valid_ext = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
        files = sorted([f for f in os.listdir(folder) if f.lower().endswith(valid_ext)])

        count = 0
        self.lbl_status_rename.config(text="Renombrando...", foreground="blue")
        for i, filename in enumerate(files, start=1):
            try:
                ext = os.path.splitext(filename)[1]
                new_filename = f"{base_name}_{str(i).zfill(3)}{ext}"
                old_path = os.path.join(folder, filename)
                new_path = os.path.join(folder, new_filename)
                if old_path != new_path:
                    os.rename(old_path, new_path)
                    count += 1
                self.root.update()
            except: pass

        messagebox.showinfo("Finalizado", f"¡Listo! {count} archivos renombrados.")
        self.lbl_status_rename.config(text="Listo.", foreground="green")

if __name__ == "__main__":
    root = tk.Tk()
    app = ImageToolApp(root)
    root.mainloop()