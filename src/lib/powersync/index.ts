// PowerSync Schema exports
export { AppSchema } from './AppSchema';
export type {
    Database,
    SettingsRecord,
    EmployeeRecord,
    CategoryRecord,
    ProductRecord,
    ServiceRecord,
    ServiceVariantRecord,
    CustomerRecord,
    CustomerVehicleRecord,
    TicketRecord,
    TicketItemRecord,
    TicketAssignmentRecord
} from './AppSchema';

// Connector and DB exports
export { SupabaseConnector } from './SupabaseConnector';
export {
    getPowerSync,
    getConnector,
    connectPowerSync,
    disconnectPowerSync,
    watchSyncStatus
} from './db';

// Re-export @powersync/react hooks for use in components
export { usePowerSync, useQuery, useStatus } from '@powersync/react';
