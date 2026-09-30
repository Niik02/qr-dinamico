import React from 'react';
import { QRCodeRecord } from '../types/qrcode.ts';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  record: QRCodeRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  record,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2.5 text-red-600">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Excluir QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Tem certeza que deseja excluir o QR Code <span className="font-bold text-gray-900">{record.code}</span> ({record.name})?
          </p>

          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
            <div className="font-semibold">Atenção sobre placas físicas:</div>
            <div>
              Após a exclusão, a URL <span className="font-mono font-bold">/r/{record.code}</span> deixará de funcionar imediatamente. Qualquer visitante que escanear a placa física verá a mensagem de "QR Code não encontrado".
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2 shadow-sm"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
