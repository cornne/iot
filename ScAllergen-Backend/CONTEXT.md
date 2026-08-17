# CONTEXT.md — Sadie's Link & NutriViet ScAllergen Domain Model

This document defines the ubiquitous language, architectural boundaries, and core domain concepts for the **Sadie's Link Smart Glasses & NutriViet ScAllergen AI System**.

---

## 📖 Ubiquitous Domain Language (Glossary)

| Domain Term | Technical Concept & Definition |
|---|---|
| **ScAllergen** | AI-powered Allergen Detection System matching food ingredients against personal allergen profiles using Gemini 2.5 OCR & FoodOn Neo4j Knowledge Graph. |
| **HybridFuzzyScorer** | Dual-axis string matching algorithm: $S_{hybrid} = w \cdot S_{char} + (1 - w) \cdot S_{token}$ combining character Levenshtein/Jaro-Winkler and token overlap scores. |
| **FoodOnGraph** | Graph Database instance (Neo4j) containing 15,905 food ontology nodes, subclass hierarchy, and allergen derivative relationships (`IS_A`, `DERIVED_FROM`, `CONTAINS`). |
| **HapticERM** | ESP32-S3 Eccentric Rotating Mass haptic vibration motor feedback: 100ms single pulse for safe products, 200ms double pulse for allergen alerts. |
| **TrafficAssistant** | YOLOv8-Nano object detection module detecting traffic lights, classifying HSV color states, reading 7-segment LED countdowns, and compensating for RTT network latency ($t_{latency} = 400\text{ms}$). |
| **GestureInterface** | MediaPipe 3D Hand Landmark detection tracking 21 spatial points at 31 FPS, calculating gesture velocities ($v_x > 0.5\text{m/s}$) and virtual plane keypresses ($d_{plane} \le 2\text{mm}$). |
| **TunnelBearAuth** | Firebase Authentication gateway featuring interactive 31-frame bear mascot animations responding to user focus and password visibility states. |

---

## 🏗️ Deep Module Architecture Seams

1. **Frontend Web UI (`web/`)**:
   - `index.html`: Cybernetic Glassmorphic UI container with dual screens (`landingScreen`, `dashboardScreen`).
   - `style.css`: Unified CSS variables design system with `backdrop-filter: blur(16px)` glass panels and ambient liquid particle physics.
   - `app.js`: Encapsulated module manager handling state, TunnelBear avatar animation states, allergen profile badges, camera dropzone laser scanning, and FastAPI endpoint communication.
   - `liquid-glass-engine.js`: Pure Three.js 3D WebGL background engine rendering glass torus knot and floating icosahedron crystals.

2. **Backend API (`server/`)**:
   - `main.py`: FastAPI application serving `/scan`, `/allergens`, `/health`, and `/sql/logs` endpoints.
   - `lib/fuzzy_matching.py`: Hybrid fuzzy matching implementation over Neo4j in-memory nodes.
   - `lib/allergens_detection.py`: Graph traversal algorithm tracing allergen risk paths.
   - `database.py`: Polyglot persistence logger writing scan logs to SQLite/SQL and Neo4j.
