import os
import re
import json
import argparse
import hashlib
import requests
import numpy as np

BASE_DIR = r"c:\Users\flipe\OneDrive\Documentos\mepreparo\base-documental"
RAG_DIR = os.path.join(BASE_DIR, "_rag")
chunks_file = os.path.join(RAG_DIR, "chunks.jsonl")

GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

def generate_local_embedding(text, dimension=768):
    words = re.findall(r'\w+', text.lower())
    vec = np.zeros(dimension, dtype=np.float32)
    if not words:
        return vec
        
    for w in words:
        h = hashlib.md5(w.encode('utf-8')).hexdigest()
        val = int(h, 16)
        idx = val % dimension
        sign = 1 if (val // dimension) % 2 == 0 else -1
        vec[idx] += sign
        
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec

def call_gemini_embedding(text, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    payload = {
        "content": {
            "parts": [{"text": text}]
        }
    }
    try:
        r = requests.post(url, json=payload, timeout=10)
        if r.status_code == 200:
            data = r.json()
            return np.array(data["embedding"]["values"], dtype=np.float32)
    except Exception as e:
        print(f"Error llamando a la API de Gemini: {e}")
    return None

def main():
    parser = argparse.ArgumentParser(description="Consulta y búsqueda RAG en la base documental.")
    parser.add_argument("query", type=str, help="Texto de la consulta de búsqueda")
    parser.add_argument("--materia", type=str, default=None, help="Filtrar por materia (ej: matematica, lenguaje)")
    parser.add_argument("--curso", type=str, default=None, help="Filtrar por curso (ej: 7basico, 1basico)")
    parser.add_argument("--tipo", type=str, default=None, help="Filtrar por tipo (ej: temario_examen_libre)")
    parser.add_argument("--top", type=int, default=5, help="Número de resultados a mostrar (default: 5)")
    args = parser.parse_args()

    if not os.path.exists(chunks_file):
        print(f"Error: No se encontró el dataset en {chunks_file}")
        return

    print("Cargando chunks en memoria...")
    chunks = []
    with open(chunks_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                chunks.append(json.loads(line))
    print(f"Se cargaron {len(chunks)} chunks.")

    # Generate query embedding
    is_gemini = False
    if GEMINI_KEY:
        print("Generando embedding de consulta usando Google Gemini API...")
        query_vec = call_gemini_embedding(args.query, GEMINI_KEY)
        if query_vec is not None:
            is_gemini = True
        else:
            print("Fallo en API de Gemini. Usando codificador local de respaldo.")
            query_vec = generate_local_embedding(args.query)
    else:
        print("Aviso: No se detectó clave de API. Usando codificador local de respaldo (local-hashing).")
        query_vec = generate_local_embedding(args.query)

    # Filter chunks based on metadata
    filtered_chunks = []
    for c in chunks:
        # Verify if chunk matches active query embedding model
        # If query was embedded with Gemini, we should only compare with Gemini embeddings.
        # Otherwise, compare with fallback.
        c_model = c.get("modelo_embedding", "local")
        
        # Apply metadata filters
        if args.materia and c["materia"].lower() != args.materia.lower():
            continue
        if args.curso and c["curso"].lower() != args.curso.lower():
            continue
        if args.tipo and c["tipo"].lower() != args.tipo.lower():
            continue
            
        filtered_chunks.append(c)

    print(f"Chunks que cumplen con los filtros de metadatos: {len(filtered_chunks)}")
    if not filtered_chunks:
        print("No hay resultados para los filtros indicados.")
        return

    # Calculate similarity
    results = []
    for c in filtered_chunks:
        c_emb = np.array(c["embedding"], dtype=np.float32)
        
        # Cosine similarity (dot product of L2 normalized vectors)
        sim = np.dot(query_vec, c_emb)
        results.append((c, sim))

    # Sort results
    results.sort(key=lambda x: x[1], reverse=True)

    print("\n" + "=" * 60)
    print(f"RESULTADOS DE BÚSQUEDA PARA: '{args.query}'")
    print(f"Modo vectorización: {'Gemini text-embedding-004' if is_gemini else 'Codificador Local (Fallback)'}")
    print("=" * 60)

    for i, (c, score) in enumerate(results[:args.top], 1):
        print(f" {i}. ID: {c['id']} | Similitud: {score:.4f}")
        print(f"    Materia: {c['materia']} | Curso: {c['curso']} | Tipo: {c['tipo']}")
        print(f"    Archivo: {c['fuente_archivo']} (Pág. {c['pagina']})")
        snippet = c['texto'].replace('\n', ' ')[:150] + "..."
        print(f"    Texto: {snippet}")
        print("-" * 60)

if __name__ == "__main__":
    main()
