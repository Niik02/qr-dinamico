-- Schema SQL para PostgreSQL / Supabase / Neon / Vercel Postgres
-- Sistema: QR Dinâmico

CREATE TABLE IF NOT EXISTS qr_codes (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  destination_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN DEFAULT TRUE NOT NULL,
  user_id VARCHAR(64), -- Estrutura multiusuário preparada para futura autenticação
  scan_count INTEGER DEFAULT 0 NOT NULL,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para buscas ultrarrápidas no redirecionamento /r/:code
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes (code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes (active);
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes (user_id);

-- Tabela opcional de usuários para futura expansão multi-tenant
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
