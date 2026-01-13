'use client';

import React, { useState } from 'react';
import { RPSData, WeeklyPlan } from '@/types/rps';

interface WeeklyPlanTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  contextValue?: string;
  onContextChange?: (value: string) => void;
  progress?: number;
}

export default function WeeklyPlanTab({ data, onUpdate, onGenerate, isGenerating, contextValue = '', onContextChange, progress = 0 }: WeeklyPlanTabProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const updateWeek = (index: number, updates: Partial<WeeklyPlan>) => {
    const newPlan = [...data.weeklyPlan];
    newPlan[index] = { ...newPlan[index], ...updates };
    onUpdate({ weeklyPlan: newPlan });
  };

  const canGenerate = data.identity.nama && data.cpmkList.some(c => c.pernyataan) && data.deskripsiSingkat;

  // Calculate total bobot
  const totalBobot = data.weeklyPlan.reduce((sum, w) => sum + (w.penilaian.bobot || 0), 0);

  // Quick fill for UTS/UAS
  const quickFillExam = (weekIndex: number, type: 'UTS' | 'UAS') => {
    updateWeek(weekIndex, {
      kemampuanAkhir: type,
      bahanKajian: type === 'UTS' ? 'Ujian Tengah Semester' : 'Ujian Akhir Semester',
      metodePembelajaran: { metode: 'Ujian', deskripsi: 'Penilaian tertulis atau praktik komprehensif mencakup seluruh materi semester untuk mengukur kompetensi akhir mahasiswa.', aktivitas: 'Pelaksanaan ujian tulis atau praktik sesuai jadwal akademik institusi pendidikan tinggi' },
      pengalamanBelajar: `Mengerjakan soal ${type}`,
      penilaian: { kriteria: `Nilai ${type}`, bobot: type === 'UTS' ? 15 : 20 },
    });
  };

  return (
    <div className="space-y-6">
      {/* Generate Section with Context Input */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            💡 Konteks untuk Generate Rencana Mingguan (Opsional)
          </label>
          <textarea
            value={contextValue}
            onChange={(e) => onContextChange?.(e.target.value)}
            placeholder="Contoh: Minggu 1-4 fokus teori, minggu 5-12 praktik, minggu 13-15 proyek kelompok..."
            rows={2}
            className="w-full text-sm"
          />
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          className="btn btn-primary text-sm flex items-center gap-2"
          title={!canGenerate ? 'Isi CPMK dan deskripsi terlebih dahulu' : ''}
        >
          {isGenerating ? <span className="spinner" /> : '🤖'}
          Generate Rencana Mingguan dengan AI
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">📅 Daftar Rencana Mingguan</h3>
          <p className="text-sm text-slate-500 mt-1">
            Rencana pembelajaran untuk 16 minggu (1 semester)
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`text-sm font-medium ${totalBobot === 100 ? 'text-green-600' : 'text-red-600'}`}>
            Total Bobot: {totalBobot}%
          </span>
        </div>
      </div>

      {!canGenerate && (
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800">
          ⚠️ Untuk generate rencana mingguan dengan AI, pastikan CPMK dan deskripsi mata kuliah sudah diisi.
        </div>
      )}

      {/* Summary Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="table-header">
              <th className="px-2 py-2 w-16">Minggu</th>
              <th className="px-2 py-2">Kemampuan Akhir</th>
              <th className="px-2 py-2">Bahan Kajian</th>
              <th className="px-2 py-2 w-24">Bobot (%)</th>
              <th className="px-2 py-2 w-20">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.weeklyPlan.map((week, index) => (
              <React.Fragment key={week.mingguKe}>
                <tr
                  className={`border-b border-slate-200 cursor-pointer hover:bg-slate-50 ${
                    week.mingguKe === 8 || week.mingguKe === 16 ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setExpandedWeek(expandedWeek === index ? null : index)}
                >
                  <td className="table-cell text-center font-medium">{week.mingguKe}</td>
                  <td className="table-cell">
                    <input
                      type="text"
                      value={week.kemampuanAkhir}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateWeek(index, { kemampuanAkhir: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={week.mingguKe === 8 ? 'UTS' : week.mingguKe === 16 ? 'UAS' : 'CPMK X'}
                      className="w-full text-sm"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="text"
                      value={week.bahanKajian}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateWeek(index, { bahanKajian: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Pokok bahasan..."
                      className="w-full text-sm"
                    />
                  </td>
                  <td className="table-cell text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={week.penilaian.bobot}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateWeek(index, {
                          penilaian: { ...week.penilaian, bobot: parseInt(e.target.value) || 0 },
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 text-center text-sm"
                    />
                  </td>
                  <td className="table-cell text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedWeek(expandedWeek === index ? null : index);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {expandedWeek === index ? '▲' : '▼'}
                    </button>
                    {(week.mingguKe === 8 || week.mingguKe === 16) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          quickFillExam(index, week.mingguKe === 8 ? 'UTS' : 'UAS');
                        }}
                        className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                        title={`Isi cepat ${week.mingguKe === 8 ? 'UTS' : 'UAS'}`}
                      >
                        {week.mingguKe === 8 ? 'UTS' : 'UAS'}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Details */}
                {expandedWeek === index && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Metode Pembelajaran
                          </label>
                          <select
                            value={week.metodePembelajaran.metode}
                            onChange={(e) =>
                              updateWeek(index, {
                                metodePembelajaran: { ...week.metodePembelajaran, metode: e.target.value },
                              })
                            }
                            className="w-full text-sm border rounded px-2 py-1"
                          >
                            <option value="">Pilih metode...</option>
                            <option value="Ceramah">Ceramah</option>
                            <option value="Diskusi">Diskusi</option>
                            <option value="Kuis">Kuis</option>
                            <option value="Praktikum">Praktikum</option>
                            <option value="Project">Project</option>
                            <option value="Presentasi">Presentasi</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Deskripsi Metode <span className="text-red-500">*20 kata</span>
                          </label>
                          <textarea
                            value={week.metodePembelajaran.deskripsi}
                            onChange={(e) =>
                              updateWeek(index, {
                                metodePembelajaran: { ...week.metodePembelajaran, deskripsi: e.target.value },
                              })
                            }
                            rows={2}
                            className="w-full text-sm"
                            placeholder="Penjelasan metode pembelajaran (WAJIB 20 kata)..."
                          />
                          <span className="text-xs text-slate-500">
                            {(week.metodePembelajaran.deskripsi || '').split(/\s+/).filter(w => w).length} kata
                          </span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Aktivitas
                          </label>
                          <textarea
                            value={week.metodePembelajaran.aktivitas}
                            onChange={(e) =>
                              updateWeek(index, {
                                metodePembelajaran: { ...week.metodePembelajaran, aktivitas: e.target.value },
                              })
                            }
                            rows={2}
                            className="w-full text-sm"
                            placeholder="Penjelasan aktivitas pembelajaran..."
                          />
                          <span className="text-xs text-slate-500">
                            {(week.metodePembelajaran.aktivitas || '').split(/\s+/).filter(w => w).length} kata
                          </span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Waktu</label>
                          <input
                            type="text"
                            value={week.waktu}
                            onChange={(e) => updateWeek(index, { waktu: e.target.value })}
                            className="w-full text-sm"
                            placeholder='3x50"'
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Pengalaman Belajar Mahasiswa
                          </label>
                          <textarea
                            value={week.pengalamanBelajar}
                            onChange={(e) => updateWeek(index, { pengalamanBelajar: e.target.value })}
                            rows={2}
                            className="w-full text-sm"
                            placeholder="Aktivitas yang dilakukan mahasiswa..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Kriteria Penilaian
                          </label>
                          <textarea
                            value={week.penilaian.kriteria}
                            onChange={(e) =>
                              updateWeek(index, {
                                penilaian: { ...week.penilaian, kriteria: e.target.value },
                              })
                            }
                            rows={2}
                            className="w-full text-sm"
                            placeholder="Kriteria dan indikator penilaian..."
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {totalBobot !== 100 && (
        <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-800">
          ⚠️ Total bobot penilaian harus 100%. Saat ini: {totalBobot}%
        </div>
      )}
    </div>
  );
}
