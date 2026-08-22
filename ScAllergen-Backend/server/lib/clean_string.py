import re
import unicodedata

def clean_string(text: str) -> str:
    """
    Clean and normalize input string for fuzzy matching.
    Removes Markdown emphasis (*, _), excess punctuation, extra whitespaces.
    """
    if not text:
        return ""
    
    # Strip basic whitespace
    s = str(text).strip()
    
    # Remove markdown emphasis like _milk_ or **nuts**
    s = re.sub(r'[*_~`]', ' ', s)
    
    # Remove brackets and contents or special chars if needed, but keep core words
    s = re.sub(r'[()\[\]{}:;,\/\\<>!?#&%"]', ' ', s)
    
    # Replace multiple spaces with a single space
    s = re.sub(r'\s+', ' ', s).strip()
    
    return s.lower()
