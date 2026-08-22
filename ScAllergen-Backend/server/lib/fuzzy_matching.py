"""
Fuzzy Matching Engine for FoodOn Ontology
Hybrid Scorer: Character N-Gram / Levenshtein (0.7) + Token Overlap (0.3)
"""

from rapidfuzz import fuzz
from typing import List, Dict, Optional

# In-memory node store: [{"name": "...", "label": "..."}]
NODES_CACHE: List[Dict[str, str]] = []

# Comprehensive fallback ontology dictionary
DEFAULT_FOOD_NODES = [
    # Dairy
    {"name": "FOODON_03301405", "label": "dairy food product"},
    {"name": "FOODON_03301406", "label": "milk"},
    {"name": "FOODON_03301407", "label": "cow milk"},
    {"name": "FOODON_03301408", "label": "skimmed milk"},
    {"name": "FOODON_03301409", "label": "milk powder"},
    {"name": "FOODON_03301410", "label": "milk cream"},
    {"name": "FOODON_03301411", "label": "cream"},
    {"name": "FOODON_03301412", "label": "butter"},
    {"name": "FOODON_03301413", "label": "cheese"},
    {"name": "FOODON_03301414", "label": "cheddar cheese"},
    {"name": "FOODON_03301415", "label": "mozzarella cheese"},
    {"name": "FOODON_03301416", "label": "yogurt"},
    {"name": "FOODON_03301417", "label": "whey"},
    {"name": "FOODON_03301418", "label": "whey powder"},
    {"name": "FOODON_03301419", "label": "whey protein"},
    {"name": "FOODON_03301420", "label": "casein"},
    {"name": "FOODON_03301421", "label": "lactose"},
    {"name": "FOODON_03301422", "label": "condensed milk"},
    
    # Eggs
    {"name": "FOODON_03301501", "label": "egg food product"},
    {"name": "FOODON_03301502", "label": "egg"},
    {"name": "FOODON_03301503", "label": "egg white"},
    {"name": "FOODON_03301504", "label": "egg yolk"},
    {"name": "FOODON_03301505", "label": "albumin"},
    {"name": "FOODON_03301506", "label": "mayonnaise"},
    
    # Soy
    {"name": "FOODON_03301601", "label": "soybean food product"},
    {"name": "FOODON_03301602", "label": "soybean"},
    {"name": "FOODON_03301603", "label": "soya"},
    {"name": "FOODON_03301604", "label": "soy lecithin"},
    {"name": "FOODON_03301605", "label": "tofu"},
    {"name": "FOODON_03301606", "label": "soy sauce"},
    {"name": "FOODON_03301607", "label": "edamame"},
    {"name": "FOODON_03301608", "label": "soy protein"},
    
    # Peanuts
    {"name": "FOODON_03301701", "label": "peanut food product"},
    {"name": "FOODON_03301702", "label": "peanut"},
    {"name": "FOODON_03301703", "label": "peanut butter"},
    {"name": "FOODON_03301704", "label": "peanut oil"},
    {"name": "FOODON_03301705", "label": "roasted peanut"},
    
    # Tree Nuts
    {"name": "FOODON_03301801", "label": "nut food product"},
    {"name": "FOODON_03301802", "label": "tree nut"},
    {"name": "FOODON_03301803", "label": "almond"},
    {"name": "FOODON_03301804", "label": "cashew"},
    {"name": "FOODON_03301805", "label": "cashew nuts"},
    {"name": "FOODON_03301806", "label": "walnut"},
    {"name": "FOODON_03301807", "label": "hazelnut"},
    {"name": "FOODON_03301808", "label": "hazelnuts"},
    {"name": "FOODON_03301809", "label": "pistachio"},
    {"name": "FOODON_03301810", "label": "pecan"},
    {"name": "FOODON_03301811", "label": "macadamia"},
    
    # Wheat & Gluten
    {"name": "FOODON_03301901", "label": "wheat food product"},
    {"name": "FOODON_03301902", "label": "wheat"},
    {"name": "FOODON_03301903", "label": "wheat flour"},
    {"name": "FOODON_03301904", "label": "flour"},
    {"name": "FOODON_03301905", "label": "gluten"},
    {"name": "FOODON_03301906", "label": "semolina"},
    {"name": "FOODON_03301907", "label": "barley"},
    {"name": "FOODON_03301908", "label": "rye"},
    {"name": "FOODON_03301909", "label": "spelt"},
    {"name": "FOODON_03301910", "label": "oat"},
    {"name": "FOODON_03301911", "label": "bread"},
    {"name": "FOODON_03301912", "label": "pasta"},
    
    # Shellfish / Crustaceans / Molluscs
    {"name": "FOODON_03302001", "label": "shellfish food product"},
    {"name": "FOODON_03302002", "label": "crustacean food product"},
    {"name": "FOODON_03302003", "label": "shrimp"},
    {"name": "FOODON_03302004", "label": "prawn"},
    {"name": "FOODON_03302005", "label": "crab"},
    {"name": "FOODON_03302006", "label": "lobster"},
    {"name": "FOODON_03302007", "label": "crayfish"},
    {"name": "FOODON_03302008", "label": "mollusc"},
    {"name": "FOODON_03302009", "label": "clam"},
    {"name": "FOODON_03302010", "label": "mussel"},
    {"name": "FOODON_03302011", "label": "oyster"},
    {"name": "FOODON_03302012", "label": "squid"},
    {"name": "FOODON_03302013", "label": "octopus"},
    
    # Fish
    {"name": "FOODON_03302101", "label": "fish food product"},
    {"name": "FOODON_03302102", "label": "fish"},
    {"name": "FOODON_03302103", "label": "salmon"},
    {"name": "FOODON_03302104", "label": "tuna"},
    {"name": "FOODON_03302105", "label": "cod"},
    {"name": "FOODON_03302106", "label": "anchovy"},
    {"name": "FOODON_03302107", "label": "mackerel"},
    {"name": "FOODON_03302108", "label": "tilapia"},
    {"name": "FOODON_03302109", "label": "fish sauce"},
    
    # Sesame & Other Common Ingredients
    {"name": "FOODON_03302201", "label": "sesame food product"},
    {"name": "FOODON_03302202", "label": "sesame"},
    {"name": "FOODON_03302203", "label": "sesame seed"},
    {"name": "FOODON_03302204", "label": "sesame oil"},
    {"name": "FOODON_03302205", "label": "tahini"},
    {"name": "FOODON_03302301", "label": "garlic"},
    {"name": "FOODON_03302302", "label": "onion"},
    {"name": "FOODON_03302303", "label": "sugar"},
    {"name": "FOODON_03302304", "label": "salt"},
    {"name": "FOODON_03302305", "label": "water"},
    {"name": "FOODON_03302306", "label": "palm oil"},
    {"name": "FOODON_03302307", "label": "olive oil"},
    {"name": "FOODON_03302308", "label": "cocoa"},
    {"name": "FOODON_03302309", "label": "vanillin"},
    {"name": "FOODON_03302310", "label": "basil"},
    {"name": "FOODON_03302311", "label": "black pepper"},
    {"name": "FOODON_03302312", "label": "chili"},
    {"name": "FOODON_03302313", "label": "rapeseed oil"},
    {"name": "FOODON_03302314", "label": "sunflower oil"},
    {"name": "FOODON_03302315", "label": "lactic acid"},
    {"name": "FOODON_03302316", "label": "citric acid"},
    {"name": "FOODON_03302317", "label": "banana"},
    {"name": "FOODON_03302318", "label": "apple"},
    {"name": "FOODON_03302319", "label": "mango"},
    {"name": "FOODON_03302320", "label": "strawberry"},
    {"name": "FOODON_03302321", "label": "rice"},
    {"name": "FOODON_03302322", "label": "corn"},
    {"name": "FOODON_03302323", "label": "beef"},
    {"name": "FOODON_03302324", "label": "pork"},
    {"name": "FOODON_03302325", "label": "chicken"},
    
    # Vietnamese Synonyms as Nodes
    {"name": "VN_001", "label": "sữa"},
    {"name": "VN_002", "label": "trứng"},
    {"name": "VN_003", "label": "tôm"},
    {"name": "VN_004", "label": "cua"},
    {"name": "VN_005", "label": "đậu nành"},
    {"name": "VN_006", "label": "đậu phộng"},
    {"name": "VN_007", "label": "hạt điều"},
    {"name": "VN_008", "label": "bột mì"},
    {"name": "VN_009", "label": "hải sản"},
    {"name": "VN_010", "label": "cá"},
    {"name": "VN_011", "label": "mè"},
    {"name": "VN_012", "label": "bơ"},
    {"name": "VN_013", "label": "phô mai"},
]

