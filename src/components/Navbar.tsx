import React from 'react';
import { QrCode, Plus, FileSpreadsheet, Server, Layers } from 'lucide-react';

interface NavbarProps {
  onOpenBulkModal: () => void;
  onOpenSingleModal: () => void;
  onExportCSV: () => void;
  onOpenDeployModal: () => void;
  totalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBulkModal,
  onOpenSingleModal,
  onExportCSV,
  onOpenDeployModal,
  totalCount,
}) => {
  return (
    <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-5 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-[#111111] tracking-tight">QR Dinâmico</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  SaaS Vercel
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Crie, gerencie e altere seus QR Codes sem precisar gerar novos códigos.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            {/* Deploy & Setup instructions button */}
            <button
              onClick={onOpenDeployModal}
              title="Instruções de deploy na Vercel e configuração de banco de dados"
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded-lg border border-[#E5E5E5] transition-colors"
            >
              <Server className="w-4 h-4 text-gray-600" />
              <span className="hidden md:inline">Deploy</span> Vercel & BD
            </button>

            {/* Export CSV button */}
            {totalCount > 0 && (
              <button
                onClick={onExportCSV}
                title="Exportar dados dos QR Codes em formato CSV"
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Exportar</span> CSV
              </button>
            )}

            {/* Single Create Button */}
            <button
              onClick={onOpenSingleModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Individual</span>
            </button>

            {/* Bulk Create Button (Primary) */}
            <button
              onClick={onOpenBulkModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              <Layers className="w-4 h-4" />
              <span>+ Criar QR Codes</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
