import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f6f2]">
      <h1 className="text-2xl font-semibold text-gray-900 mb-3">DTF Pipeline</h1>
      <p className="text-sm text-gray-500 mb-6">Custom apparel print-order platform</p>
      <Link
        href="/customize"
        className="px-6 py-3 bg-[#01696f] text-white rounded-lg text-sm font-medium hover:bg-[#0c4e54] transition-colors"
      >
        Open Customizer
      </Link>
    </main>
  );
}
