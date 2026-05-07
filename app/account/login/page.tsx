import { buildAuthUrl, generatePkce } from '@/lib/shopify-customer-auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export const metadata = { title: 'Sign In — DTF Pipeline' };

/**
 * This page is a Server Component that immediately kicks off the PKCE flow
 * and redirects to Shopify's customer login. No interactive form needed.
 */
export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: { shopId?: string; error?: string };
}) {
  if (searchParams.error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full bg-white border border-red-100 rounded-xl p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-red-700 mb-2">Login failed</h1>
          <p className="text-sm text-gray-500">
            {searchParams.error === 'state_mismatch' ? 'Security check failed. Please try again.' : 'Something went wrong. Please try again.'}
          </p>
          <a href="/account/login" className="mt-4 inline-block text-sm text-[#01696f] hover:underline">
            Try again →
          </a>
        </div>
      </main>
    );
  }

  // Generate PKCE + state and store in cookies, then redirect
  const shopId = searchParams.shopId ?? process.env.DEFAULT_SHOP_ID ?? '';
  const { verifier, challenge } = generatePkce();
  const state = crypto.randomBytes(16).toString('hex');

  const cookieStore = cookies();
  cookieStore.set('customer_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600 });
  cookieStore.set('customer_pkce_verifier', verifier, { httpOnly: true, sameSite: 'lax', maxAge: 600 });

  const authUrl = buildAuthUrl(shopId, state, challenge);
  redirect(authUrl);
}
