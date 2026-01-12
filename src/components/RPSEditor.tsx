'use client';

import React, { useState } from 'react';
import { RPSData, createEmptyRPS, samplePraktikumMekatronika } from '@/types/rps';

// Tab Components
import IdentityTab from '@/components/tabs/IdentityTab';
import CPLTab from '@/components/tabs/CPLTab';
import CPMKTab from '@/components/tabs/CPMKTab';
import WeeklyPlanTab from '@/components/tabs/WeeklyPlanTab';
import AssessmentTab from '@/components/tabs/AssessmentTab';
import ReferencesTab from '@/components/tabs/ReferencesTab';

type TabId = 'identity' | 'cpl' | 'cpmk' | 'weeklyPlan' | 'assessment' | 'references';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'identity', label: 'Identitas MK', icon: '📋' },
  { id: 'cpl', label: 'CPL', icon: '🎯' },
  { id: 'cpmk', label: 'CPMK', icon: '📊' },
  { id: 'weeklyPlan', label: 'Rencana Mingguan', icon: '📅' },
  { id: 'assessment', label: 'Penilaian', icon: '✅' },
  { id: 'references', label: 'Referensi', icon: '📚' },
];

export default function RPSEditor() {
  const [rpsData, setRpsData] = useState<RPSData>(createEmptyRPS());
  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [jenisMK, setJenisMK] = useState<'teori' | 'praktikum' | 'campuran'>('campuran');
  const [additionalContext, setAdditionalContext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const usePythonAPI = true; // Always use Python API

  // Update RPS data
  const updateRPS = (updates: Partial<RPSData>) => {
    setRpsData(prev => ({ ...prev, ...updates }));
  };

  // Load sample data
  const loadSample = () => {
    setRpsData(samplePraktikumMekatronika);
    setJenisMK('praktikum');
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
  const generateWithAI = async (type: 'full' | 'description' | 'cpl' | 'cpmk' | 'weeklyPlan') => {
    if (!rpsData.identity.nama) {
      setError('Nama mata kuliah harus diisi terlebih dahulu');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Use Python API if enabled
      const apiPath = usePythonAPI ? '/api/generate-python' : '/api/generate';
      
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          identity: rpsData.identity,
          institution: rpsData.institution,
          jenisMK,
          additionalContext,
          deskripsiSingkat: rpsData.deskripsiSingkat,
          cplList: rpsData.cplList,
          cpmkList: rpsData.cpmkList,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal generate konten');
      }

      // Merge generated data
      const generatedData = result.data;
      
      if (type === 'full' || usePythonAPI) {
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
      }

      setSuccess(`Berhasil generate ${type === 'full' ? 'RPS lengkap' : type.toUpperCase()} menggunakan ${usePythonAPI ? 'Python API' : 'Next.js API'}`);
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsGenerating(false);
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
      // Use Python API if enabled  
      const apiPath = usePythonAPI ? '/api/export-python' : '/api/export';
      
      const response = await fetch(apiPath, {
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

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'identity':
        return (
          <IdentityTab
            data={rpsData}
            onUpdate={updateRPS}
            jenisMK={jenisMK}
            onJenisMKChange={setJenisMK}
            additionalContext={additionalContext}
            onAdditionalContextChange={setAdditionalContext}
            onGenerateDescription={() => generateWithAI('description')}
            isGenerating={isGenerating}
          />
        );
      case 'cpl':
        return (
          <CPLTab
            data={rpsData}
            onUpdate={updateRPS}
            onGenerate={() => generateWithAI('cpl')}
            isGenerating={isGenerating}
          />
        );
      case 'cpmk':
        return (
          <CPMKTab
            data={rpsData}
            onUpdate={updateRPS}
            onGenerate={() => generateWithAI('cpmk')}
            isGenerating={isGenerating}
          />
        );
      case 'weeklyPlan':
        return (
          <WeeklyPlanTab
            data={rpsData}
            onUpdate={updateRPS}
            onGenerate={() => generateWithAI('weeklyPlan')}
            isGenerating={isGenerating}
          />
        );
      case 'assessment':
        return <AssessmentTab data={rpsData} onUpdate={updateRPS} />;
      case 'references':
        return <ReferencesTab data={rpsData} onUpdate={updateRPS} />;
      default:
        return null;
    }
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
              {isGenerating ? <span className="spinner" /> : '🤖'}
              Generate RPS dengan AI
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

      {/* Tabs */}
      <div className="card p-0">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab whitespace-nowrap ${
                activeTab === tab.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">{renderTabContent()}</div>
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
