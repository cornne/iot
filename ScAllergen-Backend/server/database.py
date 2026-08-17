"""
NutriViet ScAllergen / Sadie's Link - Polyglot Persistence Database Layer
Enterprise Hybrid Architecture: SQLite (Relational SQL) + Neo4j (Knowledge Graph)
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "scallergen.db")

def init_sql_database():
    """Khởi tạo cơ sở dữ liệu SQL lưu trữ Người dùng & Lịch sử Quét (Relational DB)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Bảng 1: User Accounts & Profiles (SQL Relational)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            display_name TEXT,
            allergen_profile TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Bảng 2: Scan Logs & History (SQL Relational)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            scanned_text TEXT NOT NULL,
            user_allergens TEXT NOT NULL,
            is_safe INTEGER NOT NULL,
            warnings_json TEXT,
            execution_time_ms REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Bảng 3: Hardware Telemetry Logs (ESP32-S3 IoT SQL Metrics)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hardware_telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            battery_pct INTEGER,
            wifi_rssi INTEGER,
            haptic_events_count INTEGER,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("✅ SQL Database Initialized: scallergen.db (Users, Scan Logs & Hardware Telemetry)")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def log_scan_to_sql(scanned_text: str, user_allergens: list, is_safe: bool, warnings_json: str, execution_time_ms: float = 15.0):
    """Ghi vết lịch sử phân tích vào SQL Database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO scan_logs (scanned_text, user_allergens, is_safe, warnings_json, execution_time_ms)
            VALUES (?, ?, ?, ?, ?)
        """, (scanned_text, str(user_allergens), 1 if is_safe else 0, warnings_json, execution_time_ms))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error logging scan to SQL: {e}")

def get_sql_stats():
    """Trả về thống kê từ SQL Relational Database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM scan_logs")
    scan_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    conn.close()
    return {
        "database_engine": "SQLite 3 (Relational RDBMS)",
        "db_file": "scallergen.db",
        "total_user_accounts": user_count,
        "total_scan_logs": scan_count
    }
