import sys
import os
import uvicorn
import re
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from neo4j import GraphDatabase
from contextlib import asynccontextmanager
from lib.fuzzy_matching import load_data_from_neo4j, hybrid_scorer_07_03, find_top_nodes_in_memory, find_best_node_text
from lib.create_synonym_cache import load_synonym_cache
from lib.allergens_detection import check_graph_connection
from lib.clean_string import clean_string
from database import init_sql_database, log_scan_to_sql, get_sql_stats, get_db_connection


# ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
# ▌1. SYSTEM CONFIGURATION                  ▐
# ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

load_dotenv()

# ═════════════ Configuration ═════════════

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")

NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
AUTH = (NEO4J_USER, NEO4J_PASSWORD) 

import socket

def is_neo4j_alive(uri_str: str) -> bool:
    try:
        # Check port 7687 with ultra-fast 0.2s timeout
        with socket.create_connection(("127.0.0.1", 7687), timeout=0.2):
            return True
    except Exception:
        return False

if is_neo4j_alive(URI):
    try:
        driver = GraphDatabase.driver(URI, auth=AUTH, connection_timeout=1.0)
    except Exception:
        driver = None
else:
    driver = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    try:
        init_sql_database()
        load_data_from_neo4j(driver)
        load_synonym_cache(driver)
    except Exception as e:
        print(f"Error when loading databases: {e}")
    
    yield
    
    # --- SHUTDOWN ---
    print("Server is shutting down...")
    if driver is not None:
        try:
            driver.close()
        except Exception:
            pass

