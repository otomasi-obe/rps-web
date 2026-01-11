'use client';

import React from 'react';
import { RPSData, AssessmentMethod } from '@/types/rps';

interface AssessmentTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
}

export default function AssessmentTab({ data, onUpdate }: AssessmentTabProps) {
  const updateMethod = (index: number, updates: Partial<AssessmentMethod>) => {
    const newMethods = [...data.assessmentMethods];
    newMethods[index] = { ...newMethods[index], ...updates };
    onUpdate({ assessmentMethods: newMethods });
  };

  const addMethod = () => {
    onUpdate({
      assessmentMethods: [
        ...data.assessmentMethods,
        {
          teknik: '',
          persentase: 0,
          kriteria: '',
          distribusiCPMK: { cpmk1: 0, cpmk2: 0, cpmk3: 0, cpmk4: 0 },
        },
      ],
    });
  };

  const removeMethod = (index: number) => {
    if (data.assessmentMethods.length <= 1) return;
    onUpdate({
      assessmentMethods: data.assessmentMethods.filter((_, i) => i !== index),
    });
  };

  // Calculate totals
  const totalPersentase = data.assessmentMethods.reduce((sum, m) => sum + (m.persentase || 0), 0);
  const cpmkTotals = {
    cpmk1: data.assessmentMethods.reduce((sum, m) => sum + (m.distribusiCPMK.cpmk1 || 0), 0),
    cpmk2: data.assessmentMethods.reduce((sum, m) => sum + (m.distribusiCPMK.cpmk2 || 0), 0),
    cpmk3: data.assessmentMethods.reduce((sum, m) => sum + (m.distribusiCPMK.cpmk3 || 0), 0),
    cpmk4: data.assessmentMethods.reduce((sum, m) => sum + (m.distribusiCPMK.cpmk4 || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">✅ Metode Penilaian</h3>
          <p className="text-sm text-slate-500 mt-1">
            Teknik penilaian dan distribusi ke setiap CPMK
          </p>
        </div>
        <button onClick={addMethod} className="btn btn-primary text-sm">
          + Tambah Metode
        </button>
      </div>

      {/* Assessment Methods Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-2">Teknik Penilaian</th>
              <th className="px-3 py-2 w-24">Persentase</th>
              <th className="px-3 py-2">Kriteria/Indikator</th>
              <th className="px-3 py-2 w-20 text-center">CPMK 1</th>
              <th className="px-3 py-2 w-20 text-center">CPMK 2</th>
              <th className="px-3 py-2 w-20 text-center">CPMK 3</th>
              <th className="px-3 py-2 w-20 text-center">CPMK 4</th>
              <th className="px-3 py-2 w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.assessmentMethods.map((method, index) => (
              <tr key={index} className="border-b border-slate-200">
                <td className="table-cell">
                  <input
                    type="text"
                    value={method.teknik}
                    onChange={(e) => updateMethod(index, { teknik: e.target.value })}
                    placeholder="e.g., Aktivitas Partisipatif"
                    className="w-full"
                  />
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={method.persentase}
                      onChange={(e) => updateMethod(index, { persentase: parseInt(e.target.value) || 0 })}
                      className="w-16 text-center"
                    />
                    <span>%</span>
                  </div>
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    value={method.kriteria}
                    onChange={(e) => updateMethod(index, { kriteria: e.target.value })}
                    placeholder="Kriteria penilaian..."
                    className="w-full"
                  />
                </td>
                <td className="table-cell text-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={method.distribusiCPMK.cpmk1}
                    onChange={(e) =>
                      updateMethod(index, {
                        distribusiCPMK: {
                          ...method.distribusiCPMK,
                          cpmk1: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-14 text-center"
                  />
                </td>
                <td className="table-cell text-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={method.distribusiCPMK.cpmk2}
                    onChange={(e) =>
                      updateMethod(index, {
                        distribusiCPMK: {
                          ...method.distribusiCPMK,
                          cpmk2: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-14 text-center"
                  />
                </td>
                <td className="table-cell text-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={method.distribusiCPMK.cpmk3}
                    onChange={(e) =>
                      updateMethod(index, {
                        distribusiCPMK: {
                          ...method.distribusiCPMK,
                          cpmk3: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-14 text-center"
                  />
                </td>
                <td className="table-cell text-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={method.distribusiCPMK.cpmk4}
                    onChange={(e) =>
                      updateMethod(index, {
                        distribusiCPMK: {
                          ...method.distribusiCPMK,
                          cpmk4: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-14 text-center"
                  />
                </td>
                <td className="table-cell text-center">
                  <button
                    onClick={() => removeMethod(index)}
                    disabled={data.assessmentMethods.length <= 1}
                    className="text-red-600 hover:text-red-800"
                    title="Hapus"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}

            {/* Totals Row */}
            <tr className="bg-slate-100 font-semibold">
              <td className="table-cell">Total</td>
              <td className={`table-cell ${totalPersentase === 100 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPersentase}%
              </td>
              <td className="table-cell"></td>
              <td className="table-cell text-center">{cpmkTotals.cpmk1}%</td>
              <td className="table-cell text-center">{cpmkTotals.cpmk2}%</td>
              <td className="table-cell text-center">{cpmkTotals.cpmk3}%</td>
              <td className="table-cell text-center">{cpmkTotals.cpmk4}%</td>
              <td className="table-cell"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Validation Messages */}
      {totalPersentase !== 100 && (
        <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-800">
          ⚠️ Total persentase penilaian harus 100%. Saat ini: {totalPersentase}%
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">💡 Tips Menyusun Penilaian</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Total persentase semua metode penilaian harus 100%</li>
          <li>Setiap CPMK harus dinilai (total per CPMK tidak boleh 0)</li>
          <li>Distribusi ke CPMK menunjukkan kontribusi metode tersebut ke pencapaian CPMK</li>
          <li>Variasikan metode penilaian untuk mengukur berbagai aspek kompetensi</li>
        </ul>
      </div>

      {/* Common Assessment Templates */}
      <div className="bg-slate-50 p-4 rounded-lg">
        <h4 className="font-medium text-slate-800 mb-3">📋 Template Metode Penilaian Umum</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { teknik: 'Aktivitas Partisipatif', persentase: 10 },
            { teknik: 'Tugas/Laporan', persentase: 20 },
            { teknik: 'Kuis', persentase: 10 },
            { teknik: 'UTS', persentase: 25 },
            { teknik: 'UAS', persentase: 35 },
            { teknik: 'Proyek Kelompok', persentase: 30 },
            { teknik: 'Presentasi', persentase: 15 },
          ].map((template) => (
            <button
              key={template.teknik}
              onClick={() =>
                onUpdate({
                  assessmentMethods: [
                    ...data.assessmentMethods,
                    {
                      teknik: template.teknik,
                      persentase: template.persentase,
                      kriteria: '',
                      distribusiCPMK: { cpmk1: 0, cpmk2: 0, cpmk3: 0, cpmk4: 0 },
                    },
                  ],
                })
              }
              className="text-xs bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-100"
            >
              + {template.teknik} ({template.persentase}%)
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
