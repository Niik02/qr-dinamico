import React from 'react';
import { QRCodeStats } from '../types/qrcode.ts';
import { QrCode, CheckCircle2, PauseCircle, MousePointerClick } from 'lucide-react';

interface StatsCardsProps {
  stats: QRCodeStats;
  currentFilter: 'all' | 'active' | 'inactive';
  onFilterChange: (filter: 'all' | 'active' | 'inactive') => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  currentFilter,
  onFilterChange,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total Card */}
      <button
        onClick={() => onFilterChange('all')}
        className={`text-left p-4 rounded-xl border transition-all ${
          currentFilter === 'all'
            ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white border-[#E5E5E5] hover:border-gray-300 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Total de QR Codes</span>
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
            <QrCode className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-[#111111]">{stats.total}</div>
        <p className="text-xs text-gray-400 mt-1">Identificadores únicos</p>
      </button>

      {/* Active Card */}
      <button
        onClick={() => onFilterChange('active')}
        className={`text-left p-4 rounded-xl border transition-all ${
          currentFilter === 'active'
            ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
            : 'bg-white border-[#E5E5E5] hover:border-gray-300 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">QR Codes Ativos</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.active}</div>
        <p className="text-xs text-gray-400 mt-1">Redirecionando normalmente</p>
      </button>

      {/* Inactive Card */}
      <button
        onClick={() => onFilterChange('inactive')}
        className={`text-left p-4 rounded-xl border transition-all ${
          currentFilter === 'inactive'
            ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
            : 'bg-white border-[#E5E5E5] hover:border-gray-300 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Desativados</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <PauseCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.inactive}</div>
        <p className="text-xs text-gray-400 mt-1">Página de aviso ao escanear</p>
      </button>

      {/* Total Scans Card */}
      <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Total de Acessos</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <MousePointerClick className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-[#111111]">{stats.totalScans}</div>
        <p className="text-xs text-gray-400 mt-1">Leituras registradas</p>
      </div>
    </div>
  );
};