app = FastAPI(title="Food Allergy Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow every access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ═══════════════════════════════════════════════

# ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
# ▌2. DATA INPUT/OUTPUT DEFINITION          ▐
# ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

# App Request Data (Input)
class AllergyRequest(BaseModel):
    user_allergens: List[str]      # Ex: ["milk", "shrimp"]
    scanned_ingredients: List[str] # Ex: ["whey protein", "salt"]

# Warning detail
class WarningDetail(BaseModel):
    scanned_item: str    
    allergen_source: str 
    reason: str       

# Server Response Data (Output)
class AllergyResponseDebug(BaseModel):
    is_safe: bool              
    warnings: List[WarningDetail]  
    debug_mapping: Optional[dict] = None 

class AllergyResponse(BaseModel):
    mapped_scanned_allergies_label: List[str]
    mapped_user_allergies_label: List[str]
    ingredients_allergies: List[str]


# ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
# ▌3. API ENDPOINT (COMMUNICATE GATE)       ▐
# ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

@app.post("/debug/check", response_model=AllergyResponseDebug)
async def check_allergy(request: AllergyRequest):
    print(f"\n[REQUEST] Scan={request.scanned_ingredients} | User={request.user_allergens}")
    
    warnings = []
    debug_info = {}
    mapped_user_allergies_label = []
    user_allergen_map = {}


    for item in request.user_allergens:
        clean_item = clean_string(item)
        node = find_best_node_text(clean_item)
        if node:
            node_label = node["label"]
            mapped_user_allergies_label.append(node_label)
            print(f"   Mapped User Allergen: '{item}' -> '{node_label}'")
    

    if not mapped_user_allergies_label:
         return {"is_safe": True, "warnings": [], "debug_mapping": {}}


    for item in request.scanned_ingredients:
        clean_item = clean_string(item)
        node = find_best_node_text(clean_item)
        if not node:
            continue
        node_label = node["label"]
        print(f"   Mapped Scanned Ingredient: '{item}' -> '{node_label}'")
        debug_info[item] = node_label

        conflict_allergen_label = check_graph_connection(node_label, mapped_user_allergies_label, driver)
        if conflict_allergen_label:
            print(f"   [ALERT] {item} <--> {conflict_allergen_label}")
            reason_msg = f"Product contains '{node_label}', related to '{conflict_allergen_label}'"
            warnings.append({
                "scanned_item": item,
                "allergen_source": conflict_allergen_label, 
                "reason": reason_msg
            })

    is_safe = len(warnings) == 0

    # Polyglot Persistence: Log scan history directly into SQL database (scallergen.db)
    import json
    log_scan_to_sql(
        scanned_text=", ".join(request.scanned_ingredients),
        user_allergens=request.user_allergens,
        is_safe=is_safe,
        warnings_json=json.dumps(warnings, ensure_ascii=False)
    )

    return {
        "is_safe": is_safe,
        "warnings": warnings,
        "debug_mapping": debug_info
    }

@app.post("/check", response_model=AllergyResponse)
async def check_allergy(request: AllergyRequest):
    print(f"\n📩 Request: Scan={request.scanned_ingredients} | User={request.user_allergens}")

    mapped_scanned_ingredients_label = []
    mapped_user_allergies_label = []
    ingredients_allergies = []

    # Mapping User Allergen List
    for item in request.user_allergens:
        clean_item = clean_string(item)
        node = find_best_node_text(clean_item)
        if node:
            node_label = node["label"]
            mapped_user_allergies_label.append(node_label)
        else:
            mapped_user_allergies_label.append("")

    # Mapping Scanned Ingredient List
    for item in request.scanned_ingredients:
        clean_item = clean_string(item)
        node = find_best_node_text(clean_item)
        if node:
            node_label = node["label"]
            mapped_scanned_ingredients_label.append(node_label)
            conflict_allergen_label = check_graph_connection(node_label, mapped_user_allergies_label, driver)
            if conflict_allergen_label:
                ingredients_allergies.append(conflict_allergen_label)
            else:
                ingredients_allergies.append("")

        else:
            mapped_scanned_ingredients_label.append("")
            ingredients_allergies.append("")
    return {
        "mapped_scanned_allergies_label": mapped_scanned_ingredients_label,
        "mapped_user_allergies_label": mapped_user_allergies_label,
        "ingredients_allergies": ingredients_allergies
    }

@app.get("/debug/node")
def debug_node(text: str):
    """Giúp bạn kiểm tra xem từ khóa map vào Node ID nào"""
    clean_text = clean_string(text)
    result = find_top_nodes_in_memory(clean_text)
    if len(result) > 0:
        node = result[0]
        return {
            "input_text": text,
            "mapped_node": node
        }
    else:
        return {
            "input_text": text,
            "mapped_node": None
        }

@app.get("/node")
def suggest_node(text: str):
    clean_text = clean_string(text)
    result = find_top_nodes_in_memory(clean_text, 5)
    response = []
    for item in result:
        response.append({
            "name": item["node"]["name"],
            "label": item["node"]["label"]
        })
    return {"suggest_nodes": response}

@app.get("/foodon/stats")
def get_foodon_stats():
    """Trả về thông số đồ thị tri thức FoodOn Ontology (15.905+ nút, 9 quan hệ DAG)"""
    return {
        "ontology": "FoodOn (Food Ontology)",
        "repository": "https://github.com/FoodOntology/foodon.git",
        "total_nodes": 15905,
        "relationship_types": [
            "IS_A", "DERIVES_FROM", "IN_TAXON", "PRODUCED_BY",
            "PART_OF", "HAS_PART", "HAS_INGREDIENT",
            "HAS_DEFINING_INGREDIENT", "HAS_SUBSTANCE_ADDED"
        ],
        "hybrid_scorer": "Character 3-gram (0.7) + Token Jaccard (0.3)",
        "apoc_path_max_level": 7,
        "neo4j_uri": URI,
        "status": "connected"
    }

@app.get("/foodon/synonyms")
def get_foodon_synonyms(label: str):
    """Truy vấn các đồng nghĩa (synonyms) của một nhãn thực phẩm FoodOn"""
    from lib.create_synonym_cache import get_synonyms_of_label
    syns = list(get_synonyms_of_label(label))
    return {
        "label": label,
        "synonyms_count": len(syns),
        "synonyms": syns
    }

from database import init_sql_database, log_scan_to_sql, get_sql_stats, get_db_connection, clear_sql_logs

@app.get("/sql/stats")
def get_sql_database_stats():
    """Trả về thống kê từ SQL Relational Database Layer (scallergen.db)"""
    return get_sql_stats()

@app.get("/sql/logs")
def get_sql_scan_logs(limit: int = 10):
    """Truy vấn lịch sử nhật ký quét gần đây từ SQL Database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scan_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    logs = [dict(row) for row in rows]
    conn.close()
    return {"count": len(logs), "logs": logs}

@app.post("/sql/clear")
@app.delete("/sql/logs")
def clear_all_scan_logs():
    """Xóa trắng toàn bộ lịch sử quét để làm mới nhật ký log"""
    success = clear_sql_logs()
    return {"success": success, "message": "Đã làm mới và xóa sạch toàn bộ nhật ký quét SQL!"}

@app.get("/")
def health_check():
    return {
        "status": "running", 
        "service": "Sadie's Link FoodOn AI Backend (Polyglot Persistence SQL + Neo4j)",
        "version": "2.5.0",
        "docs_url": "http://localhost:8000/docs"
    }

# ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
# ▌5. MAIN EXECUTION                        ▐
# ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)