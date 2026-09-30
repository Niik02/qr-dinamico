import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import { QRCodeDatabase, formatThreeDigitCode } from './src/server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize database
QRCodeDatabase.init().catch((err) => {
  console.error('[Server] DB init error:', err);
});

// Helper to sanitize destination URL (ensures http:// or https://)
function sanitizeDestinationUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // Default to https://
  return `https://${trimmed}`;
}

// Helper to determine the public App URL
function getBaseAppUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  // Fallback to current request host
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

// HTML template generator for error/status pages
function renderStatusPage(title: string, subtitle: string, code: string, type: 'not_found' | 'inactive' | 'empty'): string {
  const isInactive = type === 'inactive';
  const isEmpty = type === 'empty';
  const iconColor = isInactive ? '#F59E0B' : isEmpty ? '#3B82F6' : '#EF4444';
  const iconBg = isInactive ? '#FEF3C7' : isEmpty ? '#DBEAFE' : '#FEE2E2';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - QR Dinâmico</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body {
      min-height: 100vh;
      background-color: #FAFAFA;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      color: #111111;
    }
    .card {
      background: #FFFFFF;
      max-width: 480px;
      width: 100%;
      border-radius: 16px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      padding: 2.5rem 2rem;
      text-align: center;
    }
    .icon-box {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem auto;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${iconBg};
      color: ${iconColor};
    }
    .code-badge {
      display: inline-block;
      font-size: 0.85rem;
      font-weight: 700;
      color: #374151;
      background-color: #F3F4F6;
      border: 1px solid #E5E7EB;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1rem;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.75rem;
    }
    p {
      color: #4B5563;
      font-size: 0.975rem;
      line-height: 1.5;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: #2563EB;
      color: #FFFFFF;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      transition: background-color 0.15s ease;
      width: 100%;
    }
    .btn:hover {
      background-color: #1D4ED8;
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: #9CA3AF;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">
      ${
        isInactive
          ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
          : isEmpty
          ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
          : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
      }
    </div>
    <div class="code-badge">ID: ${code}</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <a href="/" class="btn">Acessar Painel Principal</a>
    <div class="footer">QR Dinâmico &copy; Sistema de Redirecionamento Inteligente</div>
  </div>
</body>
</html>`;
}

// ==========================================
// 1. DYNAMIC REDIRECT ROUTE: /r/:code
// ==========================================
app.get('/r/:code', async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    const item = await QRCodeDatabase.getByCode(code);

    // 1. Verify existence
    if (!item) {
      return res.status(404).send(
        renderStatusPage(
          'QR Code não encontrado',
          `O QR Code com identificador "${code}" não foi encontrado em nosso sistema ou pode ter sido removido.`,
          code,
          'not_found'
        )
      );
    }

    // 2. Verify active status
    if (!item.active) {
      return res.status(403).send(
        renderStatusPage(
          'Este QR Code está temporariamente desativado.',
          'O administrador deste QR Code pausou o redirecionamento. O código físico continua válido e funcionará assim que for reativado no painel.',
          code,
          'inactive'
        )
      );
    }

    // 3. Verify destination URL
    const destination = sanitizeDestinationUrl(item.destination_url);
    if (!destination) {
      return res.status(200).send(
        renderStatusPage(
          'Link de destino não configurado',
          `O QR Code "${item.name}" está ativo, mas o link de destino ainda não foi cadastrado no painel administrativo.`,
          code,
          'empty'
        )
      );
    }

    // 4. Record scan asynchronously
    QRCodeDatabase.recordScan(item.code).catch((err) => {
      console.error('[Server] Failed to record scan for', item.code, err);
    });

    // 5. Fast 302 redirection to destination
    return res.redirect(302, destination);
  } catch (err: any) {
    console.error('[Server] Error handling redirect /r/' + code, err);
    return res.status(500).send(
      renderStatusPage(
        'Erro ao processar redirecionamento',
        'Ocorreu uma falha temporária ao consultar o banco de dados. Por favor, tente novamente em instantes.',
        code,
        'not_found'
      )
    );
  }
});

// ==========================================
// 2. REST API ROUTES
// ==========================================

// GET /api/config: returns app URL and runtime info
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    appUrl: getBaseAppUrl(req),
    database: process.env.DATABASE_URL || process.env.POSTGRES_URL ? 'PostgreSQL' : 'JSON Persistent File',
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
  });
});

// Non-destructive PostgreSQL diagnostic helper
async function runPostgresDiagnostic(customUrl?: string) {
  const targetUrl = customUrl || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!targetUrl) {
    return {
      success: false,
      configured: false,
      connected: false,
      error: 'Variável DATABASE_URL não configurada no ambiente.',
      cause: 'A variável de ambiente DATABASE_URL não foi definida no arquivo .env ou no container.',
      hint: 'Crie ou edite o arquivo .env adicionando: DATABASE_URL="postgresql://postgres:[SENHA]@[HOST]:5432/postgres"',
    };
  }

  const client = new pg.Client({
    connectionString: targetUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();

    // 1. Get version
    const versionRes = await client.query('SELECT version();');
    const version = versionRes.rows[0]?.version ? versionRes.rows[0].version.split(',')[0] : 'PostgreSQL';

    // 2. Check if table qr_codes exists
    const tableRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes'
      ) AS table_exists;
    `);

    const tableExists = Boolean(tableRes.rows[0]?.table_exists);

    if (!tableExists) {
      await client.end();
      return {
        success: true,
        configured: true,
        connected: true,
        version,
        tableExists: false,
        totalRecords: 0,
        message: 'Conectado ao PostgreSQL com sucesso, mas a tabela "qr_codes" ainda não existe.',
        actionRequired: 'O script schema.sql precisa ser executado no SQL Editor do banco (ex: Supabase ou Neon).',
      };
    }

    // 3. Read records safely without modifying or deleting anything
    const countRes = await client.query('SELECT COUNT(*)::int AS total FROM qr_codes;');
    const totalRecords = countRes.rows[0]?.total || 0;

    let samples: any[] = [];
    if (totalRecords > 0) {
      const sampleRes = await client.query(`
        SELECT id, code, name, destination_url, active, scan_count, created_at 
        FROM qr_codes 
        ORDER BY code ASC 
        LIMIT 10;
      `);
      samples = sampleRes.rows;
    }

    await client.end();

    return {
      success: true,
      configured: true,
      connected: true,
      version,
      tableExists: true,
      totalRecords,
      samples,
      message: `Conexão bem-sucedida! Tabela "qr_codes" validada com ${totalRecords} registros cadastrados.`,
    };
  } catch (err: any) {
    let cause = 'Falha ao conectar ao servidor PostgreSQL.';
    let hint = 'Verifique se a connection string do banco está correta.';

    if (err.message.includes('password authentication failed')) {
      cause = 'Falha de autenticação: a senha do usuário "postgres" está incorreta.';
      hint = 'Verifique ou redefina a senha do banco no painel do Supabase/PostgreSQL.';
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      cause = 'Host não encontrado: o endereço de domínio do banco é inválido.';
      hint = 'Verifique se copiou a connection string correta sem espaços ou erros no host.';
    } else if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      cause = 'Tempo limite esgotado (timeout de conexão).';
      hint = 'O banco de dados pode estar pausado ou a porta de conexão está bloqueada.';
    } else if (err.message.includes('database') && err.message.includes('does not exist')) {
      cause = 'O banco de dados especificado na URL não existe.';
      hint = 'No Supabase, o banco padrão é "postgres".';
    }

    return {
      success: false,
      configured: true,
      connected: false,
      error: err.message,
      cause,
      hint,
    };
  }
}

