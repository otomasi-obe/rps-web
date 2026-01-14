'use client';

import React from 'react';
import { RPSData, CPMK } from '@/types/rps';

interface CPMKTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  contextValue?: string;
  onContextChange?: (value: string) => void;
  progress?: number;
}

export default function CPMKTab({ data, onUpdate, onGenerate, isGenerating, contextValue = '', onContextChange, progress = 0 }: CPMKTabProps) {
  const updateCPMK = (index: number, updates: Partial<CPMK>) => {
    const newList = [...data.cpmkList];
    newList[index] = { ...newList[index], ...updates };
    onUpdate({ cpmkList: newList });
  };

  const addCPMK = () => {
    const nextNum = data.cpmkList.length + 1;
    onUpdate({
      cpmkList: [
        ...data.cpmkList,
        { kode: `CPMK ${nextNum}`, pernyataan: '' },
      ],
      indikatorKinerjaList: [
        ...data.indikatorKinerjaList,
        { kode: `IK ${nextNum}`, kodeCPL: '', pernyataan: '' },
      ],
    });
  };

  const removeCPMK = (index: number) => {
    if (data.cpmkList.length <= 1) return;
    onUpdate({
      cpmkList: data.cpmkList.filter((_, i) => i !== index),
      indikatorKinerjaList: data.indikatorKinerjaList.filter((_, i) => i !== index),
    });
  };

  const canGenerate = data.identity.nama && data.cplList.some(c => c.pernyataan) && data.deskripsiSingkat;

  return (
    <div className="space-y-6">
      {/* Generate Section with Context Input */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            💡 Konteks untuk Generate CPMK (Opsional)
          </label>
          <textarea
            value={contextValue}
            onChange={(e) => onContextChange?.(e.target.value)}
            placeholder="Contoh: Mahasiswa harus mampu membuat aplikasi web full-stack, desain database, dan deploy ke cloud..."
            rows={2}
            className="w-full text-sm"
          />
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          className="btn btn-primary text-sm flex items-center gap-2"
          title={!canGenerate ? 'Isi CPL dan deskripsi terlebih dahulu' : ''}
        >
          {isGenerating ? <span className="spinner" /> : '🤖'}
          Generate CPMK dengan AI
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">📊 Daftar CPMK</h3>
          <p className="text-sm text-slate-500 mt-1">
            Setelah menyelesaikan pembelajaran mata kuliah ini, mahasiswa diharapkan mampu:
          </p>
        </div>
        <button onClick={addCPMK} className="btn btn-secondary text-sm">
          + Tambah CPMK
        </button>
      </div>

      {!canGenerate && (
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800">
          ⚠️ Untuk generate CPMK dengan AI, pastikan CPL dan deskripsi mata kuliah sudah diisi.
        </div>
      )}

      <div className="space-y-4">
        {data.cpmkList.map((cpmk, index) => (
          <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex gap-4">
              <div className="w-28">
                <label className="block text-xs font-medium text-slate-600 mb-1">Kode</label>
                <input
                  type="text"
                  value={cpmk.kode}
                  onChange={(e) => updateCPMK(index, { kode: e.target.value })}
                  className="w-full text-center font-semibold"
                  placeholder="CPMK 1"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Pernyataan CPMK</label>
                <textarea
                  value={cpmk.pernyataan}
                  onChange={(e) => updateCPMK(index, { pernyataan: e.target.value })}
                  rows={2}
                  className="w-full"
                  placeholder="Contoh: Merakit rangkaian sensor–aktuator dan melakukan pengukuran dasar serta troubleshooting."
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => removeCPMK(index)}
                  disabled={data.cpmkList.length <= 1}
                  className="btn btn-danger text-sm px-3"
                  title="Hapus CPMK"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mapping to CPL */}
      <div className="bg-slate-100 p-4 rounded-lg">
        <h4 className="font-medium text-slate-800 mb-3">📌 Pemetaan CPMK ke CPL</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-3 py-2">CPMK</th>
                {data.cplList.map((cpl) => (
                  <th key={cpl.kode} className="px-3 py-2 text-center">{cpl.kode}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cpmkList.map((cpmk) => (
                <tr key={cpmk.kode} className="border-b border-slate-200">
                  <td className="px-3 py-2 font-medium">{cpmk.kode}</td>
                  {data.cplList.map((cpl) => (
                    <td key={cpl.kode} className="px-3 py-2 text-center">
                      <input type="checkbox" className="w-4 h-4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          * Centang untuk menunjukkan CPMK mendukung pencapaian CPL tersebut
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">💡 Tips Menyusun CPMK</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>CPMK harus spesifik, terukur, dan dapat dicapai dalam satu semester</li>
          <li>Gunakan kata kerja operasional Taksonomi Bloom (menganalisis, menerapkan, mengevaluasi, dll.)</li>
          <li>Setiap CPMK harus terhubung dengan minimal satu CPL</li>
          <li>Biasanya 3-6 CPMK per mata kuliah</li>
        </ul>
      </div>
    </div>
  );
}
