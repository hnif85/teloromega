// Shared types for Toko module
export interface InboxMessage {
  id: string;
  brandId: string;
  channel: string;
  fromNumber: string;
  fromName: string | null;
  messageText: string;
  direction: "inbound" | "outbound";
  repliedBy: string | null;
  leadId: string | null;
  createdAt: string;
}

export interface InboxThread {
  key: string;
  fromNumber: string;
  fromName: string | null;
  channel: string;
  lastAt: string;
  unread: number;
  messages: InboxMessage[];
}

export interface InboxTemplate {
  id: string;
  label: string;
  icon: string;
  body: string;
}

export interface Customer {
  id: string;
  brandId: string;
  name: string;
  phone: string;
  email: string | null;
  firstOrderAt: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface Lead {
  id: string;
  brandId: string;
  customerId: string | null;
  name: string;
  phone: string;
  sourceChannel: string;
  stage: "Baru" | "Negosiasi" | "Deal" | "Closed";
  notes: string | null;
  assignedTo: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer | null;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  type?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: "Menunggu" | "Diterima" | "Ditolak";
  proofImageUrl: string | null;
  verifiedAt: string | null;
  createdAt: string;
  order?: Order;
}

export interface Order {
  id: string;
  brandId: string;
  customerId: string | null;
  leadId: string | null;
  items: string; // JSON string
  totalAmount: number;
  status: "Baru" | "Diproses" | "Dikirim" | "Selesai" | "Dibatalkan";
  resiNumber: string | null;
  shippingCourier: string | null;
  shippingCost: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer | null;
  lead?: Lead | null;
  payments?: Payment[];
}

export interface Product {
  id: string;
  brandId: string;
  type: "barang" | "jasa";
  name: string;
  price: number;
  costPrice: number | null;
  stock: number | null;
  minStock: number | null;
  sku: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  productId: string;
  orderId: string;
  customerName: string | null;
  qty: number;
  status: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  brandId: string;
  channel: "wa" | "email";
  name: string;
  subject: string | null;
  body: string;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  createdAt: string;
  recipientCount?: number;
  sentCount?: number;
  openedCount?: number;
  clickedCount?: number;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  customerId: string | null;
  leadId: string | null;
  contact: string;
  sent: boolean;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  customer?: { name: string; phone: string } | null;
}
