'use client';

import React, { useState, useEffect } from 'react';
import { RPSData, createEmptyRPS } from '@/types/rps';

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

  // Update RPS data
  const updateRPS = (updates: Partial<RPSData>) => {
    setRpsData(prev => ({ ...prev, ...updates }));
  };

  function normalizeRpsData(input: unknown): RPSData {
    const base = createEmptyRPS();
    const data = (input && typeof input === 'object') ? (input as any) : {};

    const identitasSource = data.identitas || data.identity || {};
    const institusiSource = data.institusi || data.institution || {};
    const otoritasSource = data.otoritas || data.authority || {};
    const baseOtoritas = base.otoritas;

    const cplSource = Array.isArray(data.cpl) ? data.cpl : Array.isArray(data.cplList) ? data.cplList : base.cpl;
    const cpmkSource = Array.isArray(data.cpmk) ? data.cpmk : Array.isArray(data.cpmkList) ? data.cpmkList : base.cpmk;
    
    // Normalize IK with backward compatibility
    const ikSourceRaw = Array.isArray(data.ik) ? data.ik : Array.isArray(data.indikatorKinerjaList) ? data.indikatorKinerjaList : base.ik;
    const ikSource = ikSourceRaw.map((ik: any, idx: number) => {
      // Handle old format with kodeCPL -> find matching CPMK for that CPL
      let mapping_cpl = ik.mapping_cpl || '';
      let mapping_cpmk = ik.mapping_cpmk || '';
      
      // If using old format with kodeCPL, find the first CPMK that maps to this CPL
      if (!mapping_cpl && ik.kodeCPL && Array.isArray(cpmkSource)) {
        const matchingCpmk = cpmkSource.find((c: any) => c.mapping_cpl === ik.kodeCPL);
        if (matchingCpmk) {
          mapping_cpl = matchingCpmk.mapping_cpl;
          mapping_cpmk = matchingCpmk.kode;
        }
      }
      
      // Fallback: auto-assign to CPMK by index
      if (!mapping_cpmk && cpmkSource[idx]) {
        mapping_cpmk = cpmkSource[idx].kode;
        // Get CPL from CPMK's mapping
        mapping_cpl = cpmkSource[idx].mapping_cpl || '';
      }
      
      return {
        kode: ik.kode || '',
        pernyataan: ik.pernyataan || ik.ik_pernyataan || '',
        mapping_cpl: mapping_cpl,
        mapping_cpmk: mapping_cpmk,
      };
    });

    const referensiSource = Array.isArray(data.referensi)
      ? data.referensi
      : Array.isArray(data.references)
      ? data.references
      : [];

    const referensi = referensiSource
      .map((ref: any) => {
        if (typeof ref === 'string') return ref;
        if (ref && typeof ref === 'object') {
          const judul = ref.judul || ref.title || '';
          const penulis = ref.penulis || ref.author || '';
          const jenis = ref.jenis || ref.type || '';
          const parts = [judul, penulis].filter(Boolean).join(' - ');
          return jenis ? `${parts} (${jenis})`.trim() : parts.trim();
        }
        return '';
      })
      .filter((v: string) => v.length > 0);

    const parseBobot = (value: unknown): number => {
      if (typeof value === 'number') return value;
      const n = parseInt(String(value || '').replace('%', ''), 10);
      return Number.isFinite(n) ? n : 0;
    };

    const sourceWeeks = Array.isArray(data.minggu) ? data.minggu : Array.isArray(data.weeklyPlan) ? data.weeklyPlan : [];
    const normalizeWeek = (week: any, weekNo: number) => {
      const kemampuanAkhir = week?.kemampuanAkhir || week?.cpmk || '';
      if (kemampuanAkhir === 'UTS' || kemampuanAkhir === 'UAS') {
        return { mingguKe: weekNo, kemampuanAkhir };
      }
      return {
        mingguKe: weekNo,
        kemampuanAkhir,
        bahanKajian: week?.bahanKajian || week?.topik || '',
        metodePembelajaran: {
          metode: week?.metodePembelajaran?.metode || week?.metode || '',
          deskripsi: week?.metodePembelajaran?.deskripsi || week?.deskripsi_metode || '',
          aktivitas: week?.metodePembelajaran?.aktivitas || week?.aktivitas || '',
        },
        waktu: week?.waktu || base.minggu[weekNo - 1]?.waktu || '3x50"',
        pengalamanBelajar: week?.pengalamanBelajar || week?.pengalaman || '',
        penilaian: {
          kriteria: week?.penilaian?.kriteria || week?.indikator || '',
          bobotMateri: parseBobot(week?.penilaian?.bobotMateri ?? week?.penilaian?.bobot ?? week?.bobot),
        },
      };
    };

    const merged: RPSData = {
      ...base,
      id: data.id || base.id,
      createdAt: data.createdAt || base.createdAt,
      updatedAt: data.updatedAt || base.updatedAt,
      identitas: { ...base.identitas, ...identitasSource },
      institusi: { ...base.institusi, ...institusiSource },
      otoritas: {
        ...baseOtoritas,
        ...otoritasSource,
        koordinatorMK: { ...baseOtoritas.koordinatorMK, ...(otoritasSource.koordinatorMK || {}) },
        koordinatorGPM: { ...baseOtoritas.koordinatorGPM, ...(otoritasSource.koordinatorGPM || {}) },
        ketuaProdi: { ...baseOtoritas.ketuaProdi, ...(otoritasSource.ketuaProdi || {}) },
        dekan: { ...baseOtoritas.dekan, ...(otoritasSource.dekan || {}) },
      },
      deskripsi: data.deskripsi || data.deskripsiSingkat || base.deskripsi,
      cpl: cplSource,
      cpmk: cpmkSource,
      ik: ikSource,
      referensi,
      minggu: base.minggu,
    };

    const weeksByNumber = new Map<number, any>();
    if (Array.isArray(sourceWeeks)) {
      for (const week of sourceWeeks) {
        const n = typeof week?.mingguKe === 'number' ? week.mingguKe : parseInt(String(week?.mingguKe || ''), 10);
        const num = Number.isFinite(n) ? n : parseInt(String(week?.minggu || ''), 10);
        if (Number.isFinite(num) && num >= 1 && num <= 16) {
          weeksByNumber.set(num, week);
        }
      }
    }

    merged.minggu = Array.from({ length: 16 }, (_, idx) => {
      const weekNo = idx + 1;
      const baseWeek = base.minggu[idx] || {
        mingguKe: weekNo,
        kemampuanAkhir: weekNo === 8 ? 'UTS' : weekNo === 16 ? 'UAS' : '',
      };

      const existing = weeksByNumber.get(weekNo);
      if (!existing) return { ...baseWeek, mingguKe: weekNo };

      const normalizedWeek = normalizeWeek(existing, weekNo);
      return {
        ...baseWeek,
        ...normalizedWeek,
        metodePembelajaran: normalizedWeek.metodePembelajaran || baseWeek.metodePembelajaran || { metode: '', deskripsi: '', aktivitas: '' },
        penilaian: normalizedWeek.penilaian || baseWeek.penilaian || { kriteria: '', bobotMateri: 0 },
      };
    });

    return merged;
  }

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        const normalized = normalizeRpsData(parsedState.rpsData);
        setRpsData(normalized);
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

  // Load sample data
  const loadSample = async () => {
    try {
      setError(null);
      setIsGenerating(true);
      setGeneratingType('sample');

      // Load sample data from public/sample_rps.json (must match the file in repo)
      const response = await fetch('/sample_rps.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Gagal memuat sample_rps.json (${response.status})`);
      }

      const data = await response.json();
      const normalized = normalizeRpsData(data);

      setRpsData(normalized);
      setJenisMK('campuran');
      setPromptRpsMantap(normalized.deskripsi || '');
      setSuccess('✅ Data contoh berhasil dimuat dari sample_rps.json');
      setIsGenerating(false);
      setGeneratingType(null);
      setTimeout(() => setSuccess(null), 4000);
      return;
    } catch (err) {
      console.error('Gagal memuat sample:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat sample');
    }

    // Keep UI responsive
    setIsGenerating(false);
    setGeneratingType(null);
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

  const cplList = Array.isArray(rpsData.cpl) ? rpsData.cpl : [];
  const cpmkList = Array.isArray(rpsData.cpmk) ? rpsData.cpmk : [];
  const ikList = Array.isArray(rpsData.ik) ? rpsData.ik : [];

  // Generate with AI
  const generateWithAI = async (type: 'full' | 'description' | 'cpl' | 'cpmk' | 'weeklyPlan' | 'references', customContext?: string) => {
    if (!rpsData.identitas.nama) {
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
          identitas: rpsData.identitas,
          institusi: rpsData.institusi,
          jenisMK,
          additionalContext: customContext || promptRpsMantap,
          deskripsi: rpsData.deskripsi,
          cpl: cplList,
          cpmk: cpmkList,
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
        if (generatedData.deskripsi) updates.deskripsi = generatedData.deskripsi;
        if (generatedData.cpl) updates.cpl = generatedData.cpl;
        if (generatedData.ik) updates.ik = generatedData.ik;
        if (generatedData.cpmk) updates.cpmk = generatedData.cpmk;
        if (generatedData.minggu) updates.minggu = generatedData.minggu;
        if (generatedData.referensi) updates.referensi = generatedData.referensi;
        
        setRpsData(prev => ({ ...prev, ...updates }));
      } else if (type === 'description') {
        if (!generatedData.deskripsi) {
          throw new Error('No description data received');
        }
        updateRPS({ deskripsi: generatedData.deskripsi });
      } else if (type === 'cpl') {
        if (!generatedData.cpl || !Array.isArray(generatedData.cpl)) {
          throw new Error('Invalid CPL data structure received');
        }
        const updates: Partial<RPSData> = { cpl: generatedData.cpl };
        if (generatedData.ik) {
          updates.ik = generatedData.ik;
        }
        updateRPS(updates);
      } else if (type === 'cpmk') {
        if (!generatedData.cpmk || !Array.isArray(generatedData.cpmk)) {
          throw new Error('Invalid CPMK data structure received');
        }
        
        // Use IK from API if available
        let newIkList = generatedData.ik || [];
        
        // If IK not provided by API, ensure same length as CPMK
        if (newIkList.length !== generatedData.cpmk.length) {
          newIkList = generatedData.cpmk.map((cpmk: any, index: number) => {
            const existing = ikList[index];
            const fromAPI = newIkList[index];
            return fromAPI || existing || { 
              kode: `IK ${index + 1}`, 
              mapping_cpl: '', 
              pernyataan: '' 
            };
          });
        }
        
        updateRPS({ 
          cpmk: generatedData.cpmk,
          ik: newIkList
        });
      } else if (type === 'weeklyPlan') {
        if (!generatedData.minggu || !Array.isArray(generatedData.minggu)) {
          throw new Error('Invalid minggu data structure received');
        }
        updateRPS({ minggu: generatedData.minggu });
      } else if (type === 'references') {
        if (!generatedData.referensi || !Array.isArray(generatedData.referensi)) {
          throw new Error('Invalid referensi data structure received');
        }
        updateRPS({ referensi: generatedData.referensi });
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
    if (!rpsData.identitas.nama) {
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
            nama: rpsData.identitas.nama,
            kode: rpsData.identitas.kode,
            sks: rpsData.identitas.sks,
            semester: rpsData.identitas.semester,
            status: rpsData.identitas.status || 'Mata Kuliah Wajib',
            prasyarat: rpsData.identitas.prasyarat || '-',
            // Include otoritas data for DOCX export
            koordinatorMK: rpsData.otoritas.koordinatorMK,
            koordinatorGPM: rpsData.otoritas.koordinatorGPM,
            ketuaProdi: rpsData.otoritas.ketuaProdi,
            dekan: rpsData.otoritas.dekan,
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
      a.download = `RPS_${rpsData.identitas.kode || 'draft'}_${rpsData.identitas.nama.replace(/\s+/g, '_')}.docx`;
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
    a.download = `RPS_${rpsData.identitas.kode || 'draft'}.json`;
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
        const normalized = normalizeRpsData(data);
        setRpsData(normalized);
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
              disabled={isGenerating || !rpsData.identitas?.nama}
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
            <button 
              onClick={loadSample} 
              disabled={isGenerating}
              className="btn btn-secondary flex items-center gap-2"
            >
              {isGenerating && generatingType === 'sample' ? (
                <>
                  <span className="spinner" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  📥
                  <span>Muat Contoh</span>
                </>
              )}
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
              disabled={isExporting || !rpsData.identitas?.nama}
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
              {!rpsData.identitas?.nama && <span className="text-xs text-slate-500 italic">(Nama mata kuliah belum diisi)</span>}
            </div>
            {rpsData.identitas?.nama && (
              <p className="text-sm font-medium text-purple-700 mb-2">
                {rpsData.identitas?.nama}
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
            💡 <strong>Catatan:</strong> Jumlah Indikator Kinerja harus sama dengan jumlah CPMK ({cpmkList.length} IK)
          </p>
        </div>
        <div className="space-y-4">
          {ikList.map((ik, index) => {
            // Cari CPL dan CPMK yang terkait
            const linkedCpmk = cpmkList.find(c => c.kode === ik.mapping_cpmk);
            const linkedCpl = cplList.find(c => c.kode === ik.mapping_cpl);
            return (
              <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Kode IK</label>
                    <input
                      type="text"
                      value={ik.kode}
                      onChange={(e) => {
                        const newList = [...ikList];
                        newList[index] = { ...ik, kode: e.target.value };
                        updateRPS({ ik: newList });
                      }}
                      placeholder={`IK ${index + 1}`}
                      className="w-full text-center font-semibold text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">CPL</label>
                    <select
                      value={ik.mapping_cpl || ''}
                      onChange={(e) => {
                        const newList = [...ikList];
                        newList[index] = { ...ik, mapping_cpl: e.target.value };
                        updateRPS({ ik: newList });
                      }}
                      className="w-full text-sm"
                    >
                      <option value="">Pilih CPL</option>
                      {cplList.map((cpl) => (
                        <option key={cpl.kode} value={cpl.kode}>
                          {cpl.kode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">CPMK</label>
                    <select
                      value={ik.mapping_cpmk || ''}
                      onChange={(e) => {
                        const newList = [...ikList];
                        newList[index] = { ...ik, mapping_cpmk: e.target.value };
                        updateRPS({ ik: newList });
                      }}
                      className="w-full text-sm"
                    >
                      <option value="">Pilih CPMK</option>
                      {cpmkList.map((cpmk) => (
                        <option key={cpmk.kode} value={cpmk.kode}>
                          {cpmk.kode}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Pernyataan Indikator Kinerja</label>
                    <textarea
                      value={ik.pernyataan || ''}
                      onChange={(e) => {
                        const newList = [...ikList];
                        newList[index] = { ...ik, pernyataan: e.target.value };
                        updateRPS({ ik: newList });
                      }}
                      rows={2}
                      placeholder="Pernyataan indikator kinerja..."
                      className="w-full text-sm resize-y min-h-[60px]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.max(60, target.scrollHeight) + 'px';
                      }}
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-center">
                    <button
                      onClick={() => {
                        const newList = ikList.filter((_, i) => i !== index);
                        updateRPS({ ik: newList });
                      }}
                      className="btn btn-danger text-sm px-3"
                      title="Hapus IK"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => {
              updateRPS({
                ik: [...ikList, { kode: '', mapping_cpl: '', mapping_cpmk: '', pernyataan: '' }]
              });
            }}
            className="btn btn-secondary text-sm"
          >
            + Tambah IK
          </button>
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