// GET /api/test-db: test connection using configured environment variable
app.get('/api/test-db', async (_req: Request, res: Response) => {
  const result = await runPostgresDiagnostic();
  res.json(result);
});

// POST /api/test-db: test connection with provided custom connection string
app.post('/api/test-db', async (req: Request, res: Response) => {
  const { databaseUrl } = req.body || {};
  const result = await runPostgresDiagnostic(databaseUrl);
  res.json(result);
});

// GET /api/qrcodes: list QR codes
app.get('/api/qrcodes', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as 'all' | 'active' | 'inactive' | undefined;

    const [items, stats] = await Promise.all([
      QRCodeDatabase.getAll(search, status),
      QRCodeDatabase.getStats(),
    ]);

    res.json({
      items,
      stats,
    });
  } catch (err: any) {
    console.error('[Server] GET /api/qrcodes error:', err);
    res.status(500).json({ error: err.message || 'Erro ao carregar QR Codes.' });
  }
});

// GET /api/qrcodes/stats: get metrics summary
app.get('/api/qrcodes/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await QRCodeDatabase.getStats();
    res.json(stats);
  } catch (err: any) {
    console.error('[Server] GET /api/qrcodes/stats error:', err);
    res.status(500).json({ error: err.message || 'Erro ao carregar estatísticas.' });
  }
});

// GET /api/qrcodes/next-code: get next sequential 3-digit code
app.get('/api/qrcodes/next-code', async (_req: Request, res: Response) => {
  try {
    const nextNum = await QRCodeDatabase.getNextCodeNumber();
    res.json({
      nextNumber: nextNum,
      formattedCode: formatThreeDigitCode(nextNum),
    });
  } catch (err: any) {
    console.error('[Server] GET /api/qrcodes/next-code error:', err);
    res.status(500).json({ error: err.message || 'Erro ao obter próximo código.' });
  }
});

