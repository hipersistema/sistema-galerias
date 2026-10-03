import pandas as pd
from supabase import create_client, Client

# ==========================================
# 1. CONFIGURACIÓN DE SUPABASE
# ==========================================
SUPABASE_URL = "https://dsnihbjwhmzfgzqtvqyz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbmloYmp3aG16Zmd6cXR2cXl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgxNzQwMSwiZXhwIjoyMTA1MzkzNDAxfQ.mX6Gq6Dpj1d1Lnvc4oi8zVX-aD7VuqWRsv4lJKSaNA4"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# 2. LECTURA Y PROCESAMIENTO DEL EXCEL
# ==========================================
EXCEL_FILE = 'BASE_DATOS_INSUMOS_202666.xlsx'
HOJA_NOMBRE = 'Insumos y Recetas USD Pura'

print(f"Leyendo archivo '{EXCEL_FILE}'...")

# dtype={'Cod Interno': str} fuerza a Pandas a leer el código como cadena de texto pura sin recortar ceros
df = pd.read_excel(EXCEL_FILE, sheet_name=HOJA_NOMBRE, dtype={'Cod Interno': str})

insumos_batch = []

def parse_num(val):
    if pd.isna(val):
        return 0.0
    if isinstance(val, str):
        val = val.replace(',', '.').strip()
    try:
        return float(val)
    except ValueError:
        return 0.0

for index, row in df.iterrows():
    cod_raw = row['Cod Interno']
    if pd.isna(cod_raw) or str(cod_raw).strip() == '' or str(cod_raw).lower() == 'nan':
        continue

    # Preservar el string exacto tal como está en la celda
    cod_str = str(cod_raw).strip()
    if cod_str.endswith('.0'):
        cod_str = cod_str[:-2]

    descripcion = str(row['Descripcion']).strip().upper() if not pd.isna(row['Descripcion']) else 'SIN DESCRIPCION'
    precio_costo = parse_num(row['Precio de Costo'])
    precio_venta = parse_num(row['Precio de Venta'])

    insumo = {
        "id": f"ing_{cod_str}",
        "codigo": cod_str,               # Se guarda tal cual (ej. "0602016", "048718", "008635")
        "tipo": "primario",
        "nombre": descripcion,
        "precio": precio_costo,          # Costo de compra
        "costo_venta": precio_venta,     # Precio de venta
        "unidad": "KG",
        "historial": []
    }
    insumos_batch.append(insumo)

# ==========================================
# 3. CARGA A SUPABASE EN LOTES DE 500
# ==========================================
TOTAL_REGISTROS = len(insumos_batch)
TAMANO_LOTE = 500

print(f"Total de insumos procesados: {TOTAL_REGISTROS}. Iniciando subida a Supabase...")

for i in range(0, TOTAL_REGISTROS, TAMANO_LOTE):
    lote = insumos_batch[i:i + TAMANO_LOTE]
    response = supabase.table('insumos').upsert(lote).execute()
    print(f"Procesados {min(i + TAMANO_LOTE, TOTAL_REGISTROS)} de {TOTAL_REGISTROS}...")

print("✅ ¡Importación completada respetando los códigos exactos!")