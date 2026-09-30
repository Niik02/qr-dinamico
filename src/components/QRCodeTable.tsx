import React, { useState } from 'react';
import { QRCodeRecord } from '../types/qrcode.ts';
import {
  ExternalLink,
  Edit2,
  Download,
  Trash2,
  Copy,
  Check,
  Power,
  ChevronDown,
} from 'lucide-react';
import { downloadQRCodePNG, downloadQRCodeJPEG, getQRCodeFilename } from '../lib/qrcode-utils.ts';

interface QRCodeTableProps {
  records: QRCodeRecord[];
  baseUrl: string;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onEdit: (record: QRCodeRecord) => void;
  onDelete: (record: QRCodeRecord) => void;
  onToggleStatus: (id: string) => void;
}

export const QRCodeTable: React.FC<QRCodeTableProps> = ({
  records,
  baseUrl,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);

  const allSelected = records.length > 0 && selectedIds.length === records.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < records.length;

  const handleCopyUrl = (code: string) => {
    const fullUrl = `${baseUrl.replace(/\/$/, '')}/r/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownload = async (record: QRCodeRecord, format: 'png' | 'jpg') => {
    const fullUrl = `${baseUrl.replace(/\/$/, '')}/r/${record.code}`;
    const filename = getQRCodeFilename(record, format);
    if (format === 'png') {
      await downloadQRCodePNG(fullUrl, filename, 1000);
    } else {
      await downloadQRCodeJPEG(fullUrl, filename, 1000);
    }
    setDownloadMenuId(null);
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
          <Edit2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-[#111111] mb-1">Nenhum QR Code encontrado</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Tente ajustar sua busca ou crie novos QR Codes usando os botões acima.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block overflow-hidden bg-white border border-[#E5E5E5] rounded-xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-xs font-semibold uppercase text-gray-600 tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={() => (allSelected ? onClearSelection() : onSelectAll())}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th scope="col" className="px-4 py-3.5 w-24">ID</th>
                <th scope="col" className="px-4 py-3.5">Nome</th>
                <th scope="col" className="px-4 py-3.5">Link de Destino</th>
                <th scope="col" className="px-4 py-3.5">URL Dinâmica</th>
                <th scope="col" className="px-4 py-3.5 text-center w-28">Status</th>
                <th scope="col" className="px-4 py-3.5 text-right w-44">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {records.map((record) => {
                const isSelected = selectedIds.includes(record.id);
                const dynamicUrl = `${baseUrl.replace(/\/$/, '')}/r/${record.code}`;
                const relativeUrl = `/r/${record.code}`;

                return (
                  <tr
                    key={record.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(record.id)}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* ID Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                        {record.code}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3.5 font-medium text-[#111111] whitespace-nowrap">
                      {record.name}
                    </td>

                    {/* Destination Link */}
                    <td className="px-4 py-3.5 max-w-xs truncate">
                      {record.destination_url ? (
                        <a
                          href={record.destination_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={record.destination_url}
                          className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline max-w-full truncate"
                        >
                          <span className="truncate">{record.destination_url}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Não configurado</span>
                      )}
                    </td>

                    {/* Dynamic URL with copy & test */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          {relativeUrl}
                        </span>
                        <button
                          onClick={() => handleCopyUrl(record.code)}
                          title="Copiar URL completa"
                          className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        >
                          {copiedCode === record.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={dynamicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Testar redirecionamento em nova aba"
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Status Badge & Toggle */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => onToggleStatus(record.id)}
                        title={record.active ? 'Clique para desativar' : 'Clique para ativar'}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          record.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            record.active ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <span>{record.active ? 'Ativo' : 'Desativado'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => onEdit(record)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        {/* Download Menu */}
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setDownloadMenuId(downloadMenuId === record.id ? null : record.id)
                            }
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                          </button>

                          {downloadMenuId === record.id && (
                            <div className="origin-top-right absolute right-0 mt-1 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 py-1">
                              <button
                                onClick={() => handleDownload(record, 'png')}
                                className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-medium"
                              >
                                Baixar PNG (1000px)
                              </button>
                              <button
                                onClick={() => handleDownload(record, 'jpg')}
                                className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 font-medium"
                              >
                                Baixar JPEG (1000px)
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => onDelete(record)}
                          title="Excluir QR Code"
                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="md:hidden space-y-3">
        {records.map((record) => {
          const isSelected = selectedIds.includes(record.id);
          const dynamicUrl = `${baseUrl.replace(/\/$/, '')}/r/${record.code}`;

          return (
            <div
              key={record.id}
              className={`p-4 rounded-xl border transition-all bg-white ${
                isSelected ? 'border-blue-400 ring-1 ring-blue-400' : 'border-[#E5E5E5]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(record.id)}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                    ID: {record.code}
                  </span>
                  <h4 className="font-semibold text-sm text-[#111111]">{record.name}</h4>
                </div>
                <button
                  onClick={() => onToggleStatus(record.id)}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    record.active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{record.active ? 'Ativo' : 'Desativado'}</span>
                </button>
              </div>

              {/* Destination */}
              <div className="mb-2 text-xs">
                <span className="text-gray-400 block mb-0.5">Destino:</span>
                {record.destination_url ? (
                  <a
                    href={record.destination_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 break-all hover:underline inline-flex items-center gap-1"
                  >
                    <span>{record.destination_url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Não configurado</span>
                )}
              </div>

              {/* Dynamic URL */}
              <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-lg border border-gray-200 mb-3">
                <span className="font-mono text-gray-700 truncate">{dynamicUrl}</span>
                <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => handleCopyUrl(record.code)}
                    className="p-1 text-gray-500 hover:text-gray-800"
                    title="Copiar URL"
                  >
                    {copiedCode === record.code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={dynamicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-500 hover:text-blue-600"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => onEdit(record)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDownload(record, 'png')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md"
                >
                  PNG
                </button>
                <button
                  onClick={() => handleDownload(record, 'jpg')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md"
                >
                  JPEG
                </button>
                <button
                  onClick={() => onDelete(record)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
