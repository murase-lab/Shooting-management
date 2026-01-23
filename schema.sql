-- Shooting Master Database Schema for Cloudflare D1

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_image TEXT,
  status TEXT DEFAULT 'planning',
  shooting_date TEXT,
  category TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 小道具テーブル
CREATE TABLE IF NOT EXISTS props (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  image TEXT,
  checked INTEGER DEFAULT 0,
  notes TEXT,
  delivery TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- カットテーブル
CREATE TABLE IF NOT EXISTS cuts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scene TEXT,
  original_image TEXT,
  ai_generated_image TEXT,
  angle TEXT,
  lighting TEXT,
  comments TEXT,
  status TEXT DEFAULT 'draft',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- カット-小道具関連テーブル
CREATE TABLE IF NOT EXISTS cut_props (
  cut_id TEXT NOT NULL,
  prop_id TEXT NOT NULL,
  PRIMARY KEY (cut_id, prop_id),
  FOREIGN KEY (cut_id) REFERENCES cuts(id) ON DELETE CASCADE,
  FOREIGN KEY (prop_id) REFERENCES props(id) ON DELETE CASCADE
);

-- カット-モデル関連テーブル
CREATE TABLE IF NOT EXISTS cut_models (
  cut_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  PRIMARY KEY (cut_id, model_id),
  FOREIGN KEY (cut_id) REFERENCES cuts(id) ON DELETE CASCADE,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- モデルテーブル
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  height INTEGER,
  top_size TEXT,
  bottom_size TEXT,
  shoe_size TEXT,
  model_type TEXT DEFAULT 'agency',
  agency_name TEXT,
  portfolio_url TEXT,
  instagram_url TEXT,
  image TEXT,
  memo TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_props_project_id ON props(project_id);
CREATE INDEX IF NOT EXISTS idx_cuts_project_id ON cuts(project_id);
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
