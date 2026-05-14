import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DTF Pipeline',
  description: 'Custom apparel DTF print-order platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-obsidian-bg">
      <body className="antialiased bg-obsidian-bg text-[#F5F5F5] min-h-screen">
        {children}
      </body>
    </html>
  );
}
