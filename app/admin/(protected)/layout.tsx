import { requireAdminSession } from '@/lib/admin-auth';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = { title: 'Admin — DTF Pipeline' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Redirects to /admin/login if not authenticated
  await requireAdminSession();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
