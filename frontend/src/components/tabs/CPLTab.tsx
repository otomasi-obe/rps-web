'use client';

import React from 'react';
import { RPSData, CPL } from '@/types/rps';

interface CPLTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  contextValue?: string;
  onContextChange?: (value: string) => void;
  progress?: number;
}

export default function CPLTab({ data, onUpdate, onGenerate, isGenerating, contextValue = '', onContextChange, progress = 0 }: CPLTabProps) {
  const updateCPL = (index: number, updates: Partial<CPL>) => {
    const newList = [...data.cpl];
    newList[index] = { ...newList[index], ...updates };
    onUpdate({ cpl: newList });
  };

  const addCPL = () => {
    const nextNum = data.cpl.length + 1;
    onUpdate({
      cpl: [
        ...data.cpl,
        { kode: `CPL${nextNum}`, pernyataan: '' },
      ],
    });
  };

  const removeCPL = (index: number) => {
    if (data.cpl.length <= 1) return;
    onUpdate({
      cpl: data.cpl.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Generate Section with Context Input */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            💡 Konteks untuk Generate CPL (Opsional)
          </label>
          <textarea
            value={contextValue}
            onChange={(e) => onContextChange?.(e.target.value)}
            placeholder="Contoh: Fokus pada kemampuan analisis data, pemrograman Python, dan machine learning..."
            rows={2}
            className="w-full text-sm resize-y"
            style={{ minHeight: '60px' }}            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.max(60, target.scrollHeight) + 'px';
            }}          />
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating || !data.identitas.nama}
          className="btn btn-primary text-sm flex items-center gap-2"
        >
          {isGenerating ? <span className="spinner" /> : '🤖'}
          Generate CPL dengan AI
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">🎯 Daftar CPL</h3>
          <p className="text-sm text-slate-500 mt-1">
            CPL yang dibebankan pada mata kuliah ini
          </p>
        </div>
        <button onClick={addCPL} className="btn btn-secondary text-sm">
          + Tambah CPL
        </button>
      </div>

      <div className="space-y-4">
        {(!data.cpl || data.cpl.length === 0) ? (
          <div className="text-center py-8 text-slate-500">
            <p>Belum ada CPL. Klik "Generate CPL dengan AI" atau "Tambah CPL" untuk memulai.</p>
          </div>
        ) : (
          data.cpl.map((cpl, index) => (
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
                  className="w-full resize-y min-h-[60px]"
                  placeholder="Contoh: Mampu menganalisis dan memecahkan permasalahan rekayasa melalui pendekatan eksperimen..."
                  style={{ height: 'auto', minHeight: '60px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => removeCPL(index)}
                  disabled={!data.cpl || data.cpl.length <= 1}
                  className="btn btn-danger text-sm px-3"
                  title="Hapus CPL"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        )))}
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
