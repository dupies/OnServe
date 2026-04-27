export type PricingModel = 'fixed' | 'hourly' | 'quote_based';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ServiceType {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  pricingModel: PricingModel;
  basePrice: number | null;
  hourlyRate: number | null;
  estimatedDurationMins: number | null;
  requiredSkills: string[];
  requiredCertifications: string[];
  isActive: boolean;
}

export interface ProviderService {
  id: string;
  providerId: string;
  serviceTypeId: string;
  customPrice: number | null;
  serviceRadiusKm: number;
  isAvailable: boolean;
  createdAt: string;
}
