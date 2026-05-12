import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <span className="inline-block mb-4 px-3 py-1 bg-[#01696f]/10 text-[#01696f] text-xs font-semibold tracking-widest uppercase rounded-full">
          Custom DTF Printing
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-4 max-w-3xl">
          Your design.<br />Any garment.<br />
          <span className="text-[#01696f]">Any quantity.</span>
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-xl">
          Upload your artwork, pick your colors and sizes, and place a bulk order — all in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/products"
            className="px-8 py-4 bg-[#01696f] text-white rounded-xl text-sm font-semibold hover:bg-[#0c4e54] transition-colors shadow-sm"
          >
            Shop Products
          </Link>
          <Link
            href="/admin/login"
            className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Choose a garment', desc: 'Pick from our catalog of tees, hoodies, and crewnecks in the colors you need.' },
              { step: '02', title: 'Upload your artwork', desc: 'Drop in your design file. We validate resolution and dimensions automatically.' },
              { step: '03', title: 'Select sizes & quantities', desc: 'Use the bulk grid to order different quantities per size in one go.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col gap-3">
                <span className="text-4xl font-black text-[#01696f]/20">{step}</span>
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
