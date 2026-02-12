import { column, Schema, Table, TableV2 } from '@powersync/web';

// =============================================
// SETTINGS TABLE
// =============================================
const settings = new Table({
    name: column.text,
    address_street: column.text,
    currency: column.text,
    tax_rate: column.real,
    enable_notifications: column.integer, // 0 or 1 for boolean
    theme: column.text,
    receipt_header: column.text,
    receipt_footer: column.text,
    printer_name: column.text,
    updated_at: column.text
});

// =============================================
// EMPLOYEES TABLE
// =============================================
const employees = new Table({
    username: column.text,
    email: column.text,
    phone: column.text,
    name: column.text,

    role: column.text,
    pin: column.text,
    contact_info: column.text, // JSON string
    address: column.text,
    status: column.text,
    compensation: column.text, // JSON string
    created_at: column.text
}, { indexes: { username: ['username'] } });

// =============================================
// CATEGORIES TABLE
// =============================================
const categories = new Table({
    name: column.text,
    description: column.text,
    parent_id: column.text,
    active: column.integer, // 0 or 1
    created_at: column.text
});

// =============================================
// PRODUCTS TABLE
// =============================================
const products = new Table({
    name: column.text,
    sku: column.text,
    description: column.text,
    price: column.real,
    category_id: column.text,
    volume: column.text,
    unit_type: column.text,
    sold_by: column.text,
    cost: column.text,
    show_in_pos: column.integer, // 0 or 1
    active: column.integer, // 0 or 1
    image_url: column.text,
    created_at: column.text,
    updated_at: column.text
}, { indexes: { category: ['category_id'] } });

// =============================================
// INVENTORY TABLE
// =============================================
const inventory = new Table({
    product_id: column.text,
    stock_quantity: column.integer,
    low_stock_threshold: column.integer,
    last_updated: column.text
}, { indexes: { product: ['product_id'] } });

// =============================================
// INVENTORY LOGS TABLE
// =============================================
const inventory_logs = new Table({
    product_id: column.text,
    product_name: column.text,           // Snapshot of product name at time of change
    change_type: column.text,            // 'stock_adjustment', 'threshold_change', 'initial_stock'
    quantity_before: column.integer,     // Stock before change
    quantity_after: column.integer,      // Stock after change
    threshold_before: column.integer,    // Threshold before change (if changed)
    threshold_after: column.integer,     // Threshold after change (if changed)
    reason: column.text,                 // Adjustment reason
    notes: column.text,                  // Optional additional notes
    employee_id: column.text,            // Who made the change
    employee_name: column.text,          // Snapshot of employee name
    created_at: column.text              // When the change was made
}, { indexes: { product: ['product_id'], created_at: ['created_at'] } });

// =============================================
// SERVICES TABLE
// =============================================
const services = new Table({
    name: column.text,
    description: column.text,
    category_id: column.text,
    price: column.real,
    labor_cost: column.real,
    labor_cost_type: column.text,
    duration_minutes: column.integer,
    active: column.integer, // 0 or 1
    show_in_pos: column.integer, // 0 or 1
    image_url: column.text,
    created_at: column.text,
    updated_at: column.text,
}, { indexes: { category: ['category_id'] } });



// =============================================
// SERVICE VARIANTS TABLE
// =============================================
const service_variants = new Table({
    service_id: column.text,
    name: column.text,
    sku: column.text,
    price: column.real,
    labor_cost: column.real,
    duration_minutes: column.integer,
    active: column.integer // 0 or 1
}, { indexes: { service: ['service_id'] } });



// =============================================
// SERVICE RECIPES TABLE (Unified)
// =============================================
const service_recipes = new Table({
    variant_id: column.text,
    product_id: column.text,
    quantity: column.real,
    created_at: column.text,
    updated_at: column.text
}, { indexes: { variant: ['variant_id'] } });

// =============================================
// CUSTOMERS TABLE
// =============================================
const customers = new Table({
    name: column.text,
    email: column.text,
    phone: column.text,
    address_street: column.text,
    address_city: column.text,
    address_zip: column.text,
    notes: column.text,
    loyalty_points: column.integer,
    visits_count: column.integer,
    last_visit: column.text,
    created_at: column.text,
    updated_at: column.text
}, { indexes: { name: ['name'], phone: ['phone'] } });

// =============================================
// CUSTOMER VEHICLES TABLE
// =============================================
const customer_vehicles = new Table({
    customer_id: column.text,
    plate_number: column.text,
    make_model: column.text,
    vehicle_type: column.text,
    vehicle_color: column.text,
    vehicle_size: column.text,
    created_at: column.text
}, { indexes: { customer: ['customer_id'] } });

// =============================================
// EXPENSES TABLE
// =============================================
const expenses = new Table({
    description: column.text,
    amount: column.real,
    category: column.text,
    date: column.text,
    notes: column.text,
    type: column.text,
    created_at: column.text,
    updated_at: column.text
});

// =============================================
// TICKETS TABLE
// =============================================
const tickets = new Table({
    ticket_number: column.text,
    created_at: column.text,
    completed_at: column.text,
    subtotal: column.real,
    tax_rate: column.real,
    tax_amount: column.real,
    total: column.real,
    status: column.text,
    payment_method: column.text,
    customer_id: column.text,
    plate_number: column.text,
    name: column.text
}, { indexes: { status: ['status'], created_at: ['created_at'] } });

// =============================================
// TICKET ITEMS TABLE
// =============================================
const ticket_items = new Table({
    ticket_id: column.text,
    product_id: column.text,
    item_type: column.text,
    item_id: column.text,
    product_name: column.text,
    quantity: column.integer,
    unit_price: column.real,
    crew_snapshot: column.text // JSON string
}, { indexes: { ticket: ['ticket_id'] } });

// =============================================
// TICKET ASSIGNMENTS TABLE
// =============================================
const ticket_assignments = new Table({
    ticket_id: column.text,
    employee_id: column.text,
    role: column.text,
    assigned_at: column.text
}, { indexes: { ticket: ['ticket_id'] } });

// =============================================
// EXPORT SCHEMA
// =============================================
export const AppSchema = new Schema({
    settings,
    employees,
    categories,
    products,
    inventory,
    inventory_logs,
    services,
    service_variants,
    service_recipes, // Unified table
    customers,
    customer_vehicles,
    expenses,
    tickets,
    ticket_items,
    ticket_assignments
});

// Type exports for TypeScript
export type Database = (typeof AppSchema)['types'];
export type SettingsRecord = Database['settings'];
export type EmployeeRecord = Database['employees'];
export type CategoryRecord = Database['categories'];
export type ProductRecord = Database['products'];
export type InventoryRecord = Database['inventory'];
export type InventoryLogRecord = Database['inventory_logs'];
export type ServiceRecord = Database['services'];
export type ServiceVariantRecord = Database['service_variants'];
export type ServiceRecipeRecord = Database['service_recipes'];
export type CustomerRecord = Database['customers'];
export type CustomerVehicleRecord = Database['customer_vehicles'];
export type ExpenseRecord = Database['expenses'];
export type TicketRecord = Database['tickets'];
export type TicketItemRecord = Database['ticket_items'];
export type TicketAssignmentRecord = Database['ticket_assignments'];
