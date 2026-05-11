import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/admin/login');
  return session;
}
