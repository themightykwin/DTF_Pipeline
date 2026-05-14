import Link from 'next/link';

export default function EntryPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] flex flex-col items-center justify-center px-6">
      {/* Logo / brand */}
      <div className="mb-12 text-center">
        <span className="inline-block mb-4 px-3 py-1 bg-[#01696f]/10 text-[#01696f] text-xs font-semibold tracking-widest uppercase rounded-full">
          Custom DTF Printing
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-4 max-w-2xl">
          Your design.<br />Any garment.
        </h1>
        <p className="text-base text-gray-500 max-w-md mx-auto">
          Upload your artwork, pick your colors and sizes, and place your order — all in minutes.
        </p>
      </div>

      {/* Primary CTA split */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/account/register"
          className="flex-1 py-4 bg-[#01696f] text-white rounded-xl text-sm font-semibold text-center hover:bg-[#0c4e54] transition-colors shadow-sm"
        >
          Create an Account
        </Link>
        <Link
          href="/account/login"
          className="flex-1 py-4 bg-white border border-gray-200 text-gray-800 rounded-xl text-sm font-semibold text-center hover:bg-gray-50 transition-colors"
        >
          Sign In
        </Link>
      </div>

      {/* Admin escape hatch — subtle */}
      <p className="mt-10 text-xs text-gray-400">
        Store owner?{' '}
        <Link href="/admin/login" className="underline hover:text-gray-600 transition-colors">
          Admin login
        </Link>
      </p>
    </main>
  );
}
