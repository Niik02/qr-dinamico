import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  QRCodeRecord,
  QRCodeStats,
  CreateQRCodePayload,
  BulkCreatePayload,
  UpdateQRCodePayload,
} from '../types/qrcode.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory and file for persistent JSON database
// On Vercel serverless, only /tmp is writable
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? '/tmp/data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'qrcodes.json');

// In-memory fallback if file system is read-only
let memoryRecords: QRCodeRecord[] = [];

// Check if PostgreSQL is configured (Vercel Postgres, Supabase, Neon, etc.)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let pgPool: pg.Pool | null = null;

if (databaseUrl) {
  try {
    pgPool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    console.log('[Database] Connected to PostgreSQL / Supabase backend');
  } catch (err) {
    console.error('[Database] Failed to initialize PostgreSQL pool, falling back to local file storage:', err);
    pgPool = null;
  }
}

// Ensure data folder and file exist for local file-based storage
function ensureLocalDbFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[Database] Could not write to filesystem, using in-memory store:', err);
  }
}

// Read records from local JSON database
function readLocalRecords(): QRCodeRecord[] {
  ensureLocalDbFile();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryRecords = parsed;
      return parsed;
    }
  } catch (err) {
    console.error('[Database] Error reading local JSON database:', err);
  }
  return memoryRecords;
}

