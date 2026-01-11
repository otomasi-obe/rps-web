'use client';

import React from 'react';
import { RPSData, CPL } from '@/types/rps';

interface CPLTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function CPLTab({ data, onUpdate, onGenerate, isGenerating }: CPLTabProps) {
  const updateCPL = (index: number, updates: Partial<CPL>) => {
    const newList = [...data.cplList];
    newList[index] = { ...newList[index], ...updates };
    onUpdate({ cplList: newList });
  };

  const addCPL = () => {
    const nextNum = data.cplList.length + 1;
    onUpdate({
      cplList: [
        ...data.cplList,
        { kode: `CPL${nextNum}`, pernyataan: '' },
      ],
    });
  };

  const removeCPL = (index: number) => {
    if (data.cplList.length <= 1) return;
    onUpdate({
      cplList: data.cplList.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">🎯 Capaian Pembelajaran Lulusan (CPL)</h3>
          <p className="text-sm text-slate-500 mt-1">
            CPL yang dibebankan pada mata kuliah ini
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            disabled={isGenerating || !data.identity.nama}
            className="btn btn-secondary text-sm flex items-center gap-2"
          >
            {isGenerating ? <span className="spinner" /> : '🤖'}
            Generate CPL
          </button>
          <button onClick={addCPL} className="btn btn-primary text-sm">
            + Tambah CPL
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {data.cplList.map((cpl, index) => (
          <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex gap-4">
              <div className="w-28">
                <label className="block text-xs font-medium text-slate-600 mb-1">Kode CPL</label>
                <input
                  type="text"
                  value={cpl.kode}
                  onChange={(e) => updateCPL(index, { kode: e.target.value })}
                  className="w-full text-center font-semibold"
                  placeholder="CPL1"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Pernyataan CPL</label>
                <textarea
                  value={cpl.pernyataan}
                  onChange={(e) => updateCPL(index, { pernyataan: e.target.value })}
                  rows={2}
                  className="w-full"
                  placeholder="Contoh: Mampu menganalisis dan memecahkan permasalahan rekayasa melalui pendekatan eksperimen..."
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => removeCPL(index)}
                  disabled={data.cplList.length <= 1}
                  className="btn btn-danger text-sm px-3"
                  title="Hapus CPL"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">💡 Tips Menyusun CPL</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>CPL harus selaras dengan profil lulusan program studi</li>
          <li>Gunakan kata kerja operasional yang terukur (mampu, menguasai, memiliki)</li>
          <li>Cakup aspek pengetahuan, keterampilan, dan sikap</li>
          <li>Biasanya 3-5 CPL yang dibebankan pada satu mata kuliah</li>
        </ul>
      </div>
    </div>
  );
}
