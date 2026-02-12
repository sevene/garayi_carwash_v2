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

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false // Server-side, no browser persistence needed for this check
        }
    });

    try {
        // 1. Authenticate with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            return { success: false, error: authError.message };
        }

        if (!authData.user) {
            return { success: false, error: 'Authentication failed' };
        }

        // 2. Cross-reference with Employees Table
        // We query the public table 'employees' using service role or anon key (if RLS allows)
        // Since we are using anon key, RLS must allow select by email or similar.
        // Assuming RLS is disabled or allows public read for now as per previous plan.
        const { data: employees, error: dbError } = await supabase
            .from('employees')
            .select('*')
            .eq('email', email)
            .single();

        if (dbError || !employees) {
            console.error('Database error or employee not found:', dbError);
            return { success: false, error: 'Employee record not found for this user.' };
        }

        const employee = employees;

        // 3. Create Custom Session for Middleware
        const sessionToken = await createSession({
            userId: employee.id, // UUID
            username: employee.username,
            role: employee.role
        });

        // 4. Set Cookie for Middleware
        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: getEnv('NODE_ENV') === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return { success: true, role: employee.role, session: authData.session };

    } catch (error: any) {
        console.error('Login action error:', error);
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}
export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}
