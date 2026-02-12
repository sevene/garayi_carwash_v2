'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSession } from '@/lib/auth';

// Safe process.env access for Edge Runtime
const getEnv = (key: string): string => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
    }
    return '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

export async function createSessionAction(accessToken: string, refreshToken: string) {
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
        return { success: false, error: 'Server configuration error' };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
    });

    try {
        // 1. Verify User with Token
        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

        if (authError || !user || !user.email) {
            return { success: false, error: 'Invalid session token' };
        }

        // 2. Fetch Employee Record
        const { data: employee, error: dbError } = await supabase
            .from('employees')
            .select('*')
            .eq('email', user.email)
            .single();

        if (dbError || !employee) {
            console.error('Database error or employee not found:', dbError);
            return { success: false, error: 'Employee record not found for this user.' };
        }

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
