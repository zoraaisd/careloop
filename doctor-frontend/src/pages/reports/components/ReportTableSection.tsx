import React from 'react';
import { Eye } from 'lucide-react';

import type { ReportRow, ReportType, ReportViewResponse } from '../types';
import { getCellAlignment, getStatusPill } from '../utils';

type ReportTableSectionProps = {
  loading: boolean;
  reportType: ReportType;
  displayReport: ReportViewResponse;
  paginatedRows: ReportRow[];
  filteredRowsCount: number;
  showingFrom: number;
  showingTo: number;
  safePage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onViewHistory: (patientId: string) => void;
};

const ReportTableSection: React.FC<ReportTableSectionProps> = ({
  loading,
  reportType,
  displayReport,
  paginatedRows,
  filteredRowsCount,
  showingFrom,
  showingTo,
  safePage,
  totalPages,
  onPrevPage,
  onNextPage,
  onViewHistory,
}) => (
  <section className="overflow-hidden rounded-3xl border border-[#dce4e0] bg-white shadow-[0_20px_45px_rgba(20,46,38,0.05)] sm:rounded-[28px] lg:rounded-[30px]">
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
                <button
                  type="button"
                  onClick={() => {
                    const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                    if (patientId) {
                      onViewHistory(patientId);
                    }
                  }}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#1faa62]/30 bg-white px-4 py-2 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7]"
                >
                  <Eye className="h-4 w-4" />
                  View History
                </button>
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
            {reportType === 'patient' ? <th className="bg-[#f8fbf9] px-5 py-4 text-center">Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {paginatedRows.map((row, rowIndex) => (
            <tr
              key={`${displayReport.title}-${rowIndex}`}
              className={`border-b border-[#f1f5f3] text-[#173a31] transition odd:bg-white even:bg-[#fcfefd] hover:bg-[#f6fbf8] last:border-b-0 ${
                reportType === 'patient' ? 'cursor-pointer' : ''
              }`}
              onClick={() => {
                if (reportType !== 'patient') {
                  return;
                }

                const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                if (patientId) {
                  onViewHistory(patientId);
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
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const patientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
                      if (patientId) {
                        onViewHistory(patientId);
                      }
                    }}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#1faa62]/30 bg-white px-4 py-2 text-sm font-semibold text-[#16804d] transition hover:bg-[#f4fbf7]"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
          {!loading && paginatedRows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(displayReport.columns.length + (reportType === 'patient' ? 1 : 0), 1)}
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

export default ReportTableSection;
