# Garayi Carwash POS - PowerSync Edition

An offline-first Point of Sale system built with Next.js, Supabase, and PowerSync.

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   React App         │     │   PowerSync      │     │     Supabase        │
│   (Next.js)         │◄───►│   Service        │◄───►│    (PostgreSQL)     │
│                     │     │                  │     │                     │
│  ┌───────────────┐  │     │  - Sync Rules    │     │  - Tables           │
│  │ Local SQLite  │  │     │  - Real-time     │     │  - Auth             │
│  │ (OPFS/IDB)    │  │     │  - Offline Queue │     │  - Row Level Sec.   │
│  └───────────────┘  │     └──────────────────┘     └─────────────────────┘
```

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note down your:
   - **Project URL** (`https://your-project.supabase.co`)
   - **Anon Key** (found in Settings → API)
   - **Service Role Key** (found in Settings → API - keep secret!)

### 2. Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard.
2. Run the contents of `supabase-schema.sql` to create all tables.
   - This script creates tables for settings, employees, categories, products, services, tickets, etc.
   - It also seed an admin user (`admin` / `password` hash).

### 3. Configure PowerSync User & Publication

Run the following SQL commands in the Supabase SQL Editor to prepare for PowerSync:

```sql
-- Create PowerSync user with replication privileges
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'your_secure_password';

-- Grant SELECT access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Create the publication (MUST be named "powersync")
CREATE PUBLICATION powersync FOR ALL TABLES;
```

> **Note:** Replace `'your_secure_password'` with a strong password.

### 4. Create PowerSync Cloud Instance

1. Go to [dashboard.powersync.com](https://dashboard.powersync.com).
2. Create a new project and instance.
3. **Connect to your Supabase:**
   - Get the connection string from Supabase: Settings → Database → Connection string.
   - Use the `powersync_role` user and password you created above.
   - Test the connection.

### 5. Configure Sync Rules

In the PowerSync Dashboard, go to **Sync Rules** and use the following configuration. This purely uses a global bucket for simplicity (all devices get all data).

```yaml
bucket_definitions:
  global:
    data:
      - SELECT * FROM settings
      - SELECT * FROM employees
      - SELECT * FROM categories
      - SELECT * FROM products
      - SELECT * FROM services
      - SELECT * FROM service_ingredients
      - SELECT * FROM service_variants
      - SELECT * FROM service_variant_ingredients
      - SELECT * FROM customers
      - SELECT * FROM customer_vehicles
      - SELECT * FROM tickets
      - SELECT * FROM ticket_items
      - SELECT * FROM ticket_assignments
```

*Note: In a multi-tenant app, you would use `user_id` parameters to filter data. For this POS, all devices share the store data.*

### 6. Enable Supabase Auth in PowerSync

1. In the PowerSync Dashboard, go to **Client Auth**.
2. Enable "**Use Supabase Auth**".
3. Retrieve your **Project URL** and **Anon Key** from Supabase.
4. If asked for a "JWT Secret", you can find it in Supabase: Settings → API → JWT Settings.

### 7. Configure Environment Variables

Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_POWERSYNC_URL=https://your-instance.powersync.journeyapps.com
```

### 8. Run the Application

```bash
npm install
npm run dev
```

The app should now load, sync data from Supabase (via PowerSync), and work offline!

## Migration from Old System

If you have data in the old D1/Dexie system:
1. The new system expects data in Supabase.
2. You will need to manually migrate or re-enter data into the Supabase database.
3. The app is now fully "Cloud First" regarding the source of truth, but "Local First" regarding performance and availability.

## Troubleshooting

### "PowerSync not initialized"
Make sure your component is wrapped in `<PowerSyncProvider>` and that you're in a client component (`'use client'`).

### Connection fails
1. Check your environment variables are set correctly in `.env.local`.
2. Ensure the PowerSync instance status is "Running" in the dashboard.
3. Verify the `powersync_role` password matches what you entered in the PowerSync dashboard.

### Data not syncing
1. Check the PowerSync Dashboard for sync errors.
2. Look at the browser console for specific errors.
3. Verify your **Sync Rules** include all the tables you expect.