// Write records to local JSON database atomically
function writeLocalRecords(records: QRCodeRecord[]): void {
  memoryRecords = records;
  try {
    ensureLocalDbFile();
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(records, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.warn('[Database] Filesystem write failed, retained in memory:', err);
  }
}

// Generate sequential 3-digit code (e.g. 1 -> "001", 99 -> "099", 100 -> "100")
export function formatThreeDigitCode(num: number): string {
  if (num < 10) return `00${num}`;
  if (num < 100) return `0${num}`;
  return `${num}`;
}

// Helper to generate UUID-like id
function generateId(): string {
  return 'qr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

// Normalize code for consistent matching
function normalizeCode(code: string): string {
  return code.trim();
}

export class QRCodeDatabase {
  private static isPgInitialized = false;

  // Initialize DB table if using PostgreSQL
  static async init(): Promise<void> {
    if (pgPool && !this.isPgInitialized) {
      try {
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS qr_codes (
            id VARCHAR(64) PRIMARY KEY,
            code VARCHAR(32) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            destination_url TEXT NOT NULL,
            active BOOLEAN DEFAULT TRUE NOT NULL,
            user_id VARCHAR(64),
            scan_count INTEGER DEFAULT 0 NOT NULL,
            last_scanned_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes (code);
          CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes (active);
        `);
        this.isPgInitialized = true;
        console.log('[Database] PostgreSQL schema verified');
      } catch (err) {
        console.error('[Database] Failed to verify PostgreSQL table schema:', err);
      }
    } else if (!pgPool) {
      ensureLocalDbFile();
    }
  }

  // Get all QR codes with optional search and filter
  static async getAll(search?: string, status?: 'all' | 'active' | 'inactive'): Promise<QRCodeRecord[]> {
    if (pgPool) {
      let query = 'SELECT * FROM qr_codes WHERE 1=1';
      const params: any[] = [];

      if (status === 'active') {
        params.push(true);
        query += ` AND active = $${params.length}`;
      } else if (status === 'inactive') {
        params.push(false);
        query += ` AND active = $${params.length}`;
      }

      if (search && search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        query += ` AND (LOWER(code) LIKE $${params.length} OR LOWER(name) LIKE $${params.length} OR LOWER(destination_url) LIKE $${params.length})`;
      }

      query += ' ORDER BY code ASC';
      const res = await pgPool.query(query, params);
      return res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        destination_url: r.destination_url,
        active: Boolean(r.active),
        user_id: r.user_id,
        scan_count: Number(r.scan_count || 0),
        last_scanned_at: r.last_scanned_at ? new Date(r.last_scanned_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      }));
    }

    // Local JSON storage
    let records = readLocalRecords();

    if (status === 'active') {
      records = records.filter((r) => r.active);
    } else if (status === 'inactive') {
      records = records.filter((r) => !r.active);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.destination_url.toLowerCase().includes(q)
      );
    }

    // Natural sort by code (e.g. 001, 002, 010, 100)
    return records.sort((a, b) => {
      const numA = parseInt(a.code, 10);
      const numB = parseInt(b.code, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.code.localeCompare(b.code);
    });
  }

  // Get QR Code by unique code (e.g. "001")
  static async getByCode(code: string): Promise<QRCodeRecord | null> {
    const norm = normalizeCode(code);
    if (pgPool) {
      const res = await pgPool.query('SELECT * FROM qr_codes WHERE LOWER(code) = LOWER($1) LIMIT 1', [norm]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        destination_url: r.destination_url,
        active: Boolean(r.active),
        user_id: r.user_id,
        scan_count: Number(r.scan_count || 0),
        last_scanned_at: r.last_scanned_at ? new Date(r.last_scanned_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      };
    }

    const records = readLocalRecords();
    return records.find((r) => r.code.toLowerCase() === norm.toLowerCase()) || null;
  }

  // Get next available numeric code number
  static async getNextCodeNumber(): Promise<number> {
    if (pgPool) {
      const res = await pgPool.query('SELECT code FROM qr_codes');
      let maxNum = 0;
      for (const row of res.rows) {
        const num = parseInt(row.code, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
      return maxNum + 1;
    }

    const records = readLocalRecords();
    let maxNum = 0;
    for (const r of records) {
      const num = parseInt(r.code, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
    return maxNum + 1;
  }

  // Create single QR Code
  static async create(payload: CreateQRCodePayload): Promise<QRCodeRecord> {
    const code = normalizeCode(payload.code);
    const existing = await this.getByCode(code);
    if (existing) {
      throw new Error(`O identificador "${code}" já está em uso.`);
    }

    const now = new Date().toISOString();
    const newRecord: QRCodeRecord = {
      id: generateId(),
      code,
      name: payload.name.trim() || `QR ${code}`,
      destination_url: payload.destination_url.trim(),
      active: payload.active !== undefined ? payload.active : true,
      scan_count: 0,
      last_scanned_at: null,
      created_at: now,
      updated_at: now,
    };

    if (pgPool) {
      await pgPool.query(
        `INSERT INTO qr_codes (id, code, name, destination_url, active, scan_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newRecord.id,
          newRecord.code,
          newRecord.name,
          newRecord.destination_url,
          newRecord.active,
          newRecord.scan_count,
          newRecord.created_at,
          newRecord.updated_at,
        ]
      );
      return newRecord;
    }

    const records = readLocalRecords();
    records.push(newRecord);
    writeLocalRecords(records);
    return newRecord;
  }

  // Create bulk QR Codes sequentially
  static async createBulk(payload: BulkCreatePayload): Promise<{ created: QRCodeRecord[]; count: number }> {
    const quantity = Math.max(1, Math.min(1000, Number(payload.quantity) || 1));
    const namePrefix = (payload.namePrefix || 'QR').trim();
    
    // Determine start number
    let currentNumber = payload.startNumber && payload.startNumber > 0
      ? payload.startNumber
      : await this.getNextCodeNumber();

    const created: QRCodeRecord[] = [];
    const now = new Date().toISOString();
    const defaultUrl = (payload.defaultDestinationUrl || '').trim();

    if (pgPool) {
      // Fetch existing codes to prevent conflicts
      const existingRes = await pgPool.query('SELECT code FROM qr_codes');
      const existingCodes = new Set(existingRes.rows.map((r) => r.code.toLowerCase()));

      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        while (created.length < quantity) {
          const codeFormatted = formatThreeDigitCode(currentNumber);
          if (!existingCodes.has(codeFormatted.toLowerCase())) {
            const record: QRCodeRecord = {
              id: generateId(),
              code: codeFormatted,
              name: `${namePrefix} ${codeFormatted}`,
              destination_url: defaultUrl,
              active: true,
              scan_count: 0,
              last_scanned_at: null,
              created_at: now,
              updated_at: now,
            };

            await client.query(
              `INSERT INTO qr_codes (id, code, name, destination_url, active, scan_count, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                record.id,
                record.code,
                record.name,
                record.destination_url,
                record.active,
                record.scan_count,
                record.created_at,
                record.updated_at,
              ]
            );
            created.push(record);
            existingCodes.add(codeFormatted.toLowerCase());
          }
          currentNumber++;
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      return { created, count: created.length };
    }

    // Local JSON
    const records = readLocalRecords();
    const existingCodes = new Set(records.map((r) => r.code.toLowerCase()));

    while (created.length < quantity) {
      const codeFormatted = formatThreeDigitCode(currentNumber);
      if (!existingCodes.has(codeFormatted.toLowerCase())) {
        const record: QRCodeRecord = {
          id: generateId(),
          code: codeFormatted,
          name: `${namePrefix} ${codeFormatted}`,
          destination_url: defaultUrl,
          active: true,
          scan_count: 0,
          last_scanned_at: null,
          created_at: now,
          updated_at: now,
        };
        created.push(record);
        existingCodes.add(codeFormatted.toLowerCase());
      }
      currentNumber++;
    }

    records.push(...created);
    writeLocalRecords(records);
    return { created, count: created.length };
  }

  // Update QR Code
  static async update(id: string, payload: UpdateQRCodePayload): Promise<QRCodeRecord> {
    const now = new Date().toISOString();

    if (pgPool) {
      const res = await pgPool.query(
        `UPDATE qr_codes
         SET name = $1, destination_url = $2, active = $3, updated_at = $4
         WHERE id = $5
         RETURNING *`,
        [payload.name.trim(), payload.destination_url.trim(), Boolean(payload.active), now, id]
      );
      if (res.rows.length === 0) {
        throw new Error('QR Code não encontrado.');
      }
      const r = res.rows[0];
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        destination_url: r.destination_url,
        active: Boolean(r.active),
        user_id: r.user_id,
        scan_count: Number(r.scan_count || 0),
        last_scanned_at: r.last_scanned_at ? new Date(r.last_scanned_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      };
    }

    const records = readLocalRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error('QR Code não encontrado.');
    }

    records[idx] = {
      ...records[idx],
      name: payload.name.trim() || records[idx].name,
      destination_url: payload.destination_url.trim(),
      active: Boolean(payload.active),
      updated_at: now,
    };

    writeLocalRecords(records);
    return records[idx];
  }

  // Toggle active status
  static async toggleActive(id: string): Promise<QRCodeRecord> {
    const now = new Date().toISOString();

    if (pgPool) {
      const res = await pgPool.query(
        `UPDATE qr_codes
         SET active = NOT active, updated_at = $1
         WHERE id = $2
         RETURNING *`,
        [now, id]
      );
      if (res.rows.length === 0) {
        throw new Error('QR Code não encontrado.');
      }
      const r = res.rows[0];
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        destination_url: r.destination_url,
        active: Boolean(r.active),
        user_id: r.user_id,
        scan_count: Number(r.scan_count || 0),
        last_scanned_at: r.last_scanned_at ? new Date(r.last_scanned_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      };
    }

    const records = readLocalRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error('QR Code não encontrado.');
    }

    records[idx].active = !records[idx].active;
    records[idx].updated_at = now;
    writeLocalRecords(records);
    return records[idx];
  }

  // Delete single QR Code
  static async delete(id: string): Promise<{ success: boolean; code: string }> {
    if (pgPool) {
      const res = await pgPool.query('DELETE FROM qr_codes WHERE id = $1 RETURNING code', [id]);
      if (res.rows.length === 0) {
        throw new Error('QR Code não encontrado.');
      }
      return { success: true, code: res.rows[0].code };
    }

    const records = readLocalRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error('QR Code não encontrado.');
    }

    const deletedCode = records[idx].code;
    records.splice(idx, 1);
    writeLocalRecords(records);
    return { success: true, code: deletedCode };
  }

  // Batch delete multiple QR Codes
  static async deleteMany(ids: string[]): Promise<{ count: number }> {
    if (ids.length === 0) return { count: 0 };

    if (pgPool) {
      const res = await pgPool.query('DELETE FROM qr_codes WHERE id = ANY($1)', [ids]);
      return { count: res.rowCount || 0 };
    }

    const records = readLocalRecords();
    const initialCount = records.length;
    const idsSet = new Set(ids);
    const filtered = records.filter((r) => !idsSet.has(r.id));
    writeLocalRecords(filtered);
    return { count: initialCount - filtered.length };
  }

  // Record a scan event (increment scan_count and set last_scanned_at)
  static async recordScan(code: string): Promise<void> {
    const norm = normalizeCode(code);
    const now = new Date().toISOString();

    if (pgPool) {
      await pgPool.query(
        `UPDATE qr_codes
         SET scan_count = scan_count + 1, last_scanned_at = $1
         WHERE LOWER(code) = LOWER($2)`,
        [now, norm]
      );
      return;
    }

    const records = readLocalRecords();
    const item = records.find((r) => r.code.toLowerCase() === norm.toLowerCase());
    if (item) {
      item.scan_count = (item.scan_count || 0) + 1;
      item.last_scanned_at = now;
      writeLocalRecords(records);
    }
  }

  // Get statistics summary
  static async getStats(): Promise<QRCodeStats> {
    if (pgPool) {
      const res = await pgPool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE active = TRUE)::int AS active,
          COUNT(*) FILTER (WHERE active = FALSE)::int AS inactive,
          COALESCE(SUM(scan_count), 0)::int AS total_scans
        FROM qr_codes
      `);
      const row = res.rows[0];
      return {
        total: Number(row.total || 0),
        active: Number(row.active || 0),
        inactive: Number(row.inactive || 0),
        totalScans: Number(row.total_scans || 0),
      };
    }

    const records = readLocalRecords();
    const total = records.length;
    const active = records.filter((r) => r.active).length;
    const inactive = total - active;
    const totalScans = records.reduce((sum, r) => sum + (r.scan_count || 0), 0);

    return { total, active, inactive, totalScans };
  }
}
