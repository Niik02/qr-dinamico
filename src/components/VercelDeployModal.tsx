import React, { useState } from 'react';
import {
  X,
  Server,
  Copy,
  Check,
  Database,
  Globe,
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface VercelDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const VercelDeployModal: React.FC<VercelDeployModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testUrlInput, setTestUrlInput] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestDatabase = async (useInput = false) => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const endpoint = '/api/test-db';
      const options: RequestInit = useInput && testUrlInput.trim()
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ databaseUrl: testUrlInput.trim() }),
          }
        : { method: 'GET' };

      const res = await fetch(endpoint, options);
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Falha ao executar teste.',
        cause: 'Erro de rede ou servidor inacessível.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const sqlSchema = `CREATE TABLE IF NOT EXISTS qr_codes (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  destination_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN DEFAULT TRUE NOT NULL,
  user_id VARCHAR(64),
  scan_count INTEGER DEFAULT 0 NOT NULL,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes (code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes (active);`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Guia de Deploy na Vercel & Banco de Dados</h2>
              <p className="text-xs text-gray-500">Configuração passo a passo e teste de conexão PostgreSQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-700">
          {/* DIAGNOSTIC TEST SECTION */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                Diagnóstico de Conexão com o Banco PostgreSQL
              </span>
              <button
                type="button"
                onClick={() => handleTestDatabase(false)}
                disabled={isTesting}
                className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testando...' : 'Testar DATABASE_URL'}</span>
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              Testa a conexão de forma <strong>100% não-destrutiva</strong>, checando se o PostgreSQL responde, se a tabela <code>qr_codes</code> existe e listando registros de exemplo.
            </p>

            {/* Test Custom URL */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={testUrlInput}
                onChange={(e) => setTestUrlInput(e.target.value)}
                placeholder="Ou cole a DATABASE_URL aqui para testar antes de salvar..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => handleTestDatabase(true)}
                disabled={isTesting || !testUrlInput.trim()}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md disabled:opacity-50"
              >
                Testar URL digitada
              </button>
            </div>

            {/* Test Results Banner */}
            {testResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                  testResult.connected && testResult.tableExists
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : testResult.connected && !testResult.tableExists
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center font-bold text-sm gap-1.5">
                  {testResult.connected && testResult.tableExists ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Conexão e Tabela OK! ({testResult.totalRecords} registros cadastrados)</span>
                    </>
                  ) : testResult.connected && !testResult.tableExists ? (
                    <>
                      <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Conectado, mas a tabela "qr_codes" ainda não existe!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>Falha de Conexão com o PostgreSQL</span>
                    </>
                  )}
                </div>

                {testResult.version && (
                  <div className="text-gray-600">Versão: {testResult.version}</div>
                )}

                {testResult.message && <div>{testResult.message}</div>}

                {testResult.actionRequired && (
                  <div className="font-semibold text-amber-800 bg-amber-100/60 p-2 rounded">
                    👉 Ação necessária: {testResult.actionRequired}
                  </div>
                )}

                {testResult.cause && (
                  <div>
                    <strong>Causa:</strong> {testResult.cause}
                  </div>
                )}

                {testResult.hint && (
                  <div>
                    <strong>Como corrigir:</strong> {testResult.hint}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Vercel Environment Variables */}
          <div>
            <div className="flex items-center space-x-2 font-bold text-gray-900 mb-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>1. Variáveis de Ambiente na Vercel</span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              No painel da <strong>Vercel &gt; Settings &gt; Environment Variables</strong>, adicione as duas variáveis abaixo separadamente (Key e Value):
            </p>

            {/* Warning callout */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-xs text-amber-900 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Atenção Crítica:</strong> NUNCA use a URL do Supabase (<code className="font-mono text-xs bg-amber-100 px-1 rounded">*.supabase.co</code>) no <code className="font-mono text-xs bg-amber-100 px-1 rounded">NEXT_PUBLIC_APP_URL</code>. A URL pública deve ser o seu domínio na Vercel (onde a aplicação roda). O Supabase é usado apenas na <code className="font-mono text-xs bg-amber-100 px-1 rounded">DATABASE_URL</code>.
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Var 1 */}
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Variável 1 (Pública): Endereço do seu app</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Nos QR Codes</span>
                </div>
                <div className="flex items-center justify-between font-mono bg-white px-2 py-1 rounded border border-gray-200">
                  <span className="text-blue-700 font-bold">NEXT_PUBLIC_APP_URL</span>
                  <button
                    onClick={() => copyToClipboard('NEXT_PUBLIC_APP_URL', 'key1')}
                    title="Copiar Nome da Chave"
                    className="p-1 text-gray-400 hover:text-gray-700 rounded text-[10px] inline-flex items-center gap-1"
                  >
                    {copiedKey === 'key1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Key</span>
                  </button>
                </div>
                <div className="flex items-center justify-between font-mono bg-white px-2 py-1 rounded border border-gray-200 text-gray-600">
                  <span className="truncate">https://seu-dominio.com</span>
                  <button
                    onClick={() => copyToClipboard('https://seu-dominio.com', 'val1')}
                    title="Copiar Valor de Exemplo"
                    className="p-1 text-gray-400 hover:text-gray-700 rounded text-[10px] inline-flex items-center gap-1"
                  >
                    {copiedKey === 'val1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Value</span>
                  </button>
                </div>
              </div>

              {/* Var 2 */}
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Variável 2 (Privada): Conexão PostgreSQL</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Somente Backend</span>
                </div>
                <div className="flex items-center justify-between font-mono bg-white px-2 py-1 rounded border border-gray-200">
                  <span className="text-emerald-700 font-bold">DATABASE_URL</span>
                  <button
                    onClick={() => copyToClipboard('DATABASE_URL', 'key2')}
                    title="Copiar Nome da Chave"
                    className="p-1 text-gray-400 hover:text-gray-700 rounded text-[10px] inline-flex items-center gap-1"
                  >
                    {copiedKey === 'key2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Key</span>
                  </button>
                </div>
                <div className="flex items-center justify-between font-mono bg-white px-2 py-1 rounded border border-gray-200 text-gray-500">
                  <span className="truncate text-[11px]">postgresql://postgres:[SENHA]@db.[REF].supabase.co:5432/postgres</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Database Schema (Supabase / Postgres) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 font-bold text-gray-900">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>2. Script SQL de Criação de Tabelas (Supabase / PostgreSQL)</span>
              </div>
              <button
                onClick={() => copyToClipboard(sqlSchema, 'sql')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
              >
                {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar SQL</span>
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              No Supabase (ou Neon / Vercel Postgres), abra o <strong>SQL Editor</strong> e execute o script abaixo:
            </p>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-40">
              {sqlSchema}
            </pre>
          </div>

          {/* Section 3: How Redirection Works */}
          <div>
            <div className="flex items-center space-x-2 font-bold text-gray-900 mb-2">
              <Terminal className="w-4 h-4 text-purple-600" />
              <span>3. Como Funciona o Redirecionamento em Produção</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
              <li>
                URL impressa na placa física: <strong className="font-mono text-gray-800">https://seu-dominio.com/r/001</strong>
              </li>
              <li>
                O servidor Express / Vercel Serverless recebe a requisição, busca o registro <span className="font-mono font-bold">001</span> no banco de dados e retorna um redirecionamento HTTP 302 imediato para o destino.
              </li>
              <li>
                Ao alterar o link no painel para qualquer outra URL, a placa física continua funcionando perfeitamente sem necessidade de reimpressão.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-500">
            Mais detalhes disponíveis no arquivo <span className="font-mono font-semibold">DEPLOY_VERCEL.md</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
