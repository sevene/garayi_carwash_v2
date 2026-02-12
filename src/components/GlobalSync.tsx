'use client';

import React from 'react';
import { useStatus } from '@powersync/react';
import { connectPowerSync } from '@/lib/powersync/db';

export default function GlobalSync() {
    const status = useStatus();
    const isConnected = status.connected;
    // Network status is moved to MainNav
    return null;
}
