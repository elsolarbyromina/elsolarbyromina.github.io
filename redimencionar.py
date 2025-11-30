import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageOps, ImageTk, ImageDraw # Agregamos ImageDraw para el recorte
import os

class ImageToolApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Herramientas Romina v5 - Con Recorte Circular")
        self.root.geometry("600x720") # Un poco más alto
        self.root.resizable(False, False)

        # --- Estilos ---
        style = ttk.Style()
        style.configure("Big.TButton", font=("Helvetica", 11, "bold"))
        style.configure("Title.TLabel", font=("Helvetica", 10, "bold"))

        # --- PESTAÑAS ---
        self.notebook = ttk.Notebook(root)
        self.notebook.pack(expand=True, fill="both", padx=5, pady=5)

        self.tab_resize = ttk.Frame(self.notebook)
        self.tab_rename = ttk.Frame(self.notebook)

        self.notebook.add(self.tab_resize, text=" 📐 Redimensionar y Marca de Agua ")
        self.notebook.add(self.tab_rename, text=" 🏷️ Cambiar Nombres ")

        self.init_resize_tool(self.tab_resize)
        self.init_rename_tool(self.tab_rename)

    # ====================================================================
    #           PESTAÑA 1: REDIMENSIONAR + MARCA DE AGUA
    # ====================================================================
    def init_resize_tool(self, parent):
        # Variables
        self.source_dir = tk.StringVar()
        self.dest_dir = tk.StringVar()
        self.target_format = tk.StringVar(value="JPG")
        self.keep_aspect_ratio = tk.BooleanVar(value=True)
        self.watermark_path = tk.StringVar()
        self.watermark_position = tk.StringVar(value="Abajo Derecha")
        
        # NUEVA VARIABLE PARA EL RECORTE
        self.round_watermark = tk.BooleanVar(value=False)

        # 1. Ubicaciones
        frame_folders = ttk.LabelFrame(parent, text="1. Ubicaciones", padding=10)
        frame_folders.pack(fill="x", padx=10, pady=5)

        ttk.Label(frame_folders, text="Origen:").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame_folders, textvariable=self.source_dir, width=45).grid(row=0, column=1, padx=5)
        ttk.Button(frame_folders, text="📂", width=4, command=lambda: self.select_folder(self.source_dir)).grid(row=0, column=2)

        ttk.Label(frame_folders, text="Destino:").grid(row=1, column=0, sticky="w", pady=5)
        ttk.Entry(frame_folders, textvariable=self.dest_dir, width=45).grid(row=1, column=1, padx=5, pady=5)
        ttk.Button(frame_folders, text="📂", width=4, command=lambda: self.select_folder(self.dest_dir)).grid(row=1, column=2, pady=5)

        # 2. Tamaño
        frame_size = ttk.LabelFrame(parent, text="2. Configuración de Tamaño", padding=10)
        frame_size.pack(fill="x", padx=10, pady=5)

        ttk.Label(frame_size, text="Ancho (px):").grid(row=0, column=0, sticky="w")
        self.entry_width = ttk.Entry(frame_size, width=12)
        self.entry_width.grid(row=0, column=1, padx=5)

        ttk.Label(frame_size, text="Alto (px):").grid(row=0, column=2, sticky="w", padx=10)
        self.entry_height = ttk.Entry(frame_size, width=12)
        self.entry_height.grid(row=0, column=3, padx=5)

        ttk.Checkbutton(frame_size, text="Mantener proporción (Automático)", 
                        variable=self.keep_aspect_ratio).grid(row=1, column=0, columnspan=4, sticky="w", pady=(10,0))

        # 3. Marca de Agua
        frame_watermark = ttk.LabelFrame(parent, text="3. Marca de Agua", padding=10)
        frame_watermark.pack(fill="x", padx=10, pady=5)

        ttk.Label(frame_watermark, text="Logo:").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame_watermark, textvariable=self.watermark_path, width=45).grid(row=0, column=1, padx=5)
        ttk.Button(frame_watermark, text="📂", width=4, command=self.select_watermark).grid(row=0, column=2)

        ttk.Label(frame_watermark, text="Posición:").grid(row=1, column=0, sticky="w", pady=5)
        self.combo_pos = ttk.Combobox(frame_watermark, values=["Abajo Derecha", "Abajo Izquierda", "Arriba Derecha", "Arriba Izquierda", "Centro"], 
                                      state="readonly", textvariable=self.watermark_position, width=15)
        self.combo_pos.grid(row=1, column=1, sticky="w", padx=5, pady=5)

        # --- NUEVO CHECKBOX ---
        ttk.Checkbutton(frame_watermark, text="✂️ Recortar logo en forma redonda (Automático)", 
                        variable=self.round_watermark).grid(row=2, column=0, columnspan=3, sticky="w", pady=(10,0))


        # 4. Formato y Botones
        frame_action = ttk.Frame(parent, padding=10)
        frame_action.pack(fill="x", padx=10)
        
        ttk.Label(frame_action, text="Formato Salida:").pack(anchor="w")
        self.combo_format = ttk.Combobox(frame_action, values=["JPG", "PNG", "WEBP"], state="readonly", textvariable=self.target_format)
        self.combo_format.pack(fill="x", pady=5)
        self.combo_format.current(0)

        ttk.Button(frame_action, text="👁️ PREVISUALIZAR", command=self.preview_image).pack(pady=(10, 5), fill="x")
        ttk.Button(frame_action, text="⚡ PROCESAR LOTE", style="Big.TButton", command=self.process_images).pack(pady=5, fill="x", ipady=5)
        
        self.lbl_status_resize = ttk.Label(parent, text="Esperando...", foreground="gray")
        self.lbl_status_resize.pack(pady=5)

    # ====================================================================
    #           PESTAÑA 2: RENOMBRAR (Igual a V4)
    # ====================================================================
    def init_rename_tool(self, parent):
        self.rename_dir = tk.StringVar()
        self.base_name = tk.StringVar()
        
        frame_sel = ttk.LabelFrame(parent, text="1. Seleccionar Carpeta", padding=20)
        frame_sel.pack(fill="x", padx=20, pady=20)
        input_frame = ttk.Frame(frame_sel)
        input_frame.pack(fill="x", pady=5)
        ttk.Entry(input_frame, textvariable=self.rename_dir).pack(side="left", fill="x", expand=True, padx=(0,5))
        ttk.Button(input_frame, text="📂 Buscar", command=lambda: self.select_folder(self.rename_dir)).pack(side="right")

        frame_conf = ttk.LabelFrame(parent, text="2. Nuevo Nombre", padding=20)
        frame_conf.pack(fill="x", padx=20, pady=10)
        ttk.Label(frame_conf, text="Nombre base:").pack(anchor="w")
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
        except ValueError:
            return -1, -1

    # ====================================================================
    #           LÓGICA DE PROCESAMIENTO (¡AQUÍ ESTÁ LA MAGIA!)
    # ====================================================================
    def process_single_image_in_memory(self, img_path, w_req, h_req, watermark_img, position_str):
        with Image.open(img_path) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode != 'RGBA': img = img.convert('RGBA')

            # 1. Redimensionar foto principal
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

            # 2. Aplicar Marca de Agua
            if watermark_img:
                wm_copy = watermark_img.copy()

                # --- LÓGICA DE RECORTE CIRCULAR (NUEVO) ---
                if self.round_watermark.get():
                    # a. Convertir a RGBA para tener transparencia
                    wm_copy = wm_copy.convert("RGBA")
                    
                    # b. Hacerla cuadrada (recorta lo que sobre de los lados para centrar)
                    min_side = min(wm_copy.size)
                    wm_copy = ImageOps.fit(wm_copy, (min_side, min_side), centering=(0.5, 0.5))
                    
                    # c. Crear máscara circular
                    mask = Image.new('L', (min_side, min_side), 0)
                    draw = ImageDraw.Draw(mask)
                    draw.ellipse((0, 0, min_side, min_side), fill=255)
                    
                    # d. Aplicar la máscara al canal alfa de la imagen
                    # Esto hace transparente todo lo que esté fuera del círculo blanco
                    wm_copy.putalpha(mask)
                # ------------------------------------------

                # Redimensionar el logo (proporcional al 20% de la foto)
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
        if wm_path and os.path.exists(wm_path): 
            # Cargamos la imagen original, el recorte se hace en memoria después
            watermark_img = Image.open(wm_path)

        try:
            final_img = self.process_single_image_in_memory(os.path.join(src, files[0]), w_req, h_req, watermark_img, self.watermark_position.get())
            
            display = final_img.copy()
            display.thumbnail((800, 600))
            
            top = tk.Toplevel(self.root)
            top.title(f"Vista Previa: {files[0]}")
            tk_img = ImageTk.PhotoImage(display)
            lbl = tk.Label(top, image=tk_img)
            lbl.image = tk_img
            lbl.pack(padx=10, pady=10)
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def process_images(self):
        src = self.source_dir.get()
        dst = self.dest_dir.get()
        fmt = self.target_format.get().lower()
        if "jpg" in fmt: fmt = "jpg"
        elif "png" in fmt: fmt = "png"
        else: fmt = "webp"
        
        wm_path = self.watermark_path.get()
        w_req, h_req = self.get_dimensions()

        if not src or not dst: messagebox.showwarning("Falta datos", "Revisa las carpetas."); return
        
        watermark_img = None
        if wm_path and os.path.exists(wm_path): 
            watermark_img = Image.open(wm_path)
        
        valid = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
        files = [f for f in os.listdir(src) if f.lower().endswith(valid)]
        
        count = 0
        self.lbl_status_resize.config(foreground="blue")
        for i, filename in enumerate(files):
            try:
                self.lbl_status_resize.config(text=f"Procesando {i+1}/{len(files)}...")
                self.root.update()
                final = self.process_single_image_in_memory(os.path.join(src, filename), w_req, h_req, watermark_img, self.watermark_position.get())
                
                name_only = os.path.splitext(filename)[0]
                save_path = os.path.join(dst, f"{name_only}.{fmt}")
                
                if fmt == "jpg":
                    bg = Image.new("RGB", final.size, (255, 255, 255))
                    bg.paste(final, mask=final.split()[3])
                    bg.save(save_path, quality=95, optimize=True)
                elif fmt == "webp":
                    final.save(save_path, quality=95, method=6)
                else:
                    final.save(save_path, optimize=True)
                count += 1
            except Exception as e: print(e)
            
        messagebox.showinfo("Éxito", f"Se procesaron {count} imágenes.")
        self.lbl_status_resize.config(text="Listo.", foreground="green")

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