import { requireAdminSession } from '@/lib/admin-auth';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = { title: 'Admin — DTF Pipeline' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Redirects to /admin/login if not authenticated
  await requireAdminSession();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', color: '#F5F5F5' }}>{children}</main>
    </div>
  );
}
