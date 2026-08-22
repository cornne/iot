"""
Synonym Cache Manager for FoodOn Ontology
"""

SYNONYMS_CACHE = {}

DEFAULT_SYNONYMS = {
    "dairy food product": {"milk", "dairy", "cheese", "butter", "cream", "yogurt", "whey", "casein", "curd", "lactose", "sữa", "bơ", "phô mai", "kem sữa", "váng sữa"},
    "milk": {"cow milk", "whole milk", "skimmed milk", "milk powder", "dairy milk", "sữa tươi", "sữa bò"},
    "egg food product": {"egg", "eggs", "egg white", "egg yolk", "albumin", "ovalbumin", "mayonnaise", "trứng", "lòng trắng trứng", "lòng đỏ trứng"},
    "soybean food product": {"soy", "soya", "soybean", "soybeans", "tofu", "soy lecithin", "edamame", "soy sauce", "đậu nành", "đậu phụ", "tàu hũ"},
    "peanut food product": {"peanut", "peanuts", "groundnut", "peanut butter", "peanut oil", "đậu phộng", "lạc", "bơ đậu phộng"},
    "nut food product": {"nut", "tree nut", "nuts", "almond", "cashew", "walnut", "hazelnut", "pistachio", "pecan", "macadamia", "hạt điều", "hạnh nhân", "óc chó", "hạt phỉ"},
    "wheat food product": {"wheat", "flour", "wheat flour", "gluten", "semolina", "spelt", "bulgur", "bột mì", "lúa mì"},
    "shellfish food product": {"shellfish", "shrimp", "prawn", "crab", "lobster", "crayfish", "clam", "mussel", "oyster", "scallop", "tôm", "cua", "ghẹ", "sò", "ốc", "nghêu", "hàu"},
    "fish food product": {"fish", "salmon", "tuna", "cod", "anchovy", "mackerel", "tilapia", "cá", "cá hồi", "cá ngừ", "cá thu"},
    "sesame food product": {"sesame", "sesame seed", "sesame oil", "tahini", "mè", "vừng", "dầu mè"},
}

def load_synonym_cache(driver=None):
    """Load synonym cache from Neo4j if available, otherwise initialize default synonyms."""
    global SYNONYMS_CACHE
    SYNONYMS_CACHE.clear()
    
    # Pre-populate with default synonyms
    for k, syns in DEFAULT_SYNONYMS.items():
        SYNONYMS_CACHE[k.lower()] = set(s.lower() for s in syns)

    if driver is not None:
        try:
            driver.verify_connectivity()
            with driver.session() as session:
                result = session.run("MATCH (n:Food) WHERE n.synonyms IS NOT NULL RETURN n.label AS label, n.synonyms AS synonyms")
                count = 0
                for record in result:
                    label = (record["label"] or "").strip().lower()
                    syns = record["synonyms"] or []
                    if isinstance(syns, str):
                        syns = [syns]
                    if label:
                        if label not in SYNONYMS_CACHE:
                            SYNONYMS_CACHE[label] = set()
                        for s in syns:
                            SYNONYMS_CACHE[label].add(str(s).strip().lower())
                        count += 1
                if count > 0:
                    print(f"✅ Loaded {count} synonym entries from Neo4j.")
        except Exception:
            pass

def get_synonyms_of_label(label: str):
    """Return the set of synonyms for a given FoodOn label."""
    if not label:
        return set()
    cleaned = label.strip().lower()
    return SYNONYMS_CACHE.get(cleaned, set())
