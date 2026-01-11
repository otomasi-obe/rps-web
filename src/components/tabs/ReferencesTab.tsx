'use client';

import React from 'react';
import { RPSData, Reference } from '@/types/rps';

interface ReferencesTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
}

export default function ReferencesTab({ data, onUpdate }: ReferencesTabProps) {
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
              <div className="flex gap-4 items-start">
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                  {index + 1}
                </span>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Judul</label>
                    <input
                      type="text"
                      value={ref.judul}
                      onChange={(e) => updateReference(index, { judul: e.target.value })}
                      placeholder="Judul buku/artikel/website"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Penulis</label>
                    <input
                      type="text"
                      value={ref.penulis}
                      onChange={(e) => updateReference(index, { penulis: e.target.value })}
                      placeholder="Nama penulis"
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Jenis</label>
                      <select
                        value={ref.jenis}
                        onChange={(e) =>
                          updateReference(index, {
                            jenis: e.target.value as Reference['jenis'],
                          })
                        }
                        className="w-full"
                      >
                        <option value="buku">Buku</option>
                        <option value="jurnal">Jurnal</option>
                        <option value="website">Website</option>
                        <option value="regulasi">Regulasi</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tahun</label>
                      <input
                        type="number"
                        value={ref.tahun || ''}
                        onChange={(e) =>
                          updateReference(index, {
                            tahun: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="Tahun"
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeReference(index)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Hapus"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Common References for Engineering */}
      <div className="bg-slate-50 p-4 rounded-lg">
        <h4 className="font-medium text-slate-800 mb-3">📖 Referensi Umum (Klik untuk Menambahkan)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { judul: 'Mechatronics: Electronic Control Systems in Mechanical and Electrical Engineering', penulis: 'Bolton, W.', jenis: 'buku' as const, tahun: 2015 },
            { judul: 'Introduction to Robotics: Mechanics and Control', penulis: 'Craig, J.J.', jenis: 'buku' as const, tahun: 2017 },
            { judul: 'Modern Control Engineering', penulis: 'Ogata, K.', jenis: 'buku' as const, tahun: 2010 },
            { judul: 'Embedded Systems: Introduction to ARM Cortex-M Microcontrollers', penulis: 'Valvano, J.W.', jenis: 'buku' as const, tahun: 2017 },
            { judul: 'Arduino Programming', penulis: 'Arduino.cc', jenis: 'website' as const },
            { judul: 'ROS (Robot Operating System) Documentation', penulis: 'Open Robotics', jenis: 'website' as const },
            { judul: 'Peraturan Menteri Pendidikan tentang Standar Nasional Pendidikan Tinggi', penulis: 'Kemendikbud', jenis: 'regulasi' as const },
          ].map((ref, i) => (
            <button
              key={i}
              onClick={() => addCommonReference(ref)}
              className="text-left text-sm bg-white border border-slate-300 p-3 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <div className="font-medium text-slate-800">{ref.judul}</div>
              <div className="text-xs text-slate-500">
                {ref.penulis} {ref.tahun && `(${ref.tahun})`} • {ref.jenis}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">💡 Tips Menyusun Referensi</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Gunakan referensi terbaru (maksimal 10 tahun terakhir)</li>
          <li>Kombinasikan buku teks, jurnal ilmiah, dan sumber online</li>
          <li>Sertakan regulasi yang relevan (SN-Dikti, standar industri, dll.)</li>
          <li>Minimal 3-5 referensi untuk setiap mata kuliah</li>
        </ul>
      </div>
    </div>
  );
}
