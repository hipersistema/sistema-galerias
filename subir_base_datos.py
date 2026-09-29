import pandas as pd
from supabase import create_client, Client

# 1. Credenciales de tu proyecto Supabase
SUPABASE_URL = "https://dsnihbjwhmzfgzqtvqyz.supabase.co" # Tu URL
SUPABASE_KEY = "sb_publishable_i1ITZ86VPmkQ6uJ_N0gmGw_-1GSyGTT"       # Tu clave

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def subir_excel_a_supabase():
    archivo_excel = "BASE_INSUMOS_CONSOLIDADA.xlsx"
    hoja = "Base de Insumos"

    print("⏳ Leyendo Excel...")
    df = pd.read_excel(archivo_excel, sheet_name=hoja)

    # 1. Eliminar filas con código nulo
    df = df.dropna(subset=['Código'])

    # 2. Convertir código a texto y limpiar espacios
    df['Código'] = df['Código'].astype(str).str.strip()

    # 3. DEDUPLICAR por Código (mantiene la última ocurrencia del producto en el Excel)
    filas_iniciales = len(df)
    df = df.drop_duplicates(subset=['Código'], keep='last')
    filas_unicas = len(df)
    
    if filas_iniciales != filas_unicas:
        print(f"⚠️ Se detectaron y eliminaron {filas_iniciales - filas_unicas} códigos duplicados en el Excel.")

    # 4. Construir la lista de registros
    registros = []
    for _, fila in df.iterrows():
        cod = str(fila['Código']).strip()
        if not cod or cod.lower() == "nan":
            continue

        costo_unit = float(fila['Costo Unitario ($)']) if pd.notna(fila['Costo Unitario ($)']) else 0.0
        costo_venta = float(fila['Costo Venta ($)']) if pd.notna(fila['Costo Venta ($)']) else 0.0
        unidad = str(fila['Unidad']).strip().lower() if pd.notna(fila['Unidad']) else "kg"

        registros.append({
            "id": f"ing_{cod}",
            "codigo": cod,
            "nombre": str(fila['Nombre del Insumo / Base']).strip().upper(),
            "tipo": "primario",
            "precio": costo_unit,
            "costo_venta": costo_venta,
            "unidad": unidad
        })

    total = len(registros)
    print(f"📦 Subiendo {total} registros únicos a Supabase...")

    # 5. Subida en lotes de 1.000
    tamanio_lote = 1000
    for i in range(0, total, tamanio_lote):
        lote = registros[i:i + tamanio_lote]
        supabase.table("insumos").upsert(lote).execute()
        print(f"  ✓ Procesados {min(i + tamanio_lote, total)} de {total}")

    print("✅ ¡Carga completada exitosamente en Supabase!")

if __name__ == "__main__":
    subir_excel_a_supabase()