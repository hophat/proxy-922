// User types
export interface User {
  id: string;
  email: string;
  quotaTotal: number;
  quotaUsed: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Proxy types
export enum ProxyStatus {
  ACTIVE = 'active',
  DEAD = 'dead',
  DISABLED = 'disabled',
}

export interface Proxy {
  id: string;
  host: string;
  port: number;
  username?: string;
  status: ProxyStatus;
  lastCheck?: string;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt?: string;
}

// Gateway types
export enum GatewayStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  DISABLED = 'disabled',
}

export interface Gateway {
  id: string;
  ip: string;
  portRangeStart: number;
  portRangeEnd: number;
  status: GatewayStatus;
  availablePortCount?: number;
  createdAt: string;
  updatedAt?: string;
}

// Upstream types
export enum UpstreamStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  MAINTENANCE = 'maintenance',
  IN_USE = 'in_use',
}

export interface Upstream {
  id: string;
  host: string;
  port: number;
  username?: string;
  ping?: number;
  country?: string;
  state?: string;
  city?: string;
  zip?: string;
  isp?: string;
  status: UpstreamStatus;
  lastCheck?: string;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt?: string;
}

// Purchase types
export enum PurchaseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PurchaseDuration {
  HOURS_24 = '24h',
  DAYS_7 = '7d',
  DAYS_30 = '30d',
}

export interface Purchase {
  id: string;
  userId: string;
  userEmail?: string;
  gatewayId: string;
  gatewayIp?: string;
  portId: string;
  port?: number;
  mappingId: string;
  purchasedAt: string;
  expiresAt: string;
  duration: PurchaseDuration;
  price: number;
  status: PurchaseStatus;
  gatewayUsername: string;
  createdAt: string;
  updatedAt?: string;
}

// Payment types
export enum PaymentOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PurchaseType {
  UPSTREAM = 'upstream',
  PORT = 'port',
}

export interface PaymentOrder {
  id: string;
  orderCode: string;
  userId: string;
  userEmail?: string;
  amount: number;
  status: PaymentOrderStatus;
  purchaseType: PurchaseType;
  purchaseData: Record<string, any>;
  vaNumber?: string;
  qrCodeUrl?: string;
  expiredAt: string;
  paidAt?: string;
  sepayTransactionId?: string;
  createdAt: string;
  updatedAt?: string;
}

// Port Mapping types
export enum PortMappingStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RELEASED = 'released',
}

export interface PortMapping {
  id: string;
  userId: string;
  userEmail?: string;
  gatewayId: string;
  gatewayIp?: string;
  portId: string;
  port: number;
  upstreamId: string;
  upstreamHost?: string;
  upstreamPort?: number;
  assignedAt: string;
  expiresAt: string;
  status: PortMappingStatus;
  createdAt: string;
  updatedAt?: string;
}

// App Version types
export interface AppVersion {
  id: string;
  version: string;
  platform: string; // 'win32' | 'darwin' | 'linux'
  downloadUrl: string;
  releaseNotes?: string;
  isMandatory: boolean;
  fileSize?: number;
  checksum?: string;
  createdAt: string;
  updatedAt?: string;
}

// Stats types
export interface Stats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalQuota: number;
  totalUsed: number;
  totalRemaining: number;
  totalProxies: number;
  activeProxies: number;
  deadProxies: number;
  disabledProxies: number;
}
