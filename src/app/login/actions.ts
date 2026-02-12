'use server';


import { cookies } from 'next/headers';
import { createSession } from '@/lib/auth';

// Safe process.env access for Edge Runtime
const getEnv = (key: string): string => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
    }
    return '';
};

export async function createSessionAction(accessToken: string, refreshToken: string) {
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase fetch failed: Missing env vars');
        return { success: false, error: 'Server configuration error' };
    }

    try {
        // 1. Verify User with Token via REST API
        // This avoids supabase-js library issues on Edge
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: 'GET',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userRes.ok) {
            console.error('User verification failed:', await userRes.text());
            return { success: false, error: 'Invalid session token' };
        }

        const user = await userRes.json();

        if (!user || !user.email) {
            return { success: false, error: 'User email not found' };
        }

        // 2. Fetch Employee Record via REST API
        // Query: SELECT * FROM employees WHERE email = user.email LIMIT 1
        const empUrl = `${supabaseUrl}/rest/v1/employees?email=eq.${encodeURIComponent(user.email)}&select=*&limit=1`;
        const empRes = await fetch(empUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`, // Query as Anon (public read likely)
                'Content-Type': 'application/json'
            }
        });

        if (!empRes.ok) {
            console.error('Employee fetch failed:', await empRes.text());
            return { success: false, error: 'Failed to access employee records' };
        }

        const empData = await empRes.json();

        if (!empData || empData.length === 0) {
            console.error('No employee found for email:', user.email);
            return { success: false, error: 'Employee record not found for this user.' };
        }

        const employee = empData[0];

        // 3. Create Custom Session for Middleware
        const sessionToken = await createSession({
            userId: employee.id,
            username: employee.username,
            role: employee.role
        });

        // 4. Set Cookie
        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: getEnv('NODE_ENV') === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return { success: true, role: employee.role };

    } catch (error: any) {
        console.error('Session creation error:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}
export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}
