'use client';

import React, { useState } from 'react';
import { RPSData, createEmptyRPS, samplePraktikumMekatronika } from '@/types/rps';

// Section Components
import IdentityTab from '@/components/tabs/IdentityTab';
import CPLTab from '@/components/tabs/CPLTab';
import CPMKTab from '@/components/tabs/CPMKTab';
import WeeklyPlanTab from '@/components/tabs/WeeklyPlanTab';
import AssessmentTab from '@/components/tabs/AssessmentTab';
import ReferencesTab from '@/components/tabs/ReferencesTab';

export default function RPSEditor() {
  const [rpsData, setRpsData] = useState<RPSData>(createEmptyRPS());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [jenisMK, setJenisMK] = useState<'teori' | 'praktikum' | 'campuran'>('campuran');
  const [promptRpsMantap, setPromptRpsMantap] = useState('');
  const [cplContext, setCplContext] = useState('');
  const [cpmkContext, setCpmkContext] = useState('');
  const [weeklyPlanContext, setWeeklyPlanContext] = useState('');
  const [referencesContext, setReferencesContext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Update RPS data
  const updateRPS = (updates: Partial<RPSData>) => {
    setRpsData(prev => ({ ...prev, ...updates }));
  };

  // Load sample data
  const loadSample = () => {
    setRpsData(samplePraktikumMekatronika);
    setJenisMK('praktikum');
    setPromptRpsMantap(`Mata kuliah ini adalah praktikum mekatronika dan robotika yang fokus pada:
- Robotika mobile dan autonomous systems
- Menggunakan Arduino dan sensor ultrasonik
- Proyek akhir: line follower robot dengan obstacle avoidance

Target lulusan mampu:
- Merancang dan membuat robot mobile
- Program mikrokontroler dengan C/C++
- Integrasi sensor dan aktuator`);
    setSuccess('Data contoh berhasil dimuat');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Reset form
  const resetForm = () => {
    if (confirm('Yakin ingin mereset semua data?')) {
      setRpsData(createEmptyRPS());
      setSuccess('Form berhasil direset');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Generate with AI
  const generateWithAI = async (type: 'full' | 'description' | 'cpl' | 'cpmk' | 'weeklyPlan' | 'references', customContext?: string) => {
    if (!rpsData.identity.nama) {
      setError('Nama mata kuliah harus diisi terlebih dahulu');
      return;
    }

    // Block other generates if full is running
    if (isGenerating && generatingType === 'full' && type !== 'full') {
      setError('Tidak bisa generate saat Generate RPS Lengkap sedang berjalan');
      return;
    }

    setIsGenerating(true);
    setGeneratingType(type);
    setProgress(0);
    setError(null);

    // Progress only for button spinner (no interval)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          identity: rpsData.identity,
          institution: rpsData.institution,
          jenisMK,
          additionalContext: customContext || promptRpsMantap,
          deskripsiSingkat: rpsData.deskripsiSingkat,
          cplList: rpsData.cplList,
          cpmkList: rpsData.cpmkList,
        }),
      });

      setProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal generate konten');
      }

      // Merge generated data
      const generatedData = result.data;
      
      if (type === 'full') {
        setRpsData(prev => ({
          ...prev,
          deskripsiSingkat: generatedData.deskripsiSingkat || prev.deskripsiSingkat,
          cplList: generatedData.cplList || prev.cplList,
          cpmkList: generatedData.cpmkList || prev.cpmkList,
          weeklyPlan: generatedData.weeklyPlan || prev.weeklyPlan,
          assessmentMethods: generatedData.assessmentMethods || prev.assessmentMethods,
          references: generatedData.references || prev.references,
        }));
      } else if (type === 'description') {
        updateRPS({ deskripsiSingkat: generatedData.deskripsiSingkat });
      } else if (type === 'cpl') {
        updateRPS({ cplList: generatedData.cplList });
      } else if (type === 'cpmk') {
        updateRPS({ cpmkList: generatedData.cpmkList });
      } else if (type === 'weeklyPlan') {
        updateRPS({ weeklyPlan: generatedData.weeklyPlan });
      } else if (type === 'references') {
        updateRPS({ references: generatedData.references });
      }

      setSuccess(`Berhasil generate ${type === 'full' ? 'RPS lengkap' : type.toUpperCase()}`);
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setProgress(0);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Export to DOCX
  const exportToDocx = async () => {
    if (!rpsData.identity.nama) {
      setError('Nama mata kuliah harus diisi terlebih dahulu');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rpsData,
          meta: {
            nama: rpsData.identity.nama,
            kode: rpsData.identity.kode,
            sks: rpsData.identity.sks,
            semester: rpsData.identity.semester,
            status: rpsData.identity.status || 'Mata Kuliah Wajib',
            prasyarat: rpsData.identity.prasyarat || '-',
          },
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal export dokumen');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RPS_${rpsData.identity.kode || 'draft'}_${rpsData.identity.nama.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccess('Dokumen DOCX berhasil didownload');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsExporting(false);
    }
  };

  // Save/Load JSON
  const saveAsJson = () => {
    const json = JSON.stringify(rpsData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RPS_${rpsData.identity.kode || 'draft'}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const loadFromJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setRpsData(data);
        setSuccess('Data berhasil dimuat dari JSON');
        setTimeout(() => setSuccess(null), 3000);
      } catch {
        setError('Format JSON tidak valid');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Alert Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span>{error}</span>
          <button className="absolute top-0 right-0 px-4 py-3" onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span>{success}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card">
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => generateWithAI('full')}
              disabled={isGenerating || !rpsData.identity.nama}
              className="btn btn-primary flex items-center gap-2"
            >
              {isGenerating && generatingType === 'full' ? <span className="spinner" /> : '🤖'}
              Generate RPS Lengkap
            </button>
            <button onClick={loadSample} className="btn btn-secondary">
              📥 Muat Contoh
            </button>
            <button onClick={resetForm} className="btn btn-secondary">
              🔄 Reset
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveAsJson} className="btn btn-secondary">
              💾 Simpan JSON
            </button>
            <label className="btn btn-secondary cursor-pointer">
              📂 Muat JSON
              <input type="file" accept=".json" onChange={loadFromJson} className="hidden" />
            </label>
            <button
              onClick={exportToDocx}
              disabled={isExporting || !rpsData.identity.nama}
              className="btn btn-success flex items-center gap-2"
            >
              {isExporting ? <span className="spinner" /> : '📄'}
              Download DOCX
            </button>
          </div>
        </div>
      </div>

      {/* Prompt RPS Mantap Section */}
      <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 mb-1">💡 Prompt RPS Mantap</h3>
              {!rpsData.identity.nama && <span className="text-xs text-slate-500 italic">(Nama mata kuliah belum diisi)</span>}
            </div>
            {rpsData.identity.nama && (
              <p className="text-sm font-medium text-purple-700 mb-2">
                {rpsData.identity.nama}
              </p>
            )}
            <p className="text-xs text-slate-600 mb-3">
              Masukan ide-ide, kebutuhan khusus, atau instruksi detail untuk menggenerate RPS yang lebih disesuaikan
            </p>
          </div>
          <textarea
            value={promptRpsMantap}
            onChange={(e) => {
              setPromptRpsMantap(e.target.value);
              // Auto-expand textarea
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 500) + 'px';
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                // Auto-expand on enter
                setTimeout(() => {
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 500) + 'px';
                }, 0);
              }
            }}
            placeholder="Contoh prompt lengkap:&#10;- Fokus pada praktik hands-on menggunakan Arduino dan sensor&#10;- Proyek akhir adalah membuat robot line follower&#10;- Gunakan metodologi PBL (Problem-Based Learning) untuk minggu 5-12&#10;- Integrasi dengan industri: undang praktisi dari perusahaan robotika&#10;- Sertifikasi Arduino sebagai pencapaian tambahan"
            rows={8}
            style={{ overflow: 'hidden', resize: 'none' }}
            className="w-full text-sm"
          />
        </div>
      </div>

      {/* Section: Identitas MK */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📋</span>
          Identitas Mata Kuliah
        </h2>
        <IdentityTab
          data={rpsData}
          onUpdate={updateRPS}
          jenisMK={jenisMK}
          onJenisMKChange={setJenisMK}
        />
      </div>

      {/* Section: CPL */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🎯</span>
          Capaian Pembelajaran Lulusan (CPL)
        </h2>
        <CPLTab
          data={rpsData}
          onUpdate={updateRPS}
          onGenerate={() => generateWithAI('cpl', cplContext)}
          isGenerating={isGenerating && generatingType === 'cpl'}
          contextValue={cplContext}
          onContextChange={setCplContext}
          progress={progress}
        />
      </div>

      {/* Section: CPMK */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📊</span>
          Capaian Pembelajaran Mata Kuliah (CPMK)
        </h2>
        <CPMKTab
          data={rpsData}
          onUpdate={updateRPS}
          onGenerate={() => generateWithAI('cpmk', cpmkContext)}
          isGenerating={isGenerating && generatingType === 'cpmk'}
          contextValue={cpmkContext}
          onContextChange={setCpmkContext}
          progress={progress}
        />
      </div>

      {/* Section: Rencana Mingguan */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📅</span>
          Rencana Pembelajaran Mingguan
        </h2>
        <WeeklyPlanTab
          data={rpsData}
          onUpdate={updateRPS}
          onGenerate={() => generateWithAI('weeklyPlan', weeklyPlanContext)}
          isGenerating={isGenerating && generatingType === 'weeklyPlan'}
          contextValue={weeklyPlanContext}
          onContextChange={setWeeklyPlanContext}
          progress={progress}
        />
      </div>

      {/* Section: Penilaian */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>✅</span>
          Metode Penilaian
        </h2>
        <AssessmentTab data={rpsData} onUpdate={updateRPS} />
      </div>

      {/* Section: Referensi */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📚</span>
          Referensi
        </h2>
        <ReferencesTab 
          data={rpsData} 
          onUpdate={updateRPS}
          onGenerate={() => generateWithAI('references', referencesContext)}
          isGenerating={isGenerating && generatingType === 'references'}
          contextValue={referencesContext}
          onContextChange={setReferencesContext}
          progress={progress}
        />
      </div>

      {/* JSON Preview */}
      <details className="card">
        <summary className="cursor-pointer font-semibold text-slate-700">
          🔍 Preview JSON Data
        </summary>
        <pre className="mt-4 bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
          {JSON.stringify(rpsData, null, 2)}
        </pre>
      </details>
    </div>
  );
}
