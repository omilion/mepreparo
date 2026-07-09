import os
import re
import json
import time
import requests

BASE_DIR = r"c:\Users\flipe\OneDrive\Documentos\mepreparo\base-documental"
RAG_DIR = os.path.join(BASE_DIR, "_rag")
chunks_file = os.path.join(RAG_DIR, "chunks.jsonl")
temp_file = os.path.join(RAG_DIR, "chunks_temp.jsonl")
report_file = os.path.join(RAG_DIR, "reporte.json")

# Retrieve API key
GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

def call_gemini_embedding(text, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    payload = {
        "content": {
            "parts": [{"text": text}]
        }
    }
    
    retries = 5
    backoff = 1.0  # seconds
    
    for attempt in range(retries):
        try:
            r = requests.post(url, json=payload, timeout=10)
            if r.status_code == 200:
                data = r.json()
                return data["embedding"]["values"]
            elif r.status_code == 429:
                print(f"  [429 Too Many Requests] Retrying in {backoff:.1f}s...")
                time.sleep(backoff)
                backoff *= 2.0
            else:
                print(f"  [HTTP Error {r.status_code}] {r.text}. Retrying in {backoff:.1f}s...")
                time.sleep(backoff)
                backoff *= 2.0
        except Exception as e:
            print(f"  [Connection Error] {e}. Retrying in {backoff:.1f}s...")
            time.sleep(backoff)
            backoff *= 2.0
            
    return None

def main():
    print("=" * 60)
    print("MIGRACIÓN A EMBEDDINGS DE GEMINI (text-embedding-004)")
    print("=" * 60)
    
    if not GEMINI_KEY:
        print("\n[!] ERROR CRÍTICO:")
        print("No se detectó la variable de entorno GEMINI_API_KEY o GOOGLE_API_KEY.")
        print("Por favor, configúrala en tu terminal antes de ejecutar este script.")
        print("Ejemplo (PowerShell): $env:GEMINI_API_KEY='tu_clave_aqui'")
        print("Ejemplo (CMD): set GEMINI_API_KEY=tu_clave_aqui")
        print("=" * 60)
        return

    if not os.path.exists(chunks_file):
        print(f"[!] Error: No se encontró el dataset original en {chunks_file}")
        return

    print("Leyendo chunks existentes...")
    with open(chunks_file, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    
    total_chunks = len(lines)
    print(f"Se encontraron {total_chunks} chunks.")

    # Remove temporary file if exists from a crashed run
    if os.path.exists(temp_file):
        os.remove(temp_file)

    processed_count = 0
    upgraded_count = 0
    skipped_count = 0
    
    start_time = time.time()
    
    for idx, line in enumerate(lines, 1):
        chunk = json.loads(line)
        
        # Check if already processed with Gemini
        if chunk.get("modelo_embedding") == "text-embedding-004":
            # Write directly to temp file
            with open(temp_file, "a", encoding="utf-8") as f_out:
                f_out.write(json.dumps(chunk, ensure_ascii=False) + "\n")
            skipped_count += 1
            continue
            
        # Needs upgrading
        text = chunk["texto"]
        vector = call_gemini_embedding(text, GEMINI_KEY)
        
        if vector is not None:
            chunk["embedding"] = vector
            chunk["modelo_embedding"] = "text-embedding-004"
            upgraded_count += 1
        else:
            print(f"\n[!] Falló la obtención de embedding para el chunk: {chunk['id']}")
            print("El script se detendrá para evitar guardar datos incompletos.")
            return
            
        with open(temp_file, "a", encoding="utf-8") as f_out:
            f_out.write(json.dumps(chunk, ensure_ascii=False) + "\n")
            
        processed_count += 1
        
        # Print progress every 10 chunks or so
        if idx % 10 == 0 or idx == total_chunks:
            elapsed = time.time() - start_time
            rate = processed_count / elapsed if elapsed > 0 else 0
            eta = (total_chunks - idx) / rate if rate > 0 else 0
            print(f"  Progreso: {idx}/{total_chunks} | Upgraded: {upgraded_count} | Skipped: {skipped_count} | ETA: {eta/60:.1f} min", end="\r")
            
        # Retraso de cortesía (~45ms) para no saturar la cuota RPM
        time.sleep(0.045)

    # Reemplazar el archivo original de forma segura
    if os.path.exists(chunks_file):
        os.remove(chunks_file)
    os.rename(temp_file, chunks_file)
    
    # Actualizar reporte
    if os.path.exists(report_file):
        with open(report_file, "r", encoding="utf-8") as f:
            report = json.load(f)
    else:
        report = {}
        
    report["modelo_embeddings"] = "text-embedding-004 (Google API)"
    report["dimension_embeddings"] = 768
    report["fecha_actualizacion_gemini"] = time.strftime("%Y-%m-%d %H:%M:%S")
    report["chunks_actualizados"] = upgraded_count
    
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
        
    print("\n" + "=" * 60)
    print("MIGRACIÓN COMPLETADA EXITOSAMENTE!")
    print(f"  Total Chunks: {total_chunks}")
    print(f"  Upgraded    : {upgraded_count}")
    print(f"  Skipped     : {skipped_count}")
    print(f"  Reporte actualizado en: {report_file}")
    print("=" * 60)

if __name__ == "__main__":
    main()
