import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RPS Generator - Sistem Pembuatan RPS',
  description: 'Sistem web untuk membuat Rencana Pembelajaran Semester (RPS) dengan bantuan AI untuk Universitas Diponegoro Sekolah Vokasi',
  keywords: 'RPS, Rencana Pembelajaran Semester, Generator RPS, AI RPS, Universitas Diponegoro, Undip, Sekolah Vokasi, Pendidikan Tinggi, Kurikulum',
  authors: [{ name: 'Universitas Diponegoro' }],
  creator: 'Sekolah Vokasi Universitas Diponegoro',
  publisher: 'Universitas Diponegoro',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://170.64.166.119',
    title: 'RPS Generator - Sistem Pembuatan RPS',
    description: 'Sistem web untuk membuat Rencana Pembelajaran Semester (RPS) dengan bantuan AI untuk Universitas Diponegoro',
    siteName: 'RPS Generator Undip',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RPS Generator - Sistem Pembuatan RPS',
    description: 'Sistem web untuk membuat Rencana Pembelajaran Semester (RPS) dengan bantuan AI',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="antialiased">
        <div className="min-h-screen">
          {/* Header */}
          <header className="bg-blue-700 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">📚 RPS Generator</h1>
                  <p className="text-blue-200 text-sm">Sistem Pembuatan Rencana Pembelajaran Semester</p>
                </div>
                <div className="text-right text-sm text-blue-200">
                  <p>Universitas Diponegoro</p>
                  <p>Sekolah Vokasi</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-slate-800 text-slate-400 text-center py-4 mt-8">
            <p className="text-sm">© 2026 RPS Generator System</p>
          </footer>
        </div>
      </body>
    </html>
  )
}
