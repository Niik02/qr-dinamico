import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { QRCodeRecord, QRCodeStats } from './types/qrcode.ts';
import { Navbar } from './components/Navbar.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { QRCodeTable } from './components/QRCodeTable.tsx';
import { BulkCreateModal } from './components/BulkCreateModal.tsx';
import { SingleCreateModal } from './components/SingleCreateModal.tsx';
import { EditQRCodeModal } from './components/EditQRCodeModal.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { VercelDeployModal } from './components/VercelDeployModal.tsx';
import { downloadBatchZip, downloadCSV } from './lib/qrcode-utils.ts';
import {
  Search,
  X,
  Download,
  Trash2,
  Power,
  RotateCcw,
  CheckSquare,
  Square,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  // Check if user navigated to a dynamic redirect path /r/:code
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isRedirectPath = currentPath.startsWith('/r/');
  const redirectCode = isRedirectPath ? currentPath.replace('/r/', '').split('/')[0].trim() : null;

  const [records, setRecords] = useState<QRCodeRecord[]>([]);
  const [stats, setStats] = useState<QRCodeStats>({ total: 0, active: 0, inactive: 0, totalScans: 0 });
  const [nextNumber, setNextNumber] = useState<number>(1);
  const [appUrl, setAppUrl] = useState<string>(window.location.origin);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<QRCodeRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<QRCodeRecord | null>(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ZIP download progress
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);

  // Client-side redirect fallback
  useEffect(() => {
    if (isRedirectPath && redirectCode) {
      // Forward to serverless redirect handler immediately
      window.location.replace(`/api/redirect?code=${encodeURIComponent(redirectCode)}`);
    }
  }, [isRedirectPath, redirectCode]);

  if (isRedirectPath && redirectCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-sm w-full text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-gray-900 mb-1">Redirecionando...</h2>
          <p className="text-xs text-gray-500 mb-2">QR Code: <span className="font-mono font-bold text-gray-800">{redirectCode}</span></p>
          <p className="text-xs text-gray-400">Você está sendo encaminhado para o destino cadastrado.</p>
        </div>
      </div>
    );
  }

  // Fetch initial config and QR codes
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load app config
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.appUrl) {
            setAppUrl(configData.appUrl);
          }
        }
      } catch (err) {
        console.warn('Could not fetch /api/config, using window.location.origin');
      }

      // Load next code number
      try {
        const nextRes = await fetch('/api/qrcodes/next-code');
        if (nextRes.ok) {
          const nextData = await nextRes.json();
          setNextNumber(nextData.nextNumber || 1);
        }
      } catch (err) {
        console.warn('Could not fetch next-code');
      }

      // Load QR codes
      const res = await fetch('/api/qrcodes');
      if (!res.ok) {
        throw new Error('Falha ao carregar QR codes do servidor.');
      }
      const data = await res.json();
      setRecords(data.items || []);
      setStats(data.stats || { total: 0, active: 0, inactive: 0, totalScans: 0 });
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Erro de conexão com o backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered and searched records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status filter
      if (statusFilter === 'active' && !r.active) return false;
      if (statusFilter === 'inactive' && r.active) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = r.code.toLowerCase().includes(q);
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesLink = (r.destination_url || '').toLowerCase().includes(q);
        return matchesCode || matchesName || matchesLink;
      }
      return true;
    });
  }, [records, statusFilter, searchQuery]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredRecords.map((r) => r.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Bulk Create Action
  const handleBulkCreate = async (payload: {
    quantity: number;
    namePrefix: string;
    startNumber?: number;
    defaultDestinationUrl?: string;
  }) => {
    const res = await fetch('/api/qrcodes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao gerar QR Codes em massa.');
    }

    await loadData();
  };

  // Single Create Action
  const handleSingleCreate = async (payload: {
    code: string;
    name: string;
    destination_url: string;
    active: boolean;
  }) => {
    const res = await fetch('/api/qrcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar QR Code individual.');
    }

    await loadData();
  };

  // Update Action
  const handleSaveEdit = async (
    id: string,
    data: { name: string; destination_url: string; active: boolean }
  ) => {
    const res = await fetch(`/api/qrcodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar QR Code.');
    }

    const updated = await res.json();
    setRecords((prev) => prev.map((item) => (item.id === id ? updated : item)));
    // Refresh stats
    loadData();
  };

  // Toggle Active Status
  const handleToggleStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/qrcodes/${id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const updated = await res.json();
        setRecords((prev) => prev.map((item) => (item.id === id ? updated : item)));
        loadData();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/qrcodes/${deletingRecord.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir QR Code.');
      }
      setDeletingRecord(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Delete Selected
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir os ${selectedIds.length} QR Codes selecionados? As URLs dinâmicas correspondentes deixarão de funcionar.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/qrcodes/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to batch delete:', err);
    }
  };

  // Download All as ZIP (1000x1000 px)
  const handleDownloadAllZip = async () => {
    if (records.length === 0) return;
    try {
      setIsZipping(true);
      await downloadBatchZip(records, appUrl, 'todos-qrcodes.zip', 1000, (curr, tot) => {
        setZipProgress({ current: curr, total: tot });
      });
    } catch (err) {
      console.error('Error generating zip:', err);
      alert('Erro ao gerar arquivo ZIP.');
    } finally {
      setIsZipping(false);
      setZipProgress(null);
    }
  };

  // Download Selected as ZIP
  const handleDownloadSelectedZip = async () => {
    const selectedRecords = records.filter((r) => selectedIds.includes(r.id));
    if (selectedRecords.length === 0) return;

    try {
      setIsZipping(true);
      await downloadBatchZip(
        selectedRecords,
        appUrl,
        `selecao-${selectedRecords.length}-qrcodes.zip`,
        1000,
        (curr, tot) => {
          setZipProgress({ current: curr, total: tot });
        }
      );
    } catch (err) {
      console.error('Error generating selected zip:', err);
      alert('Erro ao gerar arquivo ZIP dos selecionados.');
    } finally {
      setIsZipping(false);
      setZipProgress(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    downloadCSV(records, appUrl, 'qrcodes-dinamicos.csv');
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111111] flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onOpenSingleModal={() => setIsSingleModalOpen(true)}
        onExportCSV={handleExportCSV}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        totalCount={records.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error notification banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-semibold px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* ZIP Generation Progress Banner */}
        {isZipping && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Gerando arquivo ZIP com QR Codes em alta resolução (1000x1000 px)...
              </span>
              <span className="text-xs font-mono font-bold">
                {zipProgress ? `${zipProgress.current} / ${zipProgress.total}` : ''}
              </span>
            </div>
            {zipProgress && (
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 transition-all duration-150"
                  style={{
                    width: `${Math.round((zipProgress.current / zipProgress.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Metrics Cards */}
        <StatsCards
          stats={stats}
          currentFilter={statusFilter}
          onFilterChange={(f) => setStatusFilter(f)}
        />

        {/* Controls: Search, Filters & Batch Action Bar */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-4 mb-6 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por ID, nome ou link..."
                className="w-full pl-10 pr-9 py-2 text-sm bg-gray-50 hover:bg-white focus:bg-white border border-[#E5E5E5] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs & Quick Actions */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Status Filter Tabs */}
              <div className="inline-flex rounded-lg border border-[#E5E5E5] p-1 bg-[#F5F5F5] text-xs font-medium">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Todos ({stats.total})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    statusFilter === 'active'
                      ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ativos ({stats.active})
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    statusFilter === 'inactive'
                      ? 'bg-white text-amber-700 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Desativados ({stats.inactive})
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadData}
                title="Recarregar lista"
                className="p-2 text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-[#E5E5E5] rounded-lg transition-colors"
              >
                <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Batch Selection Action Bar */}
          {selectedIds.length > 0 ? (
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-gray-100 bg-blue-50/60 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-blue-900 px-2 py-0.5 rounded bg-blue-200/80">
                  {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-blue-700 hover:underline font-medium"
                >
                  Limpar seleção
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {/* Download Selected ZIP */}
                <button
                  onClick={handleDownloadSelectedZip}
                  disabled={isZipping}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Seleção (ZIP)</span>
                </button>

                {/* Batch Delete */}
                <button
                  onClick={handleBatchDelete}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Selecionados</span>
                </button>
              </div>
            </div>
          ) : (
            records.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                <span>
                  Exibindo <strong>{filteredRecords.length}</strong> de <strong>{records.length}</strong> QR Codes
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadAllZip}
                    disabled={isZipping}
                    className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                    <span>Baixar Todos (ZIP)</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Table / Cards List */}
        {isLoading && records.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-16 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Carregando seus QR Codes...</p>
          </div>
        ) : (
          <QRCodeTable
            records={filteredRecords}
            baseUrl={appUrl}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onEdit={(record) => setEditingRecord(record)}
            onDelete={(record) => setDeletingRecord(record)}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] bg-white py-6 text-center text-xs text-gray-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong>QR Dinâmico</strong> &mdash; Sistema de QR Codes Dinâmicos Sequenciais para Placas Físicas
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsDeployModalOpen(true)}
              className="text-blue-600 hover:underline font-medium"
            >
              Configurar Banco & Vercel
            </button>
            <span className="text-gray-300">&bull;</span>
            <span>Versão 1.0 (Produção)</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BulkCreateModal
        isOpen={isBulkModalOpen}
        nextNumber={nextNumber}
        onClose={() => setIsBulkModalOpen(false)}
        onSubmit={handleBulkCreate}
      />

      <SingleCreateModal
        isOpen={isSingleModalOpen}
        nextNumber={nextNumber}
        onClose={() => setIsSingleModalOpen(false)}
        onSubmit={handleSingleCreate}
      />

      <EditQRCodeModal
        record={editingRecord}
        baseUrl={appUrl}
        isOpen={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        onSave={handleSaveEdit}
      />

      <DeleteConfirmModal
        record={deletingRecord}
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <VercelDeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        appUrl={appUrl}
      />
    </div>
  );
}
