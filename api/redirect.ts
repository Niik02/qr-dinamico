import type { IncomingMessage, ServerResponse } from 'http';
import { QRCodeDatabase } from '../src/server/db.ts';

// Helper to sanitize destination URL (ensures http:// or https://)
function sanitizeDestinationUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
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

export default async function handler(req: any, res: any) {
  // Extract code from query params (e.g. ?code=001) or from URL path
  let code = (req.query?.code as string) || '';

  if (!code && req.url) {
    const urlObj = new URL(req.url, 'http://localhost');
    code = urlObj.searchParams.get('code') || '';
    if (!code) {
      const match = urlObj.pathname.match(/\/r\/([^/?#]+)/);
      if (match) code = match[1];
    }
  }

  code = (code || '').trim();

  if (!code) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(renderStatusPage('Código não especificado', 'Nenhum código foi fornecido na URL.', 'N/A', 'not_found'));
  }

  try {
    const item = await QRCodeDatabase.getByCode(code);

    // 1. Not found
    if (!item) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(
        renderStatusPage(
          'QR Code não encontrado',
          `O QR Code com identificador "${code}" não foi encontrado em nosso sistema ou pode ter sido removido.`,
          code,
          'not_found'
        )
      );
    }

    // 2. Inactive
    if (!item.active) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(
        renderStatusPage(
          'Este QR Code está temporariamente desativado.',
          'O administrador deste QR Code pausou o redirecionamento. O código físico continua válido e funcionará assim que for reativado no painel.',
          code,
          'inactive'
        )
      );
    }

    // 3. Empty destination
    const destination = sanitizeDestinationUrl(item.destination_url);
    if (!destination) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(
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
      console.error('[Vercel Serverless] Failed to record scan for', item.code, err);
    });

    // 5. Fast HTTP 302 Redirection
    res.statusCode = 302;
    res.setHeader('Location', destination);
    return res.end();
  } catch (err: any) {
    console.error('[Vercel Serverless] Error handling /api/redirect:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(
      renderStatusPage(
        'Erro ao processar redirecionamento',
        'Ocorreu uma falha temporária ao consultar o banco de dados. Por favor, tente novamente.',
        code,
        'not_found'
      )
    );
  }
}
