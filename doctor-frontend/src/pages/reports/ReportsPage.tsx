import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

import api from '@/services/api';

import PatientHistoryPanel from './components/PatientHistoryPanel';
import ReportFiltersCard from './components/ReportFiltersCard';
import ReportSummaryCards from './components/ReportSummaryCards';
import ReportTableSection from './components/ReportTableSection';
import type {
  ExportFormat,
  FiltersState,
  PatientHistory,
  PatientOption,
  ReportType,
  StockTransactionHistory,
  ReportViewResponse,
} from './types';
import {
  createDefaultFilters,
  emptyReport,
  getExportFileName,
  matchesNormalizedSearch,
  REPORT_TYPE_OPTIONS,
  withDisplayIds,
  withSupplierColumn,
  withoutHiddenMetrics,
} from './utils';

const ReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<FiltersState>(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(createDefaultFilters);
  const [report, setReport] = useState<ReportViewResponse>(emptyReport);
  const [generatedReport, setGeneratedReport] = useState<ReportViewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [activeHistoryPatientId, setActiveHistoryPatientId] = useState<string | null>(null);
  const [exportingPatientId, setExportingPatientId] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockTransactionHistory | null>(null);
  const [activeStockItemId, setActiveStockItemId] = useState<string | null>(null);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const patientPickerRef = useRef<HTMLDivElement | null>(null);

  const buildQuery = (queryFilters: FiltersState) => {
    const params = new URLSearchParams();
    params.set('reportType', queryFilters.reportType);
    params.set('dateFrom', queryFilters.dateFrom);
    params.set('dateTo', queryFilters.dateTo);

    if (
      queryFilters.doctorId &&
      queryFilters.reportType !== 'inventory' &&
      queryFilters.reportType !== 'stock'
    ) {
      params.set('doctorId', queryFilters.doctorId);
    }

    if (queryFilters.reportType === 'patient' && queryFilters.patientId) {
      params.set('patientId', queryFilters.patientId);
    }

    return params.toString();
  };

  const loadReport = async (queryFilters: FiltersState, mode: 'preview' | 'generate' = 'preview') => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<ReportViewResponse>(`/doctor/reports/view?${buildQuery(queryFilters)}`);
      const nextReport = response.data ?? emptyReport;
      setReport(nextReport);
      if (mode === 'generate') {
        setGeneratedReport(nextReport);
        setAppliedFilters(queryFilters);
        setHasGeneratedReport(true);
        setPatientHistory(null);
        setActiveHistoryPatientId(null);
        setHistoryError(null);
        setStockHistory(null);
        setActiveStockItemId(null);
      }
    } catch (error) {
      console.error('Failed to load report', error);
      setReport(emptyReport);
      if (mode === 'generate') {
        setGeneratedReport(null);
        setHasGeneratedReport(false);
        setActiveHistoryPatientId(null);
      }
      setErrorMessage('Unable to load report data right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientHistory = async (patientId: string) => {
    const nextFilters: FiltersState = {
      ...appliedFilters,
      reportType: 'patient',
      patientId,
    };

    setHistoryLoading(true);
    setHistoryError(null);
    setActiveHistoryPatientId(patientId);

    try {
      const response = await api.get<ReportViewResponse>(`/doctor/reports/view?${buildQuery(nextFilters)}`);
      setPatientHistory(response.data?.selectedPatientHistory ?? null);
      if (!response.data?.selectedPatientHistory) {
        setActiveHistoryPatientId(null);
        setHistoryError('No patient history found for the selected patient.');
      }
    } catch (error) {
      console.error('Failed to load patient history', error);
      setActiveHistoryPatientId(null);
      setHistoryError('Unable to load patient history right now. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadStockHistory = async (inventoryItemId: string) => {
    setActiveStockItemId(inventoryItemId);

    try {
      const response = await api.get<{
        items: Array<{
          inventoryItemId: string;
          itemName: string;
          stockQuantity: number;
          vendor: string | null;
          restockHistory?: StockTransactionHistory['transactions'];
        }>;
      }>('/doctor/inventory');

      const matchedItem = response.data.items.find((item) => item.inventoryItemId === inventoryItemId);

      if (!matchedItem) {
        setStockHistory(null);
        setActiveStockItemId(null);
        return;
      }

      setStockHistory({
        inventoryItemId: matchedItem.inventoryItemId,
        productName: matchedItem.itemName,
        supplierName: matchedItem.vendor ?? null,
        currentStock: matchedItem.stockQuantity,
        transactions: matchedItem.restockHistory ?? [],
      });
    } catch (error) {
      console.error('Failed to load stock history', error);
      setStockHistory(null);
      setActiveStockItemId(null);
    }
  };

  useEffect(() => {
    void loadReport(filters, 'preview');
  }, [filters.reportType, filters.dateFrom, filters.dateTo, filters.doctorId, filters.patientId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters, rowsPerPage, patientSearch]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (patientPickerRef.current && !patientPickerRef.current.contains(event.target as Node)) {
        setPatientPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const performExport = async (queryFilters: FiltersState, format: ExportFormat, fallbackBaseFileName: string) => {
    setExportingFormat(format);

    try {
      const response = await api.get(`/doctor/reports/export?${buildQuery(queryFilters)}&format=${format}`, {
        responseType: 'arraybuffer',
      });
      const fallbackContentType =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const contentTypeHeader = response.headers['content-type'];
      const contentType =
        typeof contentTypeHeader === 'string' ? contentTypeHeader : fallbackContentType;
      const binaryData = response.data instanceof ArrayBuffer ? response.data : new ArrayBuffer(0);

      if (format === 'pdf') {
        const pdfSignature = new TextDecoder('ascii').decode(binaryData.slice(0, 5));

        if (pdfSignature !== '%PDF-') {
          const serverMessage = new TextDecoder().decode(binaryData).slice(0, 200);
          throw new Error(serverMessage || 'The server did not return a valid PDF file.');
        }
      }

      const blob = new Blob([binaryData], {
        type: contentType,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const fallbackFileName = getExportFileName(fallbackBaseFileName, format);
      const fileName =
        typeof response.headers['content-disposition'] === 'string'
          ? response.headers['content-disposition']
              .split('filename=')[1]
              ?.replace(/"/g, '') ?? fallbackFileName
          : fallbackFileName;

      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report', error);
      if (axios.isAxiosError(error) && error.response?.data instanceof ArrayBuffer) {
        try {
          const rawMessage = new TextDecoder().decode(error.response.data);
          const parsed = JSON.parse(rawMessage) as { message?: string; debug?: { message?: string } };
          setErrorMessage(parsed.message || parsed.debug?.message || 'Export failed. Please try again.');
        } catch {
          setErrorMessage('Export failed. Please try again.');
        }
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Export failed. Please try again.');
      }
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!generatedReport || !hasGeneratedReport) {
      return;
    }

    await performExport(appliedFilters, format, generatedReport.exportFileName);
  };

  const handlePatientHistoryDownload = async (patientId: string) => {
    if (!hasGeneratedReport) {
      return;
    }

    const nextFilters: FiltersState = {
      ...appliedFilters,
      reportType: 'patient',
      patientId,
    };

    setExportingPatientId(patientId);
    await performExport(nextFilters, 'pdf', 'patient_history.pdf');
    setExportingPatientId(null);
  };

  const handleStockHistoryDownload = () => {
    if (!stockHistory) {
      return;
    }

    void (async () => {
      try {
        const response = await api.get(
          `/doctor/reports/export?reportType=stock&inventoryItemId=${encodeURIComponent(stockHistory.inventoryItemId)}&format=pdf`,
          { responseType: 'arraybuffer' },
        );

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const safeProductName = stockHistory.productName.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
        const fileName =
          typeof response.headers['content-disposition'] === 'string'
            ? response.headers['content-disposition'].split('filename=')[1]?.replace(/"/g, '') ??
              `${safeProductName || 'stock'}_restock_history.pdf`
            : `${safeProductName || 'stock'}_restock_history.pdf`;

        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download stock history PDF', error);
      }
    })();
  };

  const handleGenerateReport = async () => {
    await loadReport(filters, 'generate');
  };

  const handleReportTypeChange = async (nextReportType: ReportType) => {
    const nextFilters: FiltersState = {
      ...filters,
      reportType: nextReportType,
      doctorId:
        nextReportType === 'inventory' || nextReportType === 'stock'
          ? ''
          : filters.doctorId,
      patientId: nextReportType === 'patient' ? filters.patientId : '',
    };

    setFilters(nextFilters);
    setErrorMessage(null);
    setHistoryError(null);
    setPatientHistory(null);
    setActiveHistoryPatientId(null);
    setStockHistory(null);
    setActiveStockItemId(null);
    setPatientSearch('');
    setPatientPickerOpen(false);
    setHasGeneratedReport(false);
    setExportingPatientId(null);
  };

  const handleDateOrDoctorChange = async (key: 'dateFrom' | 'dateTo' | 'doctorId', value: string) => {
    const nextFilters: FiltersState = {
      ...filters,
      [key]: value,
      ...(key === 'doctorId' ? { patientId: '' } : {}),
    };

    setFilters(nextFilters);
    setHasGeneratedReport(false);
    setExportingPatientId(null);

    if (key === 'doctorId') {
      setPatientSearch('');
      setPatientPickerOpen(false);
      setPatientHistory(null);
      setActiveHistoryPatientId(null);
      setHistoryError(null);
      setStockHistory(null);
      setActiveStockItemId(null);
    }
  };

  const currentReportType = filters.reportType;
  const currentDoctors = report.doctors;
  const reportTitle =
    REPORT_TYPE_OPTIONS.find((option) => option.value === currentReportType)?.label ?? 'Report';
  const displayReport = useMemo(() => {
    const baseReport = report.title
      ? report
      : {
          ...emptyReport,
          title: reportTitle,
          filters: {
            ...emptyReport.filters,
            reportType: currentReportType,
          },
        };
    const reportWithDisplayIds = withDisplayIds(baseReport, currentReportType);
    const reportWithVisibleMetrics = withoutHiddenMetrics(reportWithDisplayIds);
    return withSupplierColumn(reportWithVisibleMetrics, currentReportType);
  }, [currentReportType, report, reportTitle]);
  const generatedDisplayReport = useMemo(() => {
    if (!generatedReport) {
      return null;
    }

    const reportWithDisplayIds = withDisplayIds(generatedReport, appliedFilters.reportType);
    const reportWithVisibleMetrics = withoutHiddenMetrics(reportWithDisplayIds);
    return withSupplierColumn(reportWithVisibleMetrics, appliedFilters.reportType);
  }, [appliedFilters.reportType, generatedReport]);

  const patientOptions = useMemo(() => {
    const optionsFromApi = displayReport.patientOptions ?? [];
    const optionsFromRows =
      filters.reportType === 'patient'
        ? displayReport.rows
            .map((row) => {
              const internalPatientId = typeof row.internalPatientId === 'string' ? row.internalPatientId : '';
              const patientCode = typeof row.patientId === 'string' ? row.patientId : '';
              const patientName = typeof row.patientName === 'string' ? row.patientName : '';
              const phone = typeof row.phone === 'string' ? row.phone : '';

              if (!internalPatientId || !patientName) {
                return null;
              }

              return {
                patientId: internalPatientId,
                patientCode,
                patientName,
                phone,
              };
            })
            .filter((option): option is PatientOption => option !== null)
        : [];

    const deduped = new Map<string, PatientOption>();
    [...optionsFromApi, ...optionsFromRows].forEach((option) => {
      if (!deduped.has(option.patientId)) {
        deduped.set(option.patientId, option);
      }
    });

    return Array.from(deduped.values());
  }, [displayReport.patientOptions, displayReport.rows, filters.reportType]);

  const selectedPatientOption = patientOptions.find((option) => option.patientId === filters.patientId) ?? null;
  const selectedPatientLabel = selectedPatientOption
    ? `${selectedPatientOption.patientName} | ${selectedPatientOption.phone} | ${selectedPatientOption.patientCode}`
    : '';

  const filteredPatientOptions = useMemo(() => {
    return patientOptions.filter((option) =>
      matchesNormalizedSearch(patientSearch, [option.patientName, option.phone, option.patientCode]),
    );
  }, [patientOptions, patientSearch]);

  const filteredReportRows = useMemo(() => {
    if (!generatedDisplayReport) {
      return [];
    }

    if (appliedFilters.reportType !== 'patient') {
      return generatedDisplayReport.rows;
    }

    if (filters.patientId) {
      return generatedDisplayReport.rows.filter((row) => row.internalPatientId === filters.patientId);
    }

    if (!patientSearch.trim()) {
      return generatedDisplayReport.rows;
    }

    const matchedPatientIds = new Set(filteredPatientOptions.map((option) => option.patientId));

    if (matchedPatientIds.size > 0) {
      return generatedDisplayReport.rows.filter((row) =>
        typeof row.internalPatientId === 'string' && matchedPatientIds.has(row.internalPatientId),
      );
    }

    return generatedDisplayReport.rows.filter((row) =>
      matchesNormalizedSearch(patientSearch, [row.patientId, row.patientName, row.phone, row.internalPatientId]),
    );
  }, [appliedFilters.reportType, filteredPatientOptions, filters.patientId, generatedDisplayReport, patientSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredReportRows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const startIndex = (safePage - 1) * rowsPerPage;
    return filteredReportRows.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredReportRows, rowsPerPage, safePage]);

  const activePatientHistory = patientHistory;
  const showingFrom = filteredReportRows.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const showingTo = Math.min(safePage * rowsPerPage, filteredReportRows.length);
  const showPatientLayout = Boolean(appliedFilters.reportType === 'patient' && activePatientHistory);

  useEffect(() => {
    if (!patientPickerOpen && filters.patientId && selectedPatientLabel) {
      setPatientSearch(selectedPatientLabel);
    }
  }, [filters.patientId, patientPickerOpen, selectedPatientLabel]);

  return (
    <div className="space-y-5 pb-8 sm:space-y-8 sm:pb-12">
      <ReportFiltersCard
        title={displayReport.title}
        filters={filters}
        doctors={currentDoctors}
        rowsPerPage={rowsPerPage}
        loading={loading}
        canExport={hasGeneratedReport}
        exportingFormat={exportingFormat}
        errorMessage={errorMessage}
        patientSearch={patientSearch}
        patientPickerOpen={patientPickerOpen}
        patientPickerRef={patientPickerRef}
        selectedPatientLabel={selectedPatientLabel}
        selectedPatientOption={selectedPatientOption}
        filteredPatientOptions={filteredPatientOptions}
        onPatientSearchChange={(value) => {
          setPatientSearch(value);
          setPatientPickerOpen(Boolean(value.trim()));
          setHasGeneratedReport(false);
          setPatientHistory(null);
          setActiveHistoryPatientId(null);
          setHistoryError(null);
          setStockHistory(null);
          setActiveStockItemId(null);
          if (filters.patientId) {
            setFilters((current) => ({ ...current, patientId: '' }));
          }
        }}
        onPatientFieldFocus={() => {
          setPatientPickerOpen(Boolean(patientSearch.trim()));
          if (filters.patientId && patientSearch === selectedPatientLabel) {
            setPatientSearch('');
          }
        }}
        onPatientPickerToggle={() => {
          if (!patientSearch.trim()) {
            setPatientPickerOpen(false);
            return;
          }

          setPatientPickerOpen((current) => !current);
        }}
        onClearPatientSearch={() => {
          setFilters((current) => ({ ...current, patientId: '' }));
          setPatientSearch('');
          setHasGeneratedReport(false);
          setPatientHistory(null);
          setActiveHistoryPatientId(null);
          setHistoryError(null);
          setStockHistory(null);
          setActiveStockItemId(null);
        }}
        onSelectPatient={(patient) => {
          setFilters((current) => ({ ...current, patientId: patient.patientId }));
          setPatientSearch(`${patient.patientName} | ${patient.phone} | ${patient.patientCode}`);
          setPatientPickerOpen(false);
          setHasGeneratedReport(false);
          setPatientHistory(null);
          setActiveHistoryPatientId(null);
          setHistoryError(null);
          setStockHistory(null);
          setActiveStockItemId(null);
        }}
        onRowsPerPageChange={setRowsPerPage}
        onReportTypeChange={(reportType) => void handleReportTypeChange(reportType)}
        onDateOrDoctorChange={(key, value) => void handleDateOrDoctorChange(key, value)}
        onExport={(format) => void handleExport(format)}
        onGenerateReport={() => void handleGenerateReport()}
      />

      <ReportSummaryCards loading={loading} metrics={displayReport.metrics} />

      {hasGeneratedReport ? (
        <div className={showPatientLayout ? 'grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_380px]' : 'block'}>
          <ReportTableSection
            loading={loading}
            reportType={appliedFilters.reportType}
            displayReport={generatedDisplayReport ?? displayReport}
            activePatientId={activeHistoryPatientId}
            activeStockItemId={activeStockItemId}
            exportingPatientId={exportingPatientId}
            stockHistoryRows={stockHistory?.transactions}
            paginatedRows={paginatedRows}
            filteredRowsCount={filteredReportRows.length}
            showingFrom={showingFrom}
            showingTo={showingTo}
            safePage={safePage}
            totalPages={totalPages}
            onPrevPage={() => setCurrentPage((current) => Math.max(1, current - 1))}
            onNextPage={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
            onViewHistory={(patientId) => void loadPatientHistory(patientId)}
            onDownloadHistory={(patientId) => void handlePatientHistoryDownload(patientId)}
            onViewStockHistory={(inventoryItemId) => void loadStockHistory(inventoryItemId)}
            onCloseStockHistory={() => {
              setStockHistory(null);
              setActiveStockItemId(null);
            }}
            onDownloadStockHistory={handleStockHistoryDownload}
          />

          {showPatientLayout ? (
            <PatientHistoryPanel
              history={activePatientHistory}
              loading={historyLoading}
              error={historyError}
              canClose
              downloading={Boolean(activeHistoryPatientId && activeHistoryPatientId === exportingPatientId)}
              onClose={() => {
                setPatientHistory(null);
                setActiveHistoryPatientId(null);
                setHistoryError(null);
              }}
              onDownloadPdf={() => {
                if (activeHistoryPatientId) {
                  void handlePatientHistoryDownload(activeHistoryPatientId);
                }
              }}
            />
          ) : null}
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-[#dce4e0] bg-white shadow-[0_20px_45px_rgba(20,46,38,0.05)] sm:rounded-[28px] lg:rounded-[30px]">
          <div className="border-b border-[#edf2ef] px-4 py-5 sm:px-6 lg:px-7">
            <h2 className="text-xl font-bold text-[#142e26]">Report Output</h2>
            <p className="mt-1 text-sm text-[#607d74]">Generate a report to view data table and insights.</p>
          </div>
          <div className="px-3 py-3 sm:px-6 sm:py-6">
            <div className="rounded-[24px] border border-dashed border-[#b9e2cb] bg-[linear-gradient(180deg,#f8fefb,#eef9f2)] px-6 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <h3 className="text-[32px] font-bold tracking-tight text-[#128549]">Generate a report</h3>
              <p className="mt-3 text-lg text-[#4f7a67]">Select a report and date range, then click Generate.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ReportsPage;
