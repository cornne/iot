"""
Allergen Graph Traversal & Conflict Detection Module
Traces allergen risk paths through Neo4j Graph DB or in-memory hierarchical taxonomy.
"""

from typing import List, Optional

# Hierarchical allergen family mapping
ALLERGEN_TAXONOMY = {
    "dairy": {
        "canonical": "dairy food product",
        "aliases": ["dairy", "dairy food product", "milk", "sữa", "bơ", "phô mai", "kem", "whey"],
        "members": [
            "dairy food product", "milk", "cow milk", "skimmed milk", "whole milk",
            "milk powder", "milk cream", "cream", "butter", "cheese", "cheddar cheese",
            "mozzarella cheese", "yogurt", "whey", "whey powder", "whey protein",
            "casein", "lactose", "condensed milk", "ghee", "curd", "buttermilk",
            "sữa tươi", "sữa đặc", "bơ lạt", "bơ thực vật", "phô mai que"
        ]
    },
    "egg": {
        "canonical": "egg food product",
        "aliases": ["egg", "egg food product", "trứng", "trứng gà", "trứng vịt"],
        "members": [
            "egg food product", "egg", "eggs", "egg white", "egg yolk",
            "albumin", "ovalbumin", "mayonnaise", "powdered egg", "egg lecithin",
            "trứng gà", "trứng vịt", "lòng trắng trứng", "lòng đỏ trứng"
        ]
    },
    "soy": {
        "canonical": "soybean food product",
        "aliases": ["soy", "soya", "soybean", "soybean food product", "đậu nành", "đậu phụ", "tàu hũ"],
        "members": [
            "soybean food product", "soy", "soya", "soybean", "soybeans",
            "soy lecithin", "lecithin", "tofu", "soy sauce", "edamame", "soy protein",
            "soy flour", "soy milk", "đậu nành", "đậu phụ", "tàu hũ", "nước tương"
        ]
    },
    "peanut": {
        "canonical": "peanut food product",
        "aliases": ["peanut", "peanut food product", "peanuts", "đậu phộng", "lạc"],
        "members": [
            "peanut food product", "peanut", "peanuts", "peanut butter",
            "peanut oil", "peanut flour", "groundnut", "roasted peanut",
            "đậu phộng", "lạc", "bơ đậu phộng", "dầu phộng"
        ]
    },
    "nut": {
        "canonical": "nut food product",
        "aliases": ["nut", "nuts", "tree nut", "nut food product", "hạt điều", "hạnh nhân", "óc chó", "hạt dẻ"],
        "members": [
            "nut food product", "tree nut", "almond", "cashew", "cashew nuts",
            "walnut", "hazelnut", "hazelnuts", "pistachio", "pecan", "macadamia",
            "chestnut", "brazil nut", "pine nut", "hạt điều", "hạnh nhân", "óc chó",
            "hạt phỉ", "hạt dẻ cười", "hạt macca"
        ]
    },
    "wheat": {
        "canonical": "wheat food product",
        "aliases": ["wheat", "wheat food product", "flour", "gluten", "bột mì", "lúa mì"],
        "members": [
            "wheat food product", "wheat", "wheat flour", "flour", "gluten",
            "wheat gluten", "semolina", "barley", "rye", "spelt", "bulgur",
            "couscous", "bread", "pasta", "noodle", "bột mì", "lúa mì", "mì gói"
        ]
    },
    "shellfish": {
        "canonical": "shellfish food product",
        "aliases": ["shellfish", "shellfish food product", "crustacean", "tôm", "cua", "ghẹ", "hải sản", "sò", "ốc", "hàu"],
        "members": [
            "shellfish food product", "crustacean food product", "shrimp", "prawn",
            "crab", "lobster", "crayfish", "mollusc", "clam", "mussel", "oyster",
            "scallop", "squid", "octopus", "tôm", "cua", "ghẹ", "sò", "ốc", "nghêu", "hàu", "mực", "bạch tuộc"
        ]
    },
    "fish": {
        "canonical": "fish food product",
        "aliases": ["fish", "fish food product", "cá", "cá biển"],
        "members": [
            "fish food product", "fish", "salmon", "tuna", "cod", "anchovy",
            "mackerel", "tilapia", "sardine", "trout", "fish sauce", "cá",
            "cá hồi", "cá ngừ", "cá thu", "cá nục", "nước mắm"
        ]
    },
    "sesame": {
        "canonical": "sesame food product",
        "aliases": ["sesame", "sesame food product", "mè", "vừng"],
        "members": [
            "sesame food product", "sesame", "sesame seed", "sesame oil",
            "tahini", "mè", "vừng", "dầu mè"
        ]
    }
}

def _resolve_allergen_family(label: str) -> Optional[str]:
    """Find which allergen family a user label belongs to."""
    label_clean = (label or "").strip().lower()
    for fam_key, fam_data in ALLERGEN_TAXONOMY.items():
        if label_clean == fam_key or label_clean == fam_data["canonical"]:
            return fam_key
        if any(alias in label_clean or label_clean in alias for alias in fam_data["aliases"]):
            return fam_key
        if any(member in label_clean or label_clean in member for member in fam_data["members"]):
            return fam_key
    return None

def check_graph_connection(node_label: str, mapped_user_allergies_label: List[str], driver=None) -> Optional[str]:
    """
    Check if a scanned ingredient node relates to any user allergen.
    Returns the allergen label if conflict is detected, otherwise None.
    """
    if not node_label or not mapped_user_allergies_label:
        return None
        
    node_clean = node_label.strip().lower()
    
    # 1. Try Neo4j Graph Traversal if driver is connected
    if driver is not None:
        try:
            with driver.session() as session:
                for u_allergen in mapped_user_allergies_label:
                    u_clean = (u_allergen or "").strip().lower()
                    if not u_clean:
                        continue
                    query = """
                    MATCH (a:Food) WHERE toLower(a.label) = $node_label
                    MATCH (b:Food) WHERE toLower(b.label) = $u_allergen
                    MATCH path = shortestPath((a)-[:IS_A|DERIVES_FROM|HAS_INGREDIENT|CONTAINS*1..7]-(b))
                    RETURN b.label AS allergen_label
                    LIMIT 1
                    """
                    result = session.run(query, node_label=node_clean, u_allergen=u_clean)
                    record = result.single()
                    if record and record["allergen_label"]:
                        return record["allergen_label"]
        except Exception:
            # Fallback to taxonomic rules
            pass

    # 2. In-Memory Hierarchical Taxonomy Matching
    ingredient_family = _resolve_allergen_family(node_clean)
    
    for u_allergen in mapped_user_allergies_label:
        u_clean = (u_allergen or "").strip().lower()
        if not u_clean:
            continue
            
        # Direct string containment
        if u_clean in node_clean or node_clean in u_clean:
            return u_allergen
            
        user_family = _resolve_allergen_family(u_clean)
        
        # If both belong to the same allergen family -> conflict!
        if ingredient_family and user_family and (ingredient_family == user_family):
            return u_allergen
            
        # Check if the ingredient is listed in user allergen family members
        if user_family and user_family in ALLERGEN_TAXONOMY:
            members = ALLERGEN_TAXONOMY[user_family]["members"]
            if any(m in node_clean or node_clean in m for m in members):
                return u_allergen

    return None
