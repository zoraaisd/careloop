import React, { useEffect, useRef } from 'react';
import { Download, Eye } from 'lucide-react';

import type { ReportRow, ReportType, ReportViewResponse } from '../types';
import { getCellAlignment, getStatusPill } from '../utils';

type ReportTableSectionProps = {
  loading: boolean;
  reportType: ReportType;
  displayReport: ReportViewResponse;
  activePatientId: string | null;
  activeStockItemId: string | null;
  exportingPatientId: string | null;
  paginatedRows: ReportRow[];
  filteredRowsCount: number;
  showingFrom: number;
  showingTo: number;
  safePage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onViewHistory: (patientId: string) => void;
  onDownloadHistory: (patientId: string) => void;
  onViewStockHistory: (inventoryItemId: string) => void;
  onCloseStockHistory?: () => void;
  stockHistoryRows?: Array<{
    transactionId: string;
    transactionType: 'opening-stock' | 'restock';
    quantityAdded: number;
    stockAfter: number;
    batchNumber: string | null;
    purchasePrice: number;
    entryDate: string;
  }>;
  onDownloadStockHistory?: () => void;
};

const ReportTableSection: React.FC<ReportTableSectionProps> = ({
  loading,
  reportType,
  displayReport,
  activePatientId,
  activeStockItemId,
  exportingPatientId,
  paginatedRows,
  filteredRowsCount,
  showingFrom,
  showingTo,
  safePage,
  totalPages,
  onPrevPage,
  onNextPage,
  onViewHistory,
  onDownloadHistory,
  onViewStockHistory,
  onCloseStockHistory,
  stockHistoryRows,
  onDownloadStockHistory,
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const expandedPanelRef = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    if (reportType !== 'stock' || !activeStockItemId || !onCloseStockHistory) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (expandedPanelRef.current && !expandedPanelRef.current.contains(event.target as Node)) {
        onCloseStockHistory();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [activeStockItemId, onCloseStockHistory, reportType]);

  return (
  <section ref={sectionRef} className="overflow-hidden rounded-3xl border border-[#dce4e0] bg-white shadow-[0_20px_45px_rgba(20,46,38,0.05)] sm:rounded-[28px] lg:rounded-[30px]">
    <div className="flex flex-col gap-4 border-b border-[#edf2ef] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-7">
      <div>
        <h2 className="text-xl font-bold text-[#142e26]">{displayReport.title} Details</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full bg-[#f5faf7] px-4 py-2 text-sm font-medium text-[#54756a]">
          {filteredRowsCount.toLocaleString('en-IN')} entries
        </div>
      </div>
    </div>

    <div className="space-y-4 px-4 py-4 sm:px-6 lg:hidden">
      {paginatedRows.map((row, rowIndex) => (
        <article
          key={`${displayReport.title}-mobile-${rowIndex}`}
          className="rounded-[22px] border border-[#e3ece7] bg-[#fbfdfc] p-4 shadow-[0_10px_24px_rgba(20,46,38,0.04)]"
        >
          <div className="grid gap-3">
            {displayReport.columns.map((column) => {
              const value = row[column.key];
              return (
                <div key={column.key} className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6f867d]">{column.label}</p>
                  <div className={`break-words text-sm font-medium text-[#173a31] ${column.kind === 'status' ? 'text-left' : ''}`}>
                    {column.kind === 'status' ? (
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill(value)}`}>
                        {String(value ?? '--')}
                      </span>
                    ) : (
                      String(value ?? '--')
                    )}
                  </div>
                </div>
              );
            })}

            {reportType === 'patient' ? (
              <div className="pt-2">
                {(() => {
                  const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                  const isActive = Boolean(patientId) && patientId === activePatientId;
                  const isDownloading = Boolean(patientId) && patientId === exportingPatientId;

                  return (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (patientId) {
                            onViewHistory(patientId);
                          }
                        }}
                        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? 'border-[#159754] bg-[#159754] text-white shadow-[0_14px_26px_rgba(21,151,84,0.22)]'
                            : 'border-[#1faa62]/30 bg-white text-[#16804d] hover:bg-[#f4fbf7]'
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        {isActive ? 'Viewing' : 'View History'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (patientId) {
                            onDownloadHistory(patientId);
                          }
                        }}
                        disabled={!patientId || isDownloading}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#1faa62]/30 bg-white px-4 py-2 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Download className="h-4 w-4" />
                        {isDownloading ? 'Downloading...' : 'Download PDF'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : reportType === 'stock' ? (
              <div className="pt-2">
                {(() => {
                  const inventoryItemId =
                    typeof row.internalInventoryItemId === 'string' ? row.internalInventoryItemId : '';
                  const isActive = Boolean(inventoryItemId) && inventoryItemId === activeStockItemId;

                  return (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (inventoryItemId) {
                            if (inventoryItemId === activeStockItemId) {
                              onCloseStockHistory?.();
                            } else {
                              onViewStockHistory(inventoryItemId);
                            }
                          }
                        }}
                        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? 'border-[#159754] bg-[#159754] text-white shadow-[0_14px_26px_rgba(21,151,84,0.22)]'
                            : 'border-[#1faa62]/30 bg-white text-[#16804d] hover:bg-[#f4fbf7]'
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        {isActive ? 'Viewing' : 'View History'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </article>
      ))}
      {!loading && paginatedRows.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#dce4e0] px-4 py-10 text-center text-sm text-[#607d74]">
          No report rows found for the selected filters.
        </div>
      ) : null}
    </div>

    <div className="hidden overflow-x-auto px-3 py-3 lg:block">
      <table className="min-w-[960px] text-sm xl:min-w-[1080px]">
        <thead>
          <tr className="border-b border-[#edf2ef] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">
            {displayReport.columns.map((column) => (
              <th key={column.key} className={`bg-[#f8fbf9] px-5 py-4 ${getCellAlignment(column.align)}`}>
                {column.label}
              </th>
            ))}
            {reportType === 'patient' || reportType === 'stock' ? (
              <th className="bg-[#f8fbf9] px-5 py-4 text-center">Action</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {paginatedRows.map((row, rowIndex) => {
            const stockInventoryItemId =
              typeof row.internalInventoryItemId === 'string' ? row.internalInventoryItemId : '';
            const isStockExpanded =
              reportType === 'stock' &&
              Boolean(stockInventoryItemId) &&
              stockInventoryItemId === activeStockItemId;

            return (
              <React.Fragment key={`${displayReport.title}-${rowIndex}`}>
                <tr
                  className={`border-b border-[#f1f5f3] text-[#173a31] transition odd:bg-white even:bg-[#fcfefd] hover:bg-[#f6fbf8] ${
                    reportType === 'patient' || reportType === 'stock' ? 'cursor-pointer' : ''
                  } ${isStockExpanded ? 'bg-[#f6fbf8]' : ''}`}
                  onClick={() => {
                    if (reportType === 'patient') {
                      const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                      if (patientId) {
                        onViewHistory(patientId);
                      }
                      return;
                    }

                    if (reportType === 'stock') {
                      const inventoryItemId =
                        typeof row.internalInventoryItemId === 'string' ? row.internalInventoryItemId : '';
                      if (inventoryItemId) {
                        if (inventoryItemId === activeStockItemId) {
                          onCloseStockHistory?.();
                        } else {
                          onViewStockHistory(inventoryItemId);
                        }
                      }
                    }
                  }}
                >
                  {displayReport.columns.map((column) => {
                    const value = row[column.key];
                    return (
                      <td key={column.key} className={`px-5 py-4 align-middle ${getCellAlignment(column.align)}`}>
                        {column.kind === 'status' ? (
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill(value)}`}>
                            {String(value ?? '--')}
                          </span>
                        ) : (
                          String(value ?? '--')
                        )}
                      </td>
                    );
                  })}
                  {reportType === 'patient' ? (
                    <td className="px-5 py-4 text-center">
                      {(() => {
                        const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                        const isActive = Boolean(patientId) && patientId === activePatientId;
                        const isDownloading = Boolean(patientId) && patientId === exportingPatientId;

                        return (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (patientId) {
                                  onViewHistory(patientId);
                                }
                              }}
                              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                                isActive
                                  ? 'border-[#159754] bg-[#159754] text-white shadow-[0_14px_26px_rgba(21,151,84,0.22)]'
                                  : 'border-[#1faa62]/30 bg-white text-[#16804d] hover:bg-[#f4fbf7]'
                              }`}
                            >
                              <Eye className="h-4 w-4" />
                              {isActive ? 'Viewing' : 'View'}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (patientId) {
                                  onDownloadHistory(patientId);
                                }
                              }}
                              disabled={!patientId || isDownloading}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#1faa62]/30 bg-white px-3 py-2 text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label="Download patient history PDF"
                              title="Download patient history PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  ) : reportType === 'stock' ? (
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (stockInventoryItemId) {
                                if (stockInventoryItemId === activeStockItemId) {
                                  onCloseStockHistory?.();
                                } else {
                                  onViewStockHistory(stockInventoryItemId);
                                }
                              }
                            }}
                          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                            isStockExpanded
                              ? 'border-[#159754] bg-[#159754] text-white shadow-[0_14px_26px_rgba(21,151,84,0.22)]'
                              : 'border-[#1faa62]/30 bg-white text-[#16804d] hover:bg-[#f4fbf7]'
                          }`}
                        >
                          <Eye className="h-4 w-4" />
                          {isStockExpanded ? 'Hide' : 'View'}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
                {isStockExpanded ? (
                  <tr className="border-b border-[#e5efe9] bg-[#fbfdfc]">
                    <td ref={expandedPanelRef} colSpan={displayReport.columns.length + 1} className="px-5 py-5">
                      <div className="rounded-[22px] border border-[#e3ece7] bg-white">
                        <div className="flex items-center justify-between border-b border-[#edf2ef] px-4 py-3">
                          <p className="text-sm font-bold text-[#142e26]">Restock Transaction History</p>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDownloadStockHistory?.();
                            }}
                            disabled={!stockHistoryRows || stockHistoryRows.length === 0}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#1faa62]/30 bg-white px-3 py-2 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                        <div className="space-y-3 px-4 py-4">
                          {stockHistoryRows && stockHistoryRows.length > 0 ? stockHistoryRows.map((entry) => (
                            <div key={entry.transactionId} className="rounded-[18px] border border-[#edf2ef] bg-[#fbfdfc] p-3">
                              <div className="grid gap-2 sm:grid-cols-4">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#607d74]">Date</p>
                                  <p className="mt-1 text-sm font-semibold text-[#173a31]">{entry.entryDate.slice(0, 10)}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#607d74]">Restock Amount</p>
                                  <p className="mt-1 text-sm font-semibold text-[#173a31]">Rs. {entry.purchasePrice}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#607d74]">Quantity</p>
                                  <p className="mt-1 text-sm font-semibold text-[#173a31]">+{entry.quantityAdded}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#607d74]">Type</p>
                                  <p className="mt-1 text-sm font-semibold text-[#173a31]">
                                    {entry.transactionType === 'opening-stock' ? 'Opening Stock' : 'Restock'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <p className="text-sm text-[#607d74]">No restock transactions found for this product.</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
          {!loading && paginatedRows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(displayReport.columns.length + (reportType === 'patient' || reportType === 'stock' ? 1 : 0), 1)}
                className="px-5 py-14 text-center text-sm text-[#607d74]"
              >
                No report rows found for the selected filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>

    <div className="flex flex-col gap-4 border-t border-[#edf2ef] px-4 py-5 text-sm text-[#607d74] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-7">
      <p className="text-center sm:text-left">
        Showing {showingFrom} to {showingTo} of {filteredRowsCount.toLocaleString('en-IN')} entries
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={safePage === 1}
          className="min-h-10 rounded-xl border border-[#dce4e0] px-4 py-2 font-medium text-[#173a31] transition hover:bg-[#f4f8f6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <div className="flex items-center justify-center gap-2">
          <div className="rounded-xl bg-[#159754] px-4 py-2 font-semibold text-white">{safePage}</div>
          <div className="text-[#7a9188]">/ {totalPages}</div>
        </div>
        <button
          type="button"
          onClick={onNextPage}
          disabled={safePage === totalPages}
          className="min-h-10 rounded-xl border border-[#dce4e0] px-4 py-2 font-medium text-[#173a31] transition hover:bg-[#f4f8f6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  </section>
  );
};

export default ReportTableSection;
