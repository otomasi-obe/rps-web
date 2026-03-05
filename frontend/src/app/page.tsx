import RPSEditor from '@/components/RPSEditor';

export default function Home() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Buat RPS Baru</h2>
        <p className="text-slate-600 mt-1">
          Gunakan form di bawah untuk membuat Rencana Pembelajaran Semester. 
          Anda dapat mengisi manual atau menggunakan AI untuk generate konten.
        </p>
      </div>
      <RPSEditor />
    </div>
  );
}