// POST /api/qrcodes: create single QR code
app.post('/api/qrcodes', async (req: Request, res: Response) => {
  try {
    const { code, name, destination_url, active } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'O código/ID do QR Code é obrigatório.' });
    }

    const created = await QRCodeDatabase.create({
      code: code.trim(),
      name: name?.trim() || `QR ${code.trim()}`,
      destination_url: destination_url ? sanitizeDestinationUrl(destination_url) : '',
      active: active !== undefined ? Boolean(active) : true,
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[Server] POST /api/qrcodes error:', err);
    res.status(400).json({ error: err.message || 'Erro ao criar QR Code.' });
  }
});

// POST /api/qrcodes/bulk: bulk mass creation
app.post('/api/qrcodes/bulk', async (req: Request, res: Response) => {
  try {
    const { quantity, namePrefix, startNumber, defaultDestinationUrl } = req.body;

    const count = parseInt(quantity, 10);
    if (isNaN(count) || count < 1 || count > 1000) {
      return res.status(400).json({ error: 'Quantidade deve ser entre 1 e 1000.' });
    }

    const startNum = startNumber ? parseInt(startNumber, 10) : undefined;
    const defaultUrl = defaultDestinationUrl ? sanitizeDestinationUrl(defaultDestinationUrl) : '';

    const result = await QRCodeDatabase.createBulk({
      quantity: count,
      namePrefix: namePrefix || 'QR',
      startNumber: startNum,
      defaultDestinationUrl: defaultUrl,
    });

    res.status(201).json({
      success: true,
      message: `${result.count} QR Codes criados com sucesso.`,
      count: result.count,
      created: result.created,
    });
  } catch (err: any) {
    console.error('[Server] POST /api/qrcodes/bulk error:', err);
    res.status(400).json({ error: err.message || 'Erro ao gerar QR Codes em massa.' });
  }
});

// PUT /api/qrcodes/:id: update QR code
app.put('/api/qrcodes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, destination_url, active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do QR Code não pode estar vazio.' });
    }

    const sanitizedUrl = destination_url ? sanitizeDestinationUrl(destination_url) : '';

    const updated = await QRCodeDatabase.update(id, {
      name: name.trim(),
      destination_url: sanitizedUrl,
      active: Boolean(active),
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[Server] PUT /api/qrcodes/:id error:', err);
    res.status(400).json({ error: err.message || 'Erro ao atualizar QR Code.' });
  }
});

// PATCH /api/qrcodes/:id/toggle: toggle active status
app.patch('/api/qrcodes/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await QRCodeDatabase.toggleActive(id);
    res.json(updated);
  } catch (err: any) {
    console.error('[Server] PATCH /api/qrcodes/:id/toggle error:', err);
    res.status(400).json({ error: err.message || 'Erro ao alternar status.' });
  }
});

// DELETE /api/qrcodes/:id: delete QR code
app.delete('/api/qrcodes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await QRCodeDatabase.delete(id);
    res.json({
      success: true,
      message: `QR Code ${result.code} excluído com sucesso.`,
      code: result.code,
    });
  } catch (err: any) {
    console.error('[Server] DELETE /api/qrcodes/:id error:', err);
    res.status(400).json({ error: err.message || 'Erro ao excluir QR Code.' });
  }
});

// POST /api/qrcodes/batch-delete: delete multiple QR codes
app.post('/api/qrcodes/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhum ID fornecido para exclusão.' });
    }

    const result = await QRCodeDatabase.deleteMany(ids);
    res.json({
      success: true,
      message: `${result.count} QR Codes excluídos com sucesso.`,
      count: result.count,
    });
  } catch (err: any) {
    console.error('[Server] POST /api/qrcodes/batch-delete error:', err);
    res.status(400).json({ error: err.message || 'Erro ao excluir QR Codes em lote.' });
  }
});

// ==========================================
// 3. FRONTEND INTEGRATION (Vite Dev / Prod)
// ==========================================
async function start() {
  if (process.env.NODE_ENV === 'production') {
    // Serve static build from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite dev server in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QR Dinâmico] Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

// Export Express app for Vercel Serverless Function compatibility
export default app;

// Only start the standalone HTTP listener when executed directly (not when imported by /api/index.ts or on Vercel)
const isDirectRun = Boolean(
  process.argv[1] &&
    (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))
);

if (isDirectRun && process.env.VERCEL !== '1') {
  start().catch((err) => {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  });
}

