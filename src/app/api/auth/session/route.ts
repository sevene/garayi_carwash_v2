import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSession } from '@/lib/auth';

// Safe process.env access for Edge Runtime
const getEnv = (key: string): string => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || '';
    }
    return '';
};

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { accessToken, refreshToken } = body;

        const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
        const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Supabase fetch failed: Missing env vars');
            return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
        }

        // 1. Verify User with Token via REST API
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: 'GET',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userRes.ok) {
            console.error('User verification failed:', await userRes.text());
            return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 401 });
        }

        const user = await userRes.json();

        if (!user || !user.email) {
            return NextResponse.json({ success: false, error: 'User email not found' }, { status: 400 });
        }

        // 2. Fetch Employee Record via REST API
        // Join with roles table to get role name
        const empUrl = `${supabaseUrl}/rest/v1/employees?email=eq.${encodeURIComponent(user.email)}&select=*,roles(name)&limit=1`;
        const empRes = await fetch(empUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${accessToken}`, // Use User Token for RLS
                'Content-Type': 'application/json'
            }
        });

        if (!empRes.ok) {
            console.error('Employee fetch failed:', await empRes.text());
            return NextResponse.json({ success: false, error: 'Failed to access employee records' }, { status: 500 });
        }

        const empData = await empRes.json();

        if (!empData || empData.length === 0) {
            console.error('No employee found for email:', user.email);
            return NextResponse.json({ success: false, error: 'Employee record not found for this user.' }, { status: 404 });
        }

        const employee = empData[0];

        // Extract role name from joined data or fallback to role column
        // The roles relation returns an object or array depending on relationship type (One-to-One/Many-to-One usually object or array)
        // Since employee has one role, it should be an object or single item array
        let roleName = employee.role;

        if (employee.roles) {
            if (Array.isArray(employee.roles) && employee.roles.length > 0) {
                roleName = employee.roles[0].name;
            } else if (typeof employee.roles === 'object' && employee.roles.name) {
                roleName = employee.roles.name;
            }
        }

        // 3. Create Custom Session for Middleware
        const sessionToken = await createSession({
            userId: employee.id,
            username: employee.username,
            role: roleName // Use the human-readable role name (e.g. 'admin')
        });

        // 4. Set Cookie
        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: getEnv('NODE_ENV') === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return NextResponse.json({ success: true, role: roleName });

    } catch (error: any) {
        console.error('Session creation error:', error);
        return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred' }, { status: 500 });
    }
}
