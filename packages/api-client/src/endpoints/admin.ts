import { VoztriApiClient } from '../client.js';

/** Envelope de paginação padrão do Laravel (`->paginate()`). */
export interface Paginated<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AdminStats {
  passengers_count: number;
  drivers_count: number;
  online_drivers_count: number;
  active_rides_count: number;
  completed_rides_count: number;
  cancelled_rides_count: number;
  gross_revenue_cents: number;
  platform_revenue_cents: number;
  average_rating: number;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
}

export interface AdminVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  category: string;
}

export type AdminDriverStatus = 'pending_approval' | 'approved' | 'rejected' | 'blocked';

export interface AdminDriver {
  id: string;
  user_id: string;
  cnh_number: string;
  cnh_category: string;
  cnh_has_ear: boolean;
  status: AdminDriverStatus;
  is_online: boolean;
  user: AdminUserSummary | null;
  active_vehicle: AdminVehicle | null;
}

export interface LiveMapDriver {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  vehicle: string;
  plate: string;
  category: string;
}

export interface AdminRide {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  category: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_price_cents: number;
  final_price_cents: number | null;
  payment_method: string;
  created_at: string;
  passenger: { id: string; user: AdminUserSummary | null } | null;
  driver: { id: string; user: AdminUserSummary | null } | null;
}

export interface LiveMapResponse {
  drivers: LiveMapDriver[];
  activeRides: AdminRide[];
}

export interface AdminAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  target_entity: string;
  target_id: string | null;
  ip_address: string | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user: AdminUserSummary | null;
}

export class AdminApi {
  constructor(private client: VoztriApiClient) {}

  async getStats(): Promise<AdminStats> {
    return (await this.client.get<AdminStats>('/admin/stats')).data;
  }

  async getLiveMap(): Promise<LiveMapResponse> {
    return (await this.client.get<LiveMapResponse>('/admin/live-map')).data;
  }

  async listDrivers(page = 1): Promise<Paginated<AdminDriver>> {
    return (await this.client.get<Paginated<AdminDriver>>('/admin/drivers', { params: { page } })).data;
  }

  async approveDriver(id: string): Promise<void> {
    await this.client.post(`/admin/drivers/${id}/approve`);
  }

  async blockDriver(id: string): Promise<void> {
    await this.client.post(`/admin/drivers/${id}/block`);
  }

  async listRides(page = 1): Promise<Paginated<AdminRide>> {
    return (await this.client.get<Paginated<AdminRide>>('/admin/rides', { params: { page } })).data;
  }

  async getAuditLogs(page = 1): Promise<Paginated<AdminAuditLog>> {
    return (await this.client.get<Paginated<AdminAuditLog>>('/admin/audit-logs', { params: { page } })).data;
  }
}
