import React, { useState } from 'react';
import { X, Layers, AlertCircle, CheckCircle } from 'lucide-react';
import { formatThreeDigitCode } from '../lib/qrcode-utils.ts';

interface BulkCreateModalProps {
  isOpen: boolean;
  nextNumber: number;
  onClose: () => void;
  onSubmit: (data: {
    quantity: number;
    namePrefix: string;
    startNumber?: number;
    defaultDestinationUrl?: string;
  }) => Promise<void>;
}

export const BulkCreateModal: React.FC<BulkCreateModalProps> = ({
  isOpen,
  nextNumber,
  onClose,
  onSubmit,
}) => {
  const [quantity, setQuantity] = useState<number>(100);
  const [namePrefix, setNamePrefix] = useState<string>('QR');
  const [startNumber, setStartNumber] = useState<string>('');
  const [defaultUrl, setDefaultUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const actualStartNum = startNumber ? parseInt(startNumber, 10) : nextNumber;
  const safeStartNum = isNaN(actualStartNum) || actualStartNum < 1 ? nextNumber : actualStartNum;
  const endNum = safeStartNum + Math.max(1, quantity) - 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (quantity < 1 || quantity > 1000) {
      setError('Por favor, informe uma quantidade entre 1 e 1000.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        quantity,
        namePrefix: namePrefix.trim() || 'QR',
        startNumber: startNumber ? parseInt(startNumber, 10) : undefined,
        defaultDestinationUrl: defaultUrl.trim() || undefined,
      });

      setSuccessMessage(`${quantity} QR Codes criados com sucesso!`);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar QR Codes em massa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Criar QR Codes em Massa</h2>
              <p className="text-xs text-gray-500">Geração automática com numeração sequencial de 3 dígitos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Quantidade de Códigos
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="1000"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-gray-400">unidades</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[10, 50, 100, 200].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuantity(preset)}
                  className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                    quantity === preset
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {preset} un
                </button>
              ))}
            </div>
          </div>

          {/* Nome Inicial e Prefixo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Nome Inicial / Prefixo
              </label>
              <input
                type="text"
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                placeholder="Ex: QR, Mesa, Placa"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Número Inicial
              </label>
              <input
                type="number"
                min="1"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                placeholder={`Auto: ${formatThreeDigitCode(nextNumber)}`}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Link de Destino Opcional */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Link de Destino Padrão (Opcional)
            </label>
            <input
              type="text"
              value={defaultUrl}
              onChange={(e) => setDefaultUrl(e.target.value)}
              placeholder="https://exemplo.com (pode cadastrar depois individualmente)"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Deixe em branco se preferir cadastrar o destino de cada placa conforme for instalando.
            </p>
          </div>

          {/* Resultado Preview Box */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Prévia do Lote Sequencial:
            </span>
            <div className="flex items-center space-x-2 text-xs font-mono text-gray-600">
              <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-blue-700">
                {formatThreeDigitCode(safeStartNum)}
              </span>
              <span>até</span>
              <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-blue-700">
                {formatThreeDigitCode(endNum)}
              </span>
              <span className="text-gray-400">({quantity} códigos no total)</span>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              Exemplo: <span className="font-semibold">{namePrefix} {formatThreeDigitCode(safeStartNum)}</span> com link dinâmico <span className="font-mono text-blue-600">/r/{formatThreeDigitCode(safeStartNum)}</span>
            </p>
          </div>

          {/* Footer Actions */}
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
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Gerando Códigos...</span>
                </>
              ) : (
                <span>Gerar {quantity} QR Codes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
