import Sidebar from '@/components/account/Sidebar';

interface SidebarLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

export default function SidebarLayout({ children, userName, userEmail }: SidebarLayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      <Sidebar activePath="" userName={userName} userEmail={userEmail} />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
