import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Returns true if the logged-in user is the test admin (admin@clube.com)
 * AND the target email does NOT belong to a test user (does not end with @clube.com).
 */
export async function isRestrictedForTestAdmin(targetEmail?: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() === 'admin@clube.com') {
    if (!targetEmail || !targetEmail.toLowerCase().endsWith('@clube.com')) {
      return true; // restricted!
    }
  }
  return false;
}
