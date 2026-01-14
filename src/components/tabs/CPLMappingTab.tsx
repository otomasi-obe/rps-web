'use client';

import React from 'react';
import { RPSData, IndikatorKinerja } from '@/types/rps';

interface CPLMappingTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
}

export default function CPLMappingTab({ data, onUpdate }: CPLMappingTabProps) {
  const updateIndikatorKinerja = (index: number, updates: Partial<IndikatorKinerja>) => {
    const newList = [...data.indikatorKinerjaList];
    newList[index] = { ...newList[index], ...updates };
    onUpdate({ indikatorKinerjaList: newList });
  };

  const addIndikatorKinerja = () => {
    const nextNum = data.indikatorKinerjaList.length + 1;
    onUpdate({
      indikatorKinerjaList: [
        ...data.indikatorKinerjaList,
        { kode: `IK ${nextNum}`, kodeCPL: '', pernyataan: '' },
      ],
    });
  };

  const removeIndikatorKinerja = (index: number) => {
    onUpdate({
      indikatorKinerjaList: data.indikatorKinerjaList.filter((_, i) => i !== index),
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
              <th className="px-3 py-2 w-24">Kode CPL</th>
              <th className="px-3 py-2 w-24">IK - CPL</th>
              <th className="px-3 py-2">Pernyataan Indikator Kinerja</th>
              <th className="px-3 py-2 w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.indikatorKinerjaList.length === 0 ? (
              <tr>
                <td colSpan={4} className="table-cell text-center text-slate-500 py-8">
                  Belum ada indikator kinerja. Klik "Tambah IK" untuk memulai.
                </td>
              </tr>
            ) : (
              data.indikatorKinerjaList.map((ik, index) => (
                <tr key={index} className="border-b border-slate-200">
                  <td className="table-cell">
                    <select
                      value={ik.kodeCPL}
                      onChange={(e) => updateIndikatorKinerja(index, { kodeCPL: e.target.value })}
                      className="w-full text-sm"
                    >
                      <option value="">Pilih CPL</option>
                      {data.cplList.map((cpl) => (
                        <option key={cpl.kode} value={cpl.kode}>
                          {cpl.kode}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input
                      type="text"
                      value={ik.kode}
                      onChange={(e) => updateIndikatorKinerja(index, { kode: e.target.value })}
                      placeholder="IK 1"
                      className="w-full text-center font-semibold text-sm"
                    />
                  </td>
                  <td className="table-cell">
                    <textarea
                      value={ik.pernyataan}
                      onChange={(e) => updateIndikatorKinerja(index, { pernyataan: e.target.value })}
                      rows={2}
                      placeholder="Pernyataan indikator kinerja..."
                      className="w-full text-sm"
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Media Asesmen Section */}
      <div className="bg-slate-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          📊 Media Asesmen dan Kontribusinya terhadap Skor Kompetensi MK
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white">
            <thead>
              <tr className="table-header">
                <th className="px-3 py-2">CPMK</th>
                <th className="px-3 py-2 text-center w-20">QUI (%)</th>
                <th className="px-3 py-2 text-center w-20">PRS (%)</th>
                <th className="px-3 py-2 text-center w-20">PRO (%)</th>
                <th className="px-3 py-2 text-center w-20">UTS (%)</th>
                <th className="px-3 py-2 text-center w-20">UAS (%)</th>
                <th className="px-3 py-2 text-center w-20">Total (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.cpmkList.map((cpmk, cpmkIndex) => {
                // Calculate totals for this CPMK from all assessment methods
                let qui = 0, prs = 0, pro = 0, uts = 0, uas = 0;
                
                data.assessmentMethods.forEach((method) => {
                  // Find value for this CPMK from the array
                  let value = 0;
                  if (Array.isArray(method.distribusiCPMK)) {
                    const found = method.distribusiCPMK.find(d => d.cpmkId === `CPMK ${cpmkIndex + 1}`);
                    value = found?.nilai || 0;
                  } else {
                    // Legacy format support
                    const cpmkKey = `cpmk${cpmkIndex + 1}` as keyof typeof method.distribusiCPMK;
                    value = (method.distribusiCPMK as any)[cpmkKey] || 0;
                  }
                  
                  if (method.teknik.toLowerCase().includes('kuis')) {
                    qui += value;
                  } else if (method.teknik.toLowerCase().includes('presentasi') || method.teknik.toLowerCase().includes('partisipatif')) {
                    prs += value;
                  } else if (method.teknik.toLowerCase().includes('project') || method.teknik.toLowerCase().includes('tugas') || method.teknik.toLowerCase().includes('laporan')) {
                    pro += value;
                  } else if (method.teknik.toLowerCase().includes('uts')) {
                    uts += value;
                  } else if (method.teknik.toLowerCase().includes('uas')) {
                    uas += value;
                  }
                });
                
                const total = qui + prs + pro + uts + uas;
                
                return (
                  <tr key={cpmkIndex} className="border-b border-slate-200">
                    <td className="table-cell font-medium">{cpmk.kode}</td>
                    <td className="table-cell text-center">{qui || '-'}</td>
                    <td className="table-cell text-center">{prs || '-'}</td>
                    <td className="table-cell text-center">{pro || '-'}</td>
                    <td className="table-cell text-center">{uts || '-'}</td>
                    <td className="table-cell text-center">{uas || '-'}</td>
                    <td className={`table-cell text-center font-bold ${total === 100 ? 'text-green-600' : total > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="mt-3 text-xs text-slate-600">
          <p>💡 <strong>Catatan:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>QUI = Kuis, PRS = Presentasi/Partisipatif, PRO = Proyek/Tugas/Laporan</li>
            <li>Total untuk setiap CPMK harus 100%</li>
            <li>Data dihitung otomatis dari tabel Metode Penilaian</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">💡 Tips Menyusun CPL-IK</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Setiap CPL harus memiliki minimal 1 Indikator Kinerja (IK)</li>
          <li>IK harus spesifik dan terukur, menjabarkan bagaimana CPL dicapai dalam mata kuliah ini</li>
          <li>Gunakan kata kerja operasional yang jelas (mampu menganalisis, mampu merancang, dll)</li>
          <li>IK akan menjadi dasar penilaian pencapaian CPL</li>
        </ul>
      </div>
    </div>
  );
}
