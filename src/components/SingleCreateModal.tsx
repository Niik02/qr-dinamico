import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { formatThreeDigitCode } from '../lib/qrcode-utils.ts';

interface SingleCreateModalProps {
  isOpen: boolean;
  nextNumber: number;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    name: string;
    destination_url: string;
    active: boolean;
  }) => Promise<void>;
}

export const SingleCreateModal: React.FC<SingleCreateModalProps> = ({
  isOpen,
  nextNumber,
  onClose,
  onSubmit,
}) => {
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [destinationUrl, setDestinationUrl] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const formatted = formatThreeDigitCode(nextNumber);
      setCode(formatted);
      setName(`QR ${formatted}`);
      setDestinationUrl('');
      setActive(true);
      setError(null);
    }
  }, [isOpen, nextNumber]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('O identificador/código é obrigatório.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        code: code.trim(),
        name: name.trim() || `QR ${code.trim()}`,
        destination_url: destinationUrl.trim(),
        active,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar QR Code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Novo QR Code Individual</h2>
              <p className="text-xs text-gray-500">Cadastre um código individual com URL personalizada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ID / Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Identificador Único (ID)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: 001, 102"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-bold"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              O link físico será: <span className="font-mono text-gray-600">/r/{code || '001'}</span>
            </p>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Nome de Referência
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Restaurante Silva, Mesa 1"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Destination URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Link de Destino
            </label>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://google.com ou https://instagram.com/empresa"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Para onde o cliente será redirecionado ao escanear o QR Code.
            </p>
          </div>

          {/* Active status */}
          <div className="flex items-center space-x-3 pt-1">
            <input
              type="checkbox"
              id="singleActive"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="singleActive" className="text-sm font-medium text-gray-700 cursor-pointer">
              Ativar redirecionamento imediatamente
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Criar QR Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
