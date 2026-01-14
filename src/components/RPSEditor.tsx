'use client';

import React, { useState, useEffect } from 'react';
import { RPSData, createEmptyRPS, samplePraktikumMekatronika } from '@/types/rps';

// Section Components
import IdentityTab from '@/components/tabs/IdentityTab';
import CPLTab from '@/components/tabs/CPLTab';
import CPMKTab from '@/components/tabs/CPMKTab';
import WeeklyPlanTab from '@/components/tabs/WeeklyPlanTab';
import AssessmentTab from '@/components/tabs/AssessmentTab';
import ReferencesTab from '@/components/tabs/ReferencesTab';

const STORAGE_KEY = 'rps-editor-data';

export default function RPSEditor() {
  const [rpsData, setRpsData] = useState<RPSData>(createEmptyRPS());
  const [isLoaded, setIsLoaded] = useState(false);
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

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setRpsData(parsedState.rpsData || createEmptyRPS());
        setJenisMK(parsedState.jenisMK || 'campuran');
        setPromptRpsMantap(parsedState.promptRpsMantap || '');
        setCplContext(parsedState.cplContext || '');
        setCpmkContext(parsedState.cpmkContext || '');
        setWeeklyPlanContext(parsedState.weeklyPlanContext || '');
        setReferencesContext(parsedState.referencesContext || '');
      }
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
    }
    setIsLoaded(true);
  }, []);

  // Save all data to localStorage whenever any state changes (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      try {
        const stateToSave = {
          rpsData,
          jenisMK,
          promptRpsMantap,
          cplContext,
          cpmkContext,
          weeklyPlanContext,
          referencesContext,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }
    }
  }, [rpsData, jenisMK, promptRpsMantap, cplContext, cpmkContext, weeklyPlanContext, referencesContext, isLoaded]);

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
    if (confirm('Yakin ingin mereset semua data? Ini tidak bisa dibatalkan!')) {
      setRpsData(createEmptyRPS());
      setJenisMK('campuran');
      setPromptRpsMantap('');
      setCplContext('');
      setCpmkContext('');
      setWeeklyPlanContext('');
      setReferencesContext('');
      localStorage.removeItem(STORAGE_KEY);
      setSuccess('Form berhasil direset dan cache dihapus');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Generate with AI
  const generateWithAI = async (type: 'full' | 'description' | 'cpl' | 'cpmk' | 'weeklyPlan' | 'references', customContext?: string) => {
    if (!rpsData.identity.nama) {
      setError('⚠️ Nama mata kuliah harus diisi terlebih dahulu!');
      const identitySection = document.querySelector('[data-section="identity"]');
      if (identitySection) {
        identitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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

      const responseText = await response.text();
      
      // Debug: Log response untuk troubleshooting
      console.log('=== API Response Debug ===');
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Response Text (first 500 chars):', responseText.substring(0, 500));
      console.log('Response Length:', responseText.length);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Failed to parse response:', responseText.substring(0, 1000));
        throw new Error(`Invalid response format: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || 'Gagal generate konten');
      }

      // Merge generated data
      const generatedData = result.data;
      
      if (!generatedData) {
        throw new Error('No data received from server');
      }
      
      // Enhanced logging
      console.log('=== Generate Response Debug ===');
      console.log('Type:', type);
      console.log('Data keys:', Object.keys(generatedData));
      if (type === 'full' || type === 'weeklyPlan') {
        console.log('weeklyPlan exists:', !!generatedData.weeklyPlan);
        console.log('weeklyPlan is array:', Array.isArray(generatedData.weeklyPlan));
        console.log('weeklyPlan length:', generatedData.weeklyPlan?.length);
        if (generatedData.weeklyPlan?.length > 0) {
          console.log('First week:', generatedData.weeklyPlan[0]);
        }
      }
      
      if (type === 'full') {
        const updates: Partial<RPSData> = {};
        if (generatedData.deskripsiSingkat) updates.deskripsiSingkat = generatedData.deskripsiSingkat;
        if (generatedData.cplList) updates.cplList = generatedData.cplList;
        if (generatedData.indikatorKinerjaList) updates.indikatorKinerjaList = generatedData.indikatorKinerjaList;
        if (generatedData.cpmkList) updates.cpmkList = generatedData.cpmkList;
        if (generatedData.weeklyPlan) updates.weeklyPlan = generatedData.weeklyPlan;
        if (generatedData.assessmentMethods) updates.assessmentMethods = generatedData.assessmentMethods;
        if (generatedData.references) updates.references = generatedData.references;
        
        setRpsData(prev => ({ ...prev, ...updates }));
      } else if (type === 'description') {
        if (!generatedData.deskripsiSingkat) {
          throw new Error('No description data received');
        }
        updateRPS({ deskripsiSingkat: generatedData.deskripsiSingkat });
      } else if (type === 'cpl') {
        if (!generatedData.cplList || !Array.isArray(generatedData.cplList)) {
          throw new Error('Invalid CPL data structure received');
        }
        const updates: Partial<RPSData> = { cplList: generatedData.cplList };
        if (generatedData.indikatorKinerjaList) {
          updates.indikatorKinerjaList = generatedData.indikatorKinerjaList;
        }
        updateRPS(updates);
      } else if (type === 'cpmk') {
        if (!generatedData.cpmkList || !Array.isArray(generatedData.cpmkList)) {
          throw new Error('Invalid CPMK data structure received');
        }
        
        // Use IK from API if available, otherwise preserve existing or create new
        let newIndikatorList = generatedData.indikatorKinerjaList || [];
        
        // If IK not provided by API, ensure same length as CPMK
        if (newIndikatorList.length !== generatedData.cpmkList.length) {
          newIndikatorList = generatedData.cpmkList.map((cpmk: any, index: number) => {
            const existing = rpsData.indikatorKinerjaList[index];
            const fromAPI = newIndikatorList[index];
            return fromAPI || existing || { 
              kode: `IK ${index + 1}`, 
              kodeCPL: '', 
              pernyataan: '' 
            };
          });
        }
        
        updateRPS({ 
          cpmkList: generatedData.cpmkList,
          indikatorKinerjaList: newIndikatorList
        });
      } else if (type === 'weeklyPlan') {
        if (!generatedData.weeklyPlan || !Array.isArray(generatedData.weeklyPlan)) {
          throw new Error('Invalid weeklyPlan data structure received');
        }
        updateRPS({ weeklyPlan: generatedData.weeklyPlan });
      } else if (type === 'references') {
        if (!generatedData.references || !Array.isArray(generatedData.references)) {
          throw new Error('Invalid references data structure received');
        }
        updateRPS({ references: generatedData.references });
      }

      setSuccess(`Berhasil generate ${type === 'full' ? 'RPS lengkap' : type.toUpperCase()}`);
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setProgress(0);
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(errorMessage);
      console.error('Generate error:', err);
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
      console.log('=== Export Debug ===');
      console.log('Sending export request to /api/export');
      
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
            // Include authority data for DOCX export
            koordinatorMK: rpsData.authority.koordinatorMK,
            koordinatorGPM: rpsData.authority.koordinatorGPM,
            ketuaProdi: rpsData.authority.ketuaProdi,
            dekan: rpsData.authority.dekan,
          },
        }),
      });

      console.log('Export response status:', response.status);
      console.log('Export response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        const responseText = await response.text();
        console.error('Export error response (first 1000 chars):', responseText.substring(0, 1000));
        
        let errorMessage = 'Gagal export dokumen';
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = responseText.substring(0, 200) || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Success - response should be blob (DOCX file)
      const contentType = response.headers.get('content-type');
      console.log('Success response content-type:', contentType);
      
      // Download file
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'bytes');
      
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
      const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(errorMsg);
      console.error('Export error:', err);
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
              {isGenerating && generatingType === 'full' ? (
                <>
                  <span className="spinner" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  🤖
                  <span>Generate RPS Lengkap</span>
                </>
              )}
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
            onChange={(e) => setPromptRpsMantap(e.target.value)}
            placeholder="Contoh prompt lengkap:&#10;- Fokus pada praktik hands-on menggunakan Arduino dan sensor&#10;- Proyek akhir adalah membuat robot line follower&#10;- Gunakan metodologi PBL (Problem-Based Learning) untuk minggu 5-12&#10;- Integrasi dengan industri: undang praktisi dari perusahaan robotika&#10;- Sertifikasi Arduino sebagai pencapaian tambahan"
            rows={8}
            className="w-full text-sm"
          />
        </div>
      </div>

      {/* Section: Identitas MK */}
      <div className="card" data-section="identity">
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

      {/* Section: Indikator Kinerja */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📐</span>
          Pernyataan Indikator Kinerja (IK)
        </h2>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Catatan:</strong> Jumlah Indikator Kinerja harus sama dengan jumlah CPMK ({rpsData.cpmkList.length} IK)
          </p>
        </div>
        <div className="space-y-4">
          {rpsData.cpmkList.map((cpmk, index) => {
            const ik = rpsData.indikatorKinerjaList[index] || { kode: '', kodeCPL: '', pernyataan: '' };
            return (
              <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">CPMK</label>
                    <input
                      type="text"
                      value={cpmk.kode}
                      disabled
                      className="w-full text-center font-semibold bg-slate-100 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Kode IK</label>
                    <input
                      type="text"
                      value={ik.kode}
                      onChange={(e) => {
                        const newList = [...rpsData.indikatorKinerjaList];
                        newList[index] = { ...ik, kode: e.target.value };
                        updateRPS({ indikatorKinerjaList: newList });
                      }}
                      placeholder={`IK ${index + 1}`}
                      className="w-full text-center font-semibold text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">CPL</label>
                    <select
                      value={ik.kodeCPL}
                      onChange={(e) => {
                        const newList = [...rpsData.indikatorKinerjaList];
                        newList[index] = { ...ik, kodeCPL: e.target.value };
                        updateRPS({ indikatorKinerjaList: newList });
                      }}
                      className="w-full text-sm"
                    >
                      <option value="">Pilih CPL</option>
                      {rpsData.cplList.map((cpl) => (
                        <option key={cpl.kode} value={cpl.kode}>
                          {cpl.kode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Pernyataan Indikator Kinerja</label>
                    <textarea
                      value={ik.pernyataan}
                      onChange={(e) => {
                        const newList = [...rpsData.indikatorKinerjaList];
                        newList[index] = { ...ik, pernyataan: e.target.value };
                        updateRPS({ indikatorKinerjaList: newList });
                      }}
                      rows={2}
                      placeholder="Pernyataan indikator kinerja..."
                      className="w-full text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Media Asesmen */}
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📊</span>
          Media Asesmen dan Kontribusinya terhadap Skor Kompetensi MK
        </h2>
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
              {rpsData.cpmkList.map((cpmk, cpmkIndex) => {
                // Calculate totals for this CPMK from all assessment methods
                let qui = 0, prs = 0, pro = 0, uts = 0, uas = 0;
                
                rpsData.assessmentMethods.forEach((method) => {
                  const cpmkKey = `cpmk${cpmkIndex + 1}` as keyof typeof method.distribusiCPMK;
                  const value = method.distribusiCPMK[cpmkKey] || 0;
                  
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
        
        <div className="mt-3 text-xs text-slate-600 bg-blue-50 p-3 rounded">
          <p className="font-medium mb-1">💡 Keterangan:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>QUI = Kuis, PRS = Presentasi/Partisipatif, PRO = Proyek/Tugas/Laporan</li>
            <li>Total untuk setiap CPMK harus 100%</li>
            <li>Data dihitung otomatis dari tabel Metode Penilaian</li>
          </ul>
        </div>
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
