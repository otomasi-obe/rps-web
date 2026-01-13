'use client';

import React from 'react';
import { RPSData } from '@/types/rps';

interface IdentityTabProps {
  data: RPSData;
  onUpdate: (updates: Partial<RPSData>) => void;
  jenisMK: 'teori' | 'praktikum' | 'campuran';
  onJenisMKChange: (value: 'teori' | 'praktikum' | 'campuran') => void;
}

export default function IdentityTab({
  data,
  onUpdate,
  jenisMK,
  onJenisMKChange,
}: IdentityTabProps) {
  return (
    <div className="space-y-6">
      {/* Course Identity */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">📋 Identitas Mata Kuliah</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kode Mata Kuliah</label>
            <input
              type="text"
              value={data.identity.kode}
              onChange={(e) => onUpdate({ identity: { ...data.identity, kode: e.target.value } })}
              placeholder="e.g., TRAO6251"
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Mata Kuliah *</label>
            <input
              type="text"
              value={data.identity.nama}
              onChange={(e) => onUpdate({ identity: { ...data.identity, nama: e.target.value } })}
              placeholder="e.g., Praktikum Mekatronika dan Robotika"
              className="w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SKS</label>
            <input
              type="number"
              min="1"
              max="6"
              value={data.identity.sks}
              onChange={(e) => onUpdate({ identity: { ...data.identity, sks: parseInt(e.target.value) || 2 } })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
            <input
              type="number"
              min="1"
              max="8"
              value={data.identity.semester}
              onChange={(e) => onUpdate({ identity: { ...data.identity, semester: parseInt(e.target.value) || 1 } })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status MK</label>
            <select
              value={data.identity.status}
              onChange={(e) => onUpdate({ identity: { ...data.identity, status: e.target.value } })}
              className="w-full"
            >
              <option value="Mata Kuliah Wajib">Mata Kuliah Wajib</option>
              <option value="Mata Kuliah Pilihan">Mata Kuliah Pilihan</option>
              <option value="Mata Kuliah Peminatan">Mata Kuliah Peminatan</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Mata Kuliah Prasyarat</label>
            <input
              type="text"
              value={data.identity.prasyarat}
              onChange={(e) => onUpdate({ identity: { ...data.identity, prasyarat: e.target.value } })}
              placeholder="e.g., Dasar Elektronika, Pemrograman Dasar"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Mata Kuliah</label>
            <select
              value={jenisMK}
              onChange={(e) => onJenisMKChange(e.target.value as 'teori' | 'praktikum' | 'campuran')}
              className="w-full"
            >
              <option value="teori">Teori</option>
              <option value="praktikum">Praktikum</option>
              <option value="campuran">Campuran (Teori + Praktikum)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Institution */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">🏫 Institusi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program Studi</label>
            <input
              type="text"
              value={data.institution.programStudi}
              onChange={(e) => onUpdate({ institution: { ...data.institution, programStudi: e.target.value } })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fakultas</label>
            <input
              type="text"
              value={data.institution.fakultas}
              onChange={(e) => onUpdate({ institution: { ...data.institution, fakultas: e.target.value } })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Universitas</label>
            <input
              type="text"
              value={data.institution.universitas}
              onChange={(e) => onUpdate({ institution: { ...data.institution, universitas: e.target.value } })}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Authority */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">👤 Otoritas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Koordinator MK */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-medium text-slate-700 mb-2">Koordinator Mata Kuliah</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nama"
                value={data.authority.koordinatorMK.nama}
                onChange={(e) =>
                  onUpdate({
                    authority: {
                      ...data.authority,
                      koordinatorMK: { ...data.authority.koordinatorMK, nama: e.target.value, jabatan: 'Koordinator Mata Kuliah' },
                    },
                  })
                }
                className="w-full"
              />
              <input
                type="text"
                placeholder="NIP/NPPU"
                value={data.authority.koordinatorMK.nip}
                onChange={(e) =>
                  onUpdate({
                    authority: {
                      ...data.authority,
                      koordinatorMK: { ...data.authority.koordinatorMK, nip: e.target.value, jabatan: 'Koordinator Mata Kuliah' },
                    },
                  })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Koordinator GPM */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-medium text-slate-700 mb-2">Koordinator GPM</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nama"
                value={data.authority.koordinatorGPM.nama}
                onChange={(e) =>
                  onUpdate({
                    authority: {
                      ...data.authority,
                      koordinatorGPM: { ...data.authority.koordinatorGPM, nama: e.target.value, jabatan: 'Koordinator GPM' },
                    },
                  })
                }
                className="w-full"
              />
              <input
                type="text"
                placeholder="NIP/NPPU"
                value={data.authority.koordinatorGPM.nip}
                onChange={(e) =>
                  onUpdate({
                    authority: {
                      ...data.authority,
                      koordinatorGPM: { ...data.authority.koordinatorGPM, nip: e.target.value, jabatan: 'Koordinator GPM' },
                    },
                  })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Ketua Prodi */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-medium text-slate-700 mb-2">Ketua Prodi</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nama"
                value={data.authority.ketuaProdi.nama}
                onChange={(e) =>
                  onUpdate({
                    authority: {
                      ...data.authority,
                      ketuaProdi: { ...data.authority.ketuaProdi, nama: e.target.value, jabatan: 'Ketua Prodi' },
                    },
                  })
                }
                className="w-full"
              />
              <input
                type="text"
                placeholder="NIP"
                value={data.authority.ketuaProdi.nip}
                onChange={(e) =>
                  onUpdate({
                    authority: {
                      ...data.authority,
                      ketuaProdi: { ...data.authority.ketuaProdi, nip: e.target.value, jabatan: 'Ketua Prodi' },
                    },
                  })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Dekan */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-medium text-slate-700 mb-2">Dekan</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nama"
                value={data.authority.dekan.nama}
                onChange={(e) =>
                  onUpdate({
                    authority: {
                      ...data.authority,
                      dekan: { ...data.authority.dekan, nama: e.target.value, jabatan: 'Dekan' },
                    },
                  })
                }
                className="w-full"
              />
              <input
                type="text"
                placeholder="NIP"
                value={data.authority.dekan.nip}
                onChange={(e) =>
                  onUpdate({
                    authority: {
                      ...data.authority,
                      dekan: { ...data.authority.dekan, nip: e.target.value, jabatan: 'Dekan' },
                    },
                  })
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">📝 Deskripsi Singkat Mata Kuliah</h3>
        <textarea
          value={data.deskripsiSingkat}
          onChange={(e) => onUpdate({ deskripsiSingkat: e.target.value })}
          placeholder="Deskripsi singkat mata kuliah (2-4 kalimat)..."
          rows={4}
          className="w-full"
        />
      </section>
    </div>
  );
}