def load_data_from_neo4j(driver=None):
    """Load food ontology nodes into memory cache from Neo4j or fallback."""
    global NODES_CACHE
    NODES_CACHE.clear()
    
    if driver is not None:
        try:
            driver.verify_connectivity()
            with driver.session() as session:
                result = session.run("MATCH (n:Food) RETURN n.name AS name, n.label AS label")
                for record in result:
                    name = record["name"] or ""
                    label = (record["label"] or "").strip().lower()
                    if label:
                        NODES_CACHE.append({"name": name, "label": label})
                if NODES_CACHE:
                    print(f"✅ Loaded {len(NODES_CACHE)} FoodOn ontology nodes from Neo4j.")
                    return
        except Exception as e:
            print(f"ℹ️ Neo4j offline / not reachable: {e}. Switching to in-memory FoodOn ontology cache.")

    NODES_CACHE = [dict(n) for n in DEFAULT_FOOD_NODES]
    print(f"✅ In-Memory FoodOn Knowledge Graph Initialized: {len(NODES_CACHE)} core food nodes.")

def hybrid_scorer_07_03(s1: str, s2: str) -> float:
    """
    Dual-axis matching score:
    0.7 * Character Similarity (fuzz.ratio) + 0.3 * Token Similarity (fuzz.token_set_ratio)
    """
    if not s1 or not s2:
        return 0.0
    
    s1_l = s1.lower().strip()
    s2_l = s2.lower().strip()
    
    # Exact match gives 100
    if s1_l == s2_l:
        return 100.0
    
    # Direct substring containment bonus
    if s1_l in s2_l or s2_l in s1_l:
        bonus = 20.0
    else:
        bonus = 0.0
        
    char_score = fuzz.ratio(s1_l, s2_l)
    token_score = fuzz.token_set_ratio(s1_l, s2_l)
    
    score = (0.7 * char_score) + (0.3 * token_score) + bonus
    return min(100.0, score)

def find_top_nodes_in_memory(text: str, top_k: int = 5) -> List[Dict]:
    """Find the top K matching food nodes for a given query text."""
    if not text:
        return []
    
    if not NODES_CACHE:
        load_data_from_neo4j(None)
        
    scored = []
    text_clean = text.lower().strip()
    
    for node in NODES_CACHE:
        label = node["label"]
        score = hybrid_scorer_07_03(text_clean, label)
        if score > 40.0:  # Minimum relevant threshold
            scored.append({"node": node, "score": score})
            
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]

def find_best_node_text(clean_text: str) -> Optional[Dict]:
    """Find the best matching node for a cleaned text term."""
    if not clean_text:
        return None
    
    top = find_top_nodes_in_memory(clean_text, top_k=1)
    if top and top[0]["score"] >= 50.0:
        return top[0]["node"]
    
    # If not found in high score, return dynamic node fallback for safety
    return {"name": f"FOODON_USER_{clean_text.replace(' ', '_')}", "label": clean_text}
