import React, { useState, useEffect, useRef } from 'react';
import { QRCodeRecord } from '../types/qrcode.ts';
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  Sliders,
} from 'lucide-react';
import {
  generateQRCodeCanvas,
  downloadQRCodePNG,
  downloadQRCodeJPEG,
  getQRCodeFilename,
} from '../lib/qrcode-utils.ts';

interface EditQRCodeModalProps {
  record: QRCodeRecord | null;
  baseUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: { name: string; destination_url: string; active: boolean }) => Promise<void>;
}

export const EditQRCodeModal: React.FC<EditQRCodeModalProps> = ({
  record,
  baseUrl,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>('');
  const [destinationUrl, setDestinationUrl] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [downloadResolution, setDownloadResolution] = useState<number>(1000); // 1000x1000 standard
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state when record changes
  useEffect(() => {
    if (record && isOpen) {
      setName(record.name);
      setDestinationUrl(record.destination_url || '');
      setActive(record.active);
      setError(null);
      setSavedSuccess(false);
    }
  }, [record, isOpen]);

  // Render QR Code preview on canvas whenever modal opens or code changes
  useEffect(() => {
    if (record && isOpen) {
      const dynamicUrl = `${baseUrl.replace(/\/$/, '')}/r/${record.code}`;
      generateQRCodeCanvas(dynamicUrl, 400).then((renderedCanvas) => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = renderedCanvas.width;
            canvasRef.current.height = renderedCanvas.height;
            ctx.drawImage(renderedCanvas, 0, 0);
          }
        }
      });
    }
  }, [record, baseUrl, isOpen]);

  if (!isOpen || !record) return null;

  const dynamicUrl = `${baseUrl.replace(/\/$/, '')}/r/${record.code}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(dynamicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = async () => {
    const filename = getQRCodeFilename({ code: record.code, name }, 'png');
    await downloadQRCodePNG(dynamicUrl, filename, downloadResolution);
  };

  const handleDownloadJPEG = async () => {
    const filename = getQRCodeFilename({ code: record.code, name }, 'jpg');
    await downloadQRCodeJPEG(dynamicUrl, filename, downloadResolution);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedSuccess(false);

    if (!name.trim()) {
      setError('O nome do QR Code não pode estar vazio.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(record.id, {
        name: name.trim(),
        destination_url: destinationUrl.trim(),
        active,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-sm font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              ID: {record.code}
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Editar QR Code</h2>
              <p className="text-xs text-gray-500">
                Altere o destino sem precisar reimprimir a placa física
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Left: QR Code Preview & Download */}
          <div className="p-6 flex flex-col items-center justify-between bg-gray-50/50">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Pré-visualização
              </span>
              <span className="text-xs font-medium text-gray-400 font-mono">
                {downloadResolution}x{downloadResolution}px
              </span>
            </div>

            {/* Canvas Box */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs mb-4 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-48 h-48 rounded object-contain bg-white"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Dynamic URL display */}
            <div className="w-full mb-4">
              <div className="text-xs font-medium text-gray-500 mb-1">URL Dinâmica do Código:</div>
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs">
                <span className="font-mono text-blue-600 truncate mr-2">{dynamicUrl}</span>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={handleCopyUrl}
                    title="Copiar URL"
                    className="p-1 text-gray-400 hover:text-gray-700 rounded"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={dynamicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Testar redirecionamento"
                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Resolution selector */}
            <div className="w-full mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-gray-400" /> Resolução de Download:
              </label>
              <select
                value={downloadResolution}
                onChange={(e) => setDownloadResolution(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 font-medium"
              >
                <option value={500}>500x500 px (Web / Digital)</option>
                <option value={1000}>1000x1000 px (Padrão Recomendado / Alta Resolução)</option>
                <option value={2000}>2000x2000 px (Impressão Gráfica / Placas Grandes)</option>
              </select>
            </div>

            {/* Download Buttons */}
            <div className="w-full grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJPEG}
                className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar JPEG</span>
              </button>
            </div>
          </div>

          {/* Right: Form Details */}
          <div className="p-6 flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {savedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Alterações salvas no banco com sucesso!</span>
                </div>
              )}

              {/* ID Readonly */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  ID do Código (Físico)
                </label>
                <input
                  type="text"
                  value={record.code}
                  disabled
                  className="w-full px-3.5 py-2 text-sm bg-gray-100 border border-gray-200 rounded-lg text-gray-500 font-mono font-bold cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  O identificador nunca muda para manter as placas já impressas funcionando.
                </p>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nome / Descrição
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Restaurante Silva, Mesa 12"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Link de Destino */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Link de Destino
                </label>
                <input
                  type="text"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://google.com"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Aceita HTTPS ou HTTP. O QR Code redirecionará imediatamente para esta URL.
                </p>
              </div>

              {/* Status Toggle */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-700 block">Status do Redirecionamento</span>
                    <span className="text-[11px] text-gray-400">
                      {active ? 'Ativo e redirecionando normalmente' : 'Temporariamente pausado'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      active ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Stats info */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Total de Leituras/Scans:</span>
                  <span className="font-semibold text-gray-800">{record.scan_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Criado em:</span>
                  <span className="text-gray-700">{new Date(record.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                >
                  Fechar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
