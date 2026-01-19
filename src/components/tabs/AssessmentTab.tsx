'use client';

import React from 'react';
import { RPSData } from '@/types/rps';

interface AssessmentTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
}

export default function AssessmentTab({ data }: AssessmentTabProps) {
  const assessmentTypes = [
    { name: 'Partisipatif', bobot: 20, key: 'N1' },
    { name: 'Project', bobot: 30, key: 'N2' },
    { name: 'Kuis', bobot: 10, key: 'N3' },
    { name: 'UTS', bobot: 20, key: 'N4' },
    { name: 'UAS', bobot: 20, key: 'N5' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Bobot Penilaian</h3>
        <p className="text-sm text-slate-500 mt-1">
          Penilaian dihitung berdasarkan nilai N1-N5 di setiap CPMK
        </p>
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-slate-800 mb-4">Struktur Penilaian</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {assessmentTypes.map((type, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{type.bobot}%</div>
                <div className="text-sm font-medium text-slate-700 mt-2">{type.name}</div>
                <div className="text-xs text-slate-500 mt-1">({type.key})</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-slate-600">
          Total: <span className="font-bold text-green-600">100%</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <h4 className="font-semibold text-slate-800 mb-3">Nilai Penilaian per CPMK</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-2">CPMK</th>
              <th className="px-3 py-2">Pernyataan</th>
              <th className="px-3 py-2 w-20 text-center">N1 (20%)</th>
              <th className="px-3 py-2 w-20 text-center">N2 (30%)</th>
              <th className="px-3 py-2 w-20 text-center">N3 (10%)</th>
              <th className="px-3 py-2 w-20 text-center">N4 (20%)</th>
              <th className="px-3 py-2 w-20 text-center">N5 (20%)</th>
              <th className="px-3 py-2 w-20 text-center bg-slate-100">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.cpmk.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-cell text-center text-slate-500 py-8">
                  Belum ada CPMK
                </td>
              </tr>
            ) : (
              data.cpmk.map((item, index) => {
                const total = (item.N1 || 0) + (item.N2 || 0) + (item.N3 || 0) + (item.N4 || 0) + (item.N5 || 0);
                return (
                  <tr key={index} className="border-b border-slate-200">
                    <td className="table-cell font-semibold">{item.kode}</td>
                    <td className="table-cell">{item.pernyataan}</td>
                    <td className="table-cell text-center">{item.N1 || 0}</td>
                    <td className="table-cell text-center">{item.N2 || 0}</td>
                    <td className="table-cell text-center">{item.N3 || 0}</td>
                    <td className="table-cell text-center">{item.N4 || 0}</td>
                    <td className="table-cell text-center">{item.N5 || 0}</td>
                    <td className={`table-cell text-center font-bold bg-slate-100 ${total === 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {total}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}