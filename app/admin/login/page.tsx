import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export const metadata = { title: 'Admin Login — DTF Pipeline' };

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect('/admin/products');

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Admin Login</h1>
        <p className="text-sm text-gray-500 mb-6">DTF Pipeline — Staff access only</p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
