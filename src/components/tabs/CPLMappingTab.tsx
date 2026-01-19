'use client';

import React from 'react';
import { RPSData, IndikatorKinerja } from '@/types/rps';

interface CPLMappingTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
}

export default function CPLMappingTab({ data, onUpdate }: CPLMappingTabProps) {
  const updateIndikatorKinerja = (index: number, updates: Partial<IndikatorKinerja>) => {
    const newList = [...data.ik];
    newList[index] = { ...newList[index], ...updates };
    onUpdate({ ik: newList });
  };

  const addIndikatorKinerja = () => {
    onUpdate({
      ik: [
        ...data.ik,
        { kode: '', mapping_cpl: '', mapping_cpmk: '', pernyataan: '' },
      ],
    });
  };

  const removeIndikatorKinerja = (index: number) => {
    onUpdate({
      ik: data.ik.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">📋 CPL dan Indikator Kinerja (IK)</h3>
          <p className="text-sm text-slate-500 mt-1">
            Pemetaan CPL yang dibebankan pada mata kuliah dengan indikator kinerjanya
          </p>
        </div>
        <button onClick={addIndikatorKinerja} className="btn btn-primary text-sm">
          + Tambah IK
        </button>
      </div>

      {/* Table CPL-IK */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-2 w-28">Kode IK</th>
              <th className="px-3 py-2 w-28">CPL</th>
              <th className="px-3 py-2 w-32">CPMK</th>
              <th className="px-3 py-2">Pernyataan Indikator Kinerja (IK)</th>
              <th className="px-3 py-2 w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.ik.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-cell text-center text-slate-500 py-8">
                  Belum ada indikator kinerja. Klik "Tambah IK" untuk memulai.
                </td>
              </tr>
            ) : (
              data.ik.map((ik, index) => {
                return (
                <tr key={index} className="border-b border-slate-200">
                  <td className="table-cell">
                    <input
                      type="text"
                      value={ik.kode}
                      onChange={(e) => updateIndikatorKinerja(index, { kode: e.target.value })}
                      placeholder={`IK ${index + 1}`}
                      className="w-full text-center font-semibold text-sm"
                    />
                  </td>
                  <td className="table-cell">
                    <select
                      value={ik.mapping_cpl || ''}
                      onChange={(e) => updateIndikatorKinerja(index, { mapping_cpl: e.target.value })}
                      className="w-full text-sm"
                    >
                      <option value="">Pilih CPL</option>
                      {data.cpl.map((cpl) => (
                        <option key={cpl.kode} value={cpl.kode}>
                          {cpl.kode}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <select
                      value={ik.mapping_cpmk || ''}
                      onChange={(e) => updateIndikatorKinerja(index, { mapping_cpmk: e.target.value })}
                      className="w-full text-sm"
                    >
                      <option value="">Pilih CPMK</option>
                      {data.cpmk.map((cpmk) => (
                        <option key={cpmk.kode} value={cpmk.kode}>
                          {cpmk.kode}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <textarea
                      value={ik.pernyataan || ''}
                      onChange={(e) => updateIndikatorKinerja(index, { pernyataan: e.target.value })}
                      rows={1}
                      placeholder="Pernyataan indikator kinerja..."
                      className="w-full text-sm resize-y min-h-[40px]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.max(40, target.scrollHeight) + 'px';
                      }}
                    />
                  </td>
                  <td className="table-cell text-center">
                    <button
                      onClick={() => removeIndikatorKinerja(index)}
                      className="text-red-600 hover:text-red-800"
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">💡 Tips Menyusun IK</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>💡 Catatan: Jumlah Indikator Kinerja sebaiknya sama dengan jumlah CPMK ({data.cpmk.length} IK)</li>
          <li>Pilih CPL dan CPMK untuk setiap IK</li>
          <li>IK harus spesifik dan terukur, menjabarkan bagaimana CPL dicapai dalam mata kuliah ini</li>
          <li>Gunakan kata kerja operasional yang jelas (mampu menganalisis, mampu merancang, dll)</li>
          <li>IK akan menjadi dasar penilaian pencapaian CPL</li>
        </ul>
      </div>
    </div>
  );
}
