import { Product } from '../../lib/products';

export interface CartItem {
    product: Product;
    quantity: number;
    price: number;
    itemTotal: number;
    name: string;
    sku: string;
    itemType?: 'service' | 'product';
    _id: string;
}

export interface OpenTicket {
    _id: string;
    name: string;
    total: number;
    cashierId: string;
    timestamp: string;
    items: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        sku?: string;
        itemType?: string;
        _id?: string;
        crew?: { id: string; name: string }[];
    }[];
    createdAt: string;
    updatedAt: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'QUEUED' | 'IN_PROGRESS' | 'PAID';
    customer?: any;
    crew?: any[];
    ticketNumber?: string | number;
}

export type CartViewMode = 'TICKETS' | 'CART';

export interface CartContextType {
    cartItems: CartItem[];
    viewMode: CartViewMode;
    openTickets: OpenTicket[];
    currentTicketId: string | null;
    currentTicketName: string;
    isProcessing: boolean;
    isTicketsLoading: boolean;
    checkoutError: string | null;
    subtotal: number;
    tax: number;
    total: number;
    taxRate: number;
    currency: string;
    formatCurrency: (amount: number) => string;
    addItemToCart: (product: Product) => void;
    updateItemQuantity: (productId: string, quantity: number) => void;
    removeItem: (productId: string) => void;
    clearCart: () => void;
    setCurrentTicketName: (name: string) => void;
    switchToCartView: () => void;
    switchToTicketsView: () => void;
    fetchOpenTickets: () => Promise<void>;
    loadTicket: (ticket: OpenTicket) => void;
    checkout: (paymentMethod: string) => Promise<void>;
    saveTicket: (name: string) => Promise<void>;
    deleteTicket: (ticketId: string) => Promise<void>;
    customers: any[];
    setCustomer: (customer: any) => void;
    currentCustomer: any;
    employees: any[];
    itemCrew: Record<string, string[]>;
    toggleItemCrew: (itemId: string, employeeId: string) => void;
    getItemCrew: (itemId: string) => string[];
    getAllAssignedCrew: () => string[];
    clearItemCrew: (itemId: string) => void;
    sidebarView: 'NONE' | 'CREW' | 'CUSTOMER';
    openCrewSidebar: (itemId?: string) => void;
    openCustomerSidebar: () => void;
    closeSidebar: () => void;
    activeCrewItemId: string | null;
    isCartOpen: boolean;
    toggleCart: () => void;
    openCart: () => void;
    closeCart: () => void;
}
