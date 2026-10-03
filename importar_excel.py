import re
import pandas as pd
from supabase import create_client, Client

# ==========================================
# 1. CONFIGURACIÓN DE SUPABASE
# ==========================================
SUPABASE_URL = "https://dsnihbjwhmzfgzqtvqyz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbmloYmp3aG16Zmd6cXR2cXl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgxNzQwMSwiZXhwIjoyMTA1MzkzNDAxfQ.mX6Gq6Dpj1d1Lnvc4oi8zVX-aD7VuqWRsv4lJKSaNA4"  # Usa tu clave service_role

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# 2. ALGORITMO DE DETECCIÓN DE UNIDAD
# ==========================================
def inferir_unidad(descripcion: str) -> str:
    desc = descripcion.upper()

    # 1. Detección explícita de Kilos / Gramos
    if re.search(r'\b(X\s*KG|KG|KILO|KILOS|KILOGRAMO|KILOGRAMOS)\b', desc):
        return 'KG'
    if re.search(r'\b(\d+GR|GR|GRAMO|GRAMOS|GRS)\b', desc) and not re.search(r'\b(KG)\b', desc):
        return 'GR'

    # 2. Detección de Líquidos / Volumen (Litros / Mililitros)
    if re.search(r'\b(ML|CC)\b', desc):
        return 'ML'
    if re.search(r'\b(\d+(\.\d+)?L|LITRO|LITROS|LT|LTS|PET|SODA|REFRESCO|ACEITE|VINAGRE|AGUA|JUGO)\b', desc):
        return 'LT'

    # 3. Detección de Piezas / Empaques / Unidades
    if re.search(r'\b(UND|UNIDAD|UNIDADES|PIEZA|PIEZAS|LATA|LATAS|BOTELLA|CAJA|SOBRE|PAQ|PAQUETE|BLISTER|BOLSA)\b', desc):
        return 'UND'

    # Valor predeterminado más seguro para productos de supermercado general
    return 'UND'

# ==========================================
# 3. LECTURA Y PROCESAMIENTO DEL EXCEL
# ==========================================
EXCEL_FILE = 'BASE_DATOS_INSUMOS_202666.xlsx'
HOJA_NOMBRE = 'Insumos y Recetas USD Pura'

print(f"Leyendo archivo '{EXCEL_FILE}'...")
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

    cod_str = str(cod_raw).strip()
    if cod_str.endswith('.0'):
        cod_str = cod_str[:-2]

    descripcion = str(row['Descripcion']).strip().upper() if not pd.isna(row['Descripcion']) else 'SIN DESCRIPCION'
    precio_costo = parse_num(row['Precio de Costo'])
    precio_venta = parse_num(row['Precio de Venta'])
    
    # Asignación de unidad automática analizando el nombre del artículo
    unidad_detectada = inferir_unidad(descripcion)

    insumo = {
        "id": f"ing_{cod_str}",
        "codigo": cod_str,
        "tipo": "primario",
        "nombre": descripcion,
        "precio": precio_costo,
        "costo_venta": precio_venta,
        "unidad": unidad_detectada,  # Unidad correcta (LT, ML, UND, KG, GR)
        "historial": []
    }
    insumos_batch.append(insumo)

# ==========================================
# 4. CARGA A SUPABASE EN LOTES DE 500
# ==========================================
TOTAL_REGISTROS = len(insumos_batch)
TAMANO_LOTE = 500

print(f"Total de insumos procesados: {TOTAL_REGISTROS}. Iniciando subida a Supabase...")

for i in range(0, TOTAL_REGISTROS, TAMANO_LOTE):
    lote = insumos_batch[i:i + TAMANO_LOTE]
    response = supabase.table('insumos').upsert(lote).execute()
    print(f"Procesados {min(i + TAMANO_LOTE, TOTAL_REGISTROS)} de {TOTAL_REGISTROS}...")

print("✅ ¡Importación completada con detección de unidades correcta!")