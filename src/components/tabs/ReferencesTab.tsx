'use client';

import React from 'react';
import { RPSData, Reference } from '@/types/rps';

interface ReferencesTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
  contextValue?: string;
  onContextChange?: (value: string) => void;
  progress?: number;
}

export default function ReferencesTab({ data, onUpdate, onGenerate, isGenerating = false, contextValue = '', onContextChange, progress = 0 }: ReferencesTabProps) {
  const updateReference = (index: number, updates: Partial<Reference>) => {
    const newRefs = [...data.references];
    newRefs[index] = { ...newRefs[index], ...updates };
    onUpdate({ references: newRefs });
  };

  const addReference = () => {
    onUpdate({
      references: [
        ...data.references,
        { judul: '', penulis: '', jenis: 'buku' },
      ],
    });
  };

  const removeReference = (index: number) => {
    onUpdate({
      references: data.references.filter((_, i) => i !== index),
    });
  };

  const addCommonReference = (ref: Reference) => {
    onUpdate({
      references: [...data.references, ref],
    });
  };

  return (
    <div className="space-y-6">
      {/* Generate Section with Context Input */}
      {onGenerate && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              💡 Konteks untuk Generate Referensi (Opsional)
            </label>
            <textarea
              value={contextValue}
              onChange={(e) => onContextChange?.(e.target.value)}
              placeholder="Contoh: Buku-buku tentang machine learning, deep learning, dan Python programming..."
              rows={2}
              className="w-full text-sm"
            />
          </div>
          <button
            onClick={onGenerate}
            disabled={isGenerating || !data.identity.nama}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            {isGenerating ? <span className="spinner" /> : '🤖'}
            Generate Referensi dengan AI
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">📚 Daftar Referensi</h3>
          <p className="text-sm text-slate-500 mt-1">
            Sumber pustaka dan referensi yang digunakan dalam mata kuliah
          </p>
        </div>
        <button onClick={addReference} className="btn btn-primary text-sm">
          + Tambah Referensi
        </button>
      </div>

      {/* References List */}
      <div className="space-y-3">
        {data.references.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
            <p>Belum ada referensi. Klik tombol di atas untuk menambahkan.</p>
          </div>
        ) : (
          data.references.map((ref, index) => (
            <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex gap-3 items-start">
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded min-w-fit">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <textarea
                    value={ref.judul}
                    onChange={(e) => updateReference(index, { judul: e.target.value })}
                    placeholder="Contoh: Judul Buku, Penulis, Penerbit, Tahun"
                    rows={2}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={() => removeReference(index)}
                  className="btn btn-danger text-sm px-3 h-fit"
                  title="Hapus referensi"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
