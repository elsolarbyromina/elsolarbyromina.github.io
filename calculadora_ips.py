import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import pandas as pd
import numpy as np
from datetime import datetime

class CalculadoraIPSApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Calculadora de Mejor Cargo - Jubilación Docente IPS")
        self.root.geometry("800x600")
        
        # Variables para almacenar datos
        self.df_cargos = None
        self.df_licencias = None
        
        # --- MARCO SUPERIOR: CARGA DE DATOS ---
        frame_input = tk.LabelFrame(root, text="1. Carga de Datos", padx=10, pady=10)
        frame_input.pack(fill="x", padx=10, pady=5)
        
        btn_cargos = tk.Button(frame_input, text="Cargar Archivo de Cargos (Excel/CSV)", command=self.cargar_cargos, bg="#e1f5fe")
        btn_cargos.pack(side="left", padx=5)
        
        self.lbl_cargos = tk.Label(frame_input, text="Ningún archivo cargado", fg="gray")
        self.lbl_cargos.pack(side="left", padx=5)
        
        # Separador
        ttk.Separator(frame_input, orient='vertical').pack(side="left", fill='y', padx=10)

        btn_lic = tk.Button(frame_input, text="Cargar Licencias (Opcional)", command=self.cargar_licencias, bg="#ffebee")
        btn_lic.pack(side="left", padx=5)
        
        self.lbl_lic = tk.Label(frame_input, text="Ningún archivo cargado", fg="gray")
        self.lbl_lic.pack(side="left", padx=5)

        # --- MARCO MEDIO: BOTÓN CALCULAR ---
        frame_calc = tk.Frame(root, pady=10)
        frame_calc.pack()
        
        btn_calc = tk.Button(frame_calc, text="CALCULAR MEJOR CARGO (36 MESES)", command=self.calcular, font=("Arial", 12, "bold"), bg="#c8e6c9", height=2)
        btn_calc.pack()

        # --- MARCO INFERIOR: RESULTADOS ---
        frame_results = tk.LabelFrame(root, text="2. Resultados y Análisis", padx=10, pady=10)
        frame_results.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Area de texto con scroll
        self.txt_result = tk.Text(frame_results, height=15)
        self.txt_result.pack(side="left", fill="both", expand=True)
        
        scrollbar = tk.Scrollbar(frame_results, command=self.txt_result.yview)
        scrollbar.pack(side="right", fill="y")
        self.txt_result.config(yscrollcommand=scrollbar.set)
        
        # --- AYUDA / FORMATO ESPERADO ---
        lbl_help = tk.Label(root, text="El Excel de Cargos debe tener columnas: 'Desde', 'Hasta', 'Modulos' (o Horas).", font=("Arial", 8), fg="gray")
        lbl_help.pack(pady=5)

    def cargar_cargos(self):
        file_path = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx *.xls"), ("CSV files", "*.csv")])
        if file_path:
            try:
                if file_path.endswith('.csv'):
                    self.df_cargos = pd.read_csv(file_path)
                else:
                    self.df_cargos = pd.read_excel(file_path)
                
                # Normalizar columnas
                self.df_cargos.columns = [c.lower().strip() for c in self.df_cargos.columns]
                self.lbl_cargos.config(text=f"Cargado: {file_path.split('/')[-1]}", fg="green")
                messagebox.showinfo("Éxito", "Archivo de cargos cargado correctamente.\nAsegúrese que las columnas se llamen 'desde', 'hasta' y 'modulos' (o carga horaria).")
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo leer el archivo:\n{e}")

    def cargar_licencias(self):
        file_path = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx *.xls"), ("CSV files", "*.csv")])
        if file_path:
            try:
                if file_path.endswith('.csv'):
                    self.df_licencias = pd.read_csv(file_path)
                else:
                    self.df_licencias = pd.read_excel(file_path)
                self.lbl_lic.config(text=f"Cargado: {file_path.split('/')[-1]}", fg="orange")
            except Exception as e:
                messagebox.showerror("Error", f"No se pudo leer el archivo:\n{e}")

    def calcular(self):
        if self.df_cargos is None:
            messagebox.showwarning("Atención", "Por favor cargue primero el archivo de Cargos/Hoja de Ruta.")
            return

        self.txt_result.delete(1.0, tk.END)
        self.txt_result.insert(tk.END, "Iniciando análisis de simultaneidad...\n")
        self.txt_result.insert(tk.END, "-"*50 + "\n")

        try:
            # 1. PREPARACIÓN DE DATOS
            df = self.df_cargos.copy()
            
            # Buscar columnas clave (flexibilidad en nombres)
            col_desde = next((c for c in df.columns if 'desde' in c), None)
            col_hasta = next((c for c in df.columns if 'hasta' in c), None)
            col_mods = next((c for c in df.columns if 'mod' in c or 'hor' in c or 'carga' in c), None)
            
            if not (col_desde and col_hasta and col_mods):
                self.txt_result.insert(tk.END, "ERROR: No encuentro columnas 'Desde', 'Hasta' o 'Modulos/Carga'. Revise su Excel.\n")
                return

            # Convertir fechas
            df[col_desde] = pd.to_datetime(df[col_desde], errors='coerce', dayfirst=True)
            df[col_hasta] = pd.to_datetime(df[col_hasta], errors='coerce', dayfirst=True)
            
            # Limpiar módulos (sacar texto, dejar numeros)
            df[col_mods] = pd.to_numeric(df[col_mods].astype(str).str.extract(r'(\d+.\d+|\d+)')[0], errors='coerce').fillna(0)

            # Eliminar filas sin fechas validas
            df = df.dropna(subset=[col_desde, col_hasta])
            
            if df.empty:
                self.txt_result.insert(tk.END, "ERROR: El archivo no tiene fechas válidas.\n")
                return

            min_date = df[col_desde].min()
            max_date = df[col_hasta].max()
            
            # Crear linea de tiempo mensual (1er dia de cada mes)
            timeline = pd.date_range(start=min_date, end=max_date, freq='MS')
            df_timeline = pd.DataFrame(index=timeline, data={'suma_modulos': 0.0})

            # 2. CÁLCULO DE SIMULTANEIDAD
            self.txt_result.insert(tk.END, f"Analizando periodo: {min_date.date()} al {max_date.date()}\n")
            
            for idx, row in df.iterrows():
                # Sumar modulos en el rango de fechas del cargo
                mask = (df_timeline.index >= row[col_desde]) & (df_timeline.index <= row[col_hasta])
                df_timeline.loc[mask, 'suma_modulos'] += row[col_mods]

            # 3. PROCESAR LICENCIAS (Si las hay)
            # Nota: Aquí asumimos que si el usuario carga licencias, son SIN GOCE DE SUELDO.
            # Los códigos 'buenos' (1257, etc) NO deberían estar en este archivo de licencias, o el usuario debe borrarlos antes.
            if self.df_licencias is not None:
                self.txt_result.insert(tk.END, "Procesando descuentos por Licencias...\n")
                df_lic = self.df_licencias.copy()
                l_desde = next((c for c in df_lic.columns if 'desde' in c), None)
                l_hasta = next((c for c in df_lic.columns if 'hasta' in c), None)
                
                if l_desde and l_hasta:
                    df_lic[l_desde] = pd.to_datetime(df_lic[l_desde], errors='coerce', dayfirst=True)
                    df_lic[l_hasta] = pd.to_datetime(df_lic[l_hasta], errors='coerce', dayfirst=True)
                    
                    for idx, row in df_lic.iterrows():
                        # Si hay licencia, restamos una cantidad masiva para romper la racha 
                        # o simplemente ponemos 0 si es licencia total. 
                        # Para ser justos, restaremos el total de modulos de ese mes (ponemos a 0)
                        mask = (df_timeline.index >= row[l_desde]) & (df_timeline.index <= row[l_hasta])
                        # Opción estricta: durante licencia sin goce, se cae todo.
                        df_timeline.loc[mask, 'suma_modulos'] = 0 

            # 4. ALGORITMO DE VENTANA MÓVIL (36 MESES)
            # Queremos saber: En el mes X, ¿cuál es el mínimo de módulos que mantengo durante los SIGUIENTES 36 meses?
            # Pandas rolling mira hacia atrás. Invertimos el dataframe para mirar adelante.
            
            df_timeline['garantizado_36m'] = df_timeline['suma_modulos'][::-1].rolling(window=36).min()[::-1]
            
            # 5. RESULTADOS
            mejor_cargo = df_timeline['garantizado_36m'].max()
            
            if pd.isna(mejor_cargo):
                self.txt_result.insert(tk.END, "\nNo hay suficientes datos para completar 36 meses consecutivos.\n")
                return

            # Encontrar el periodo
            fechas_mejor_cargo = df_timeline[df_timeline['garantizado_36m'] == mejor_cargo].index
            fecha_inicio_optima = fechas_mejor_cargo[0]
            fecha_fin_optima = fecha_inicio_optima + pd.DateOffset(months=36) - pd.DateOffset(days=1)

            self.txt_result.insert(tk.END, "\n" + "="*40 + "\n")
            self.txt_result.insert(tk.END, "RESULTADO FINAL - DICTAMEN TÉCNICO\n")
            self.txt_result.insert(tk.END, "="*40 + "\n")
            self.txt_result.insert(tk.END, f"MEJOR CARGO DETERMINADO: {mejor_cargo:.2f} Módulos/Horas\n")
            self.txt_result.insert(tk.END, f"PERIODO OPTIMO (INICIO): {fecha_inicio_optima.strftime('%B %Y')}\n")
            self.txt_result.insert(tk.END, f"PERIODO OPTIMO (FIN):    {fecha_fin_optima.strftime('%B %Y')}\n\n")
            
            self.txt_result.insert(tk.END, "DETALLE AÑO POR AÑO (Periodo Clave):\n")
            
            # Mostrar detalle alrededor de la fecha optima
            rango_mostrar = df_timeline.loc[fecha_inicio_optima : fecha_fin_optima]
            for fecha, row in rango_mostrar.iterrows():
                self.txt_result.insert(tk.END, f"{fecha.strftime('%m/%Y')}: {row['suma_modulos']} mods activos\n")

            self.txt_result.insert(tk.END, "\nEste cálculo verifica la SIMULTANEIDAD de servicios.\n")

        except Exception as e:
            self.txt_result.insert(tk.END, f"\nOCURRIÓ UN ERROR CRÍTICO:\n{e}\n")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    root = tk.Tk()
    app = CalculadoraIPSApp(root)
    root.mainloop()