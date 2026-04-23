CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS ble_config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Tea catalog
CREATE TABLE IF NOT EXISTS tea_category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tea (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    category_id INTEGER NOT NULL,
    brew_temp INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES tea_category(id)
);

CREATE TABLE IF NOT EXISTS brewing_style (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS brewing_instructions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tea_id INTEGER NOT NULL,
    style_id INTEGER NOT NULL,
    grams_per_100ml REAL NOT NULL,
    first_infusion_seconds INTEGER NOT NULL,
    increment_seconds INTEGER NOT NULL,
    max_infusions INTEGER NOT NULL,
    FOREIGN KEY (tea_id) REFERENCES tea(id),
    FOREIGN KEY (style_id) REFERENCES brewing_style(id),
    UNIQUE(tea_id, style_id)
);

-- Brew history (offline support)
CREATE TABLE IF NOT EXISTS brew (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tea_id INTEGER NOT NULL,
    instructions_id INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_seconds INTEGER,
    infusion_count INTEGER,
    status TEXT DEFAULT 'in_progress',
    FOREIGN KEY (tea_id) REFERENCES tea(id),
    FOREIGN KEY (instructions_id) REFERENCES brewing_instructions(id)
);