import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

class RenombradorAvanzadoApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Renombrador Pro de Imágenes")
        self.root.geometry("700x550")
        
        # Variables
        self.ruta_carpeta = tk.StringVar()
        self.nombre_base = tk.StringVar()
        self.numero_inicio = tk.IntVar(value=1)
        self.archivos_pendientes = [] # Lista para guardar los cambios calculados

        # --- SECCIÓN 1: Selección de Carpeta ---
        frame_top = tk.LabelFrame(root, text="1. Configuración de Archivos", padx=10, pady=10)
        frame_top.pack(fill="x", padx=15, pady=10)

        # Selector de carpeta
        frame_dir = tk.Frame(frame_top)
        frame_dir.pack(fill="x", pady=5)
        
        tk.Label(frame_dir, text="Carpeta:").pack(side="left")
        entry_ruta = tk.Entry(frame_dir, textvariable=self.ruta_carpeta, state="readonly")
        entry_ruta.pack(side="left", fill="x", expand=True, padx=5)
        btn_buscar = tk.Button(frame_dir, text="📂 Buscar", command=self.seleccionar_carpeta)
        btn_buscar.pack(side="right")

        # --- SECCIÓN 2: Configuración de Nombres ---
        frame_config = tk.Frame(frame_top)
        frame_config.pack(fill="x", pady=10)

        # Nombre Base
        tk.Label(frame_config, text="Nuevo Nombre:").pack(side="left")
        entry_nombre = tk.Entry(frame_config, textvariable=self.nombre_base, width=25)
        entry_nombre.pack(side="left", padx=5)

        # Número de Inicio
        tk.Label(frame_config, text="Empezar en el número:").pack(side="left", padx=(15, 5))
        spin_numero = tk.Spinbox(frame_config, from_=0, to=10000, textvariable=self.numero_inicio, width=5)
        spin_numero.pack(side="left")

        # Botón Generar Vista Previa
        btn_preview = tk.Button(frame_config, text="👁️ Ver Vista Previa", bg="#2196F3", fg="white", command=self.generar_vista_previa)
        btn_preview.pack(side="right", padx=10)

        # --- SECCIÓN 3: Tabla de Vista Previa ---
        frame_lista = tk.LabelFrame(root, text="Vista Previa de Cambios", padx=10, pady=10)
        frame_lista.pack(fill="both", expand=True, padx=15, pady=5)

        # Scrollbar
        scrollbar = tk.Scrollbar(frame_lista)
        scrollbar.pack(side="right", fill="y")

        # Tabla (Treeview)
        columnas = ("original", "nuevo")
        self.tree = ttk.Treeview(frame_lista, columns=columnas, show="headings", yscrollcommand=scrollbar.set)
        self.tree.heading("original", text="Nombre Actual")
        self.tree.heading("nuevo", text="Nombre Nuevo (Simulación)")
        self.tree.column("original", width=300)
        self.tree.column("nuevo", width=300)
        self.tree.pack(fill="both", expand=True)
        
        scrollbar.config(command=self.tree.yview)

        # --- SECCIÓN 4: Botón Final ---
        btn_ejecutar = tk.Button(root, text="✅ APLICAR CAMBIOS AHORA", bg="#4CAF50", fg="white", font=("Arial", 12, "bold"), height=2, command=self.aplicar_cambios)
        btn_ejecutar.pack(fill="x", padx=15, pady=15)

        # Barra de estado
        self.lbl_estado = tk.Label(root, text="Esperando configuración...", bd=1, relief=tk.SUNKEN, anchor="w")
        self.lbl_estado.pack(side="bottom", fill="x")

    def seleccionar_carpeta(self):
        carpeta = filedialog.askdirectory()
        if carpeta:
            self.ruta_carpeta.set(carpeta)
            self.lbl_estado.config(text=f"Carpeta seleccionada: {carpeta}")
            # Limpiar vista previa anterior al cambiar carpeta
            self.limpiar_tabla()

    def limpiar_tabla(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        self.archivos_pendientes = []

    def generar_vista_previa(self):
        """Calcula cómo quedarían los nombres sin cambiar nada físicamente"""
        carpeta = self.ruta_carpeta.get()
        nombre_base = self.nombre_base.get().strip()
        numero_ini = self.numero_inicio.get()

        if not carpeta or not nombre_base:
            messagebox.showwarning("Faltan datos", "Selecciona una carpeta y escribe un nombre base.")
            return

        self.limpiar_tabla()
        extensiones_validas = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp')
        
        try:
            archivos = sorted(os.listdir(carpeta))
            contador = numero_ini
            count_imagenes = 0

            for archivo in archivos:
                nombre_archivo, extension = os.path.splitext(archivo)
                if extension.lower() in extensiones_validas:
                    
                    # Calcular nuevo nombre
                    nuevo_nombre = f"{nombre_base}_{contador}{extension.lower()}"
                    
                    # Insertar en la tabla visual
                    self.tree.insert("", "end", values=(archivo, nuevo_nombre))
                    
                    # Guardar en memoria para usar luego
                    ruta_original = os.path.join(carpeta, archivo)
                    ruta_destino = os.path.join(carpeta, nuevo_nombre)
                    self.archivos_pendientes.append((ruta_original, ruta_destino))
                    
                    contador += 1
                    count_imagenes += 1

            self.lbl_estado.config(text=f"Vista previa generada. Se encontrarón {count_imagenes} imágenes.")

        except Exception as e:
            messagebox.showerror("Error", str(e))

    def aplicar_cambios(self):
        """Realiza el renombrado real basado en la lista generada"""
        if not self.archivos_pendientes:
            messagebox.showwarning("Atención", "Primero genera la vista previa para confirmar los cambios.")
            return

        respuesta = messagebox.askyesno("Confirmar", f"¿Estás seguro de renombrar {len(self.archivos_pendientes)} archivos?")
        
        if respuesta:
            errores = 0
            exitos = 0
            
            for ruta_orig, ruta_dest in self.archivos_pendientes:
                try:
                    # Chequeo simple para no sobreescribir si ya existe
                    if os.path.exists(ruta_dest) and ruta_orig != ruta_dest:
                        print(f"El archivo {ruta_dest} ya existe, saltando...")
                        errores += 1
                        continue
                        
                    os.rename(ruta_orig, ruta_dest)
                    exitos += 1
                except OSError as e:
                    print(f"Error renombrando {ruta_orig}: {e}")
                    errores += 1

            # Resultado final
            mensaje = f"Proceso finalizado.\n\nExitosos: {exitos}\nOmitidos/Errores: {errores}"
            messagebox.showinfo("Reporte", mensaje)
            
            # Limpiar todo para empezar de nuevo
            self.limpiar_tabla()
            self.lbl_estado.config(text="Proceso finalizado.")
            # Opcional: Volver a cargar la vista previa automática para ver los nombres nuevos
            # self.generar_vista_previa()

if __name__ == "__main__":
    root = tk.Tk()
    app = RenombradorAvanzadoApp(root)
    root.mainloop()