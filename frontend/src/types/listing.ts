export interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  description: string;
  shortDesc: string;
  amenities: string[];
  distanceMiles: number;
  commuteMinutes: number;
  rating: number;
  imageGradient: string;
  landlord: string;
  yearBuilt: number;
  parkingIncluded: boolean;
  utilitiesIncluded: boolean;
  petFriendly: boolean;
  leaseTermMonths: number;
  securityDeposit: number;
  moveInDate: string;
  zillowEstimate: number;
  crimeScore: number; // 1-10, 10 = safest
  walkScore: number;
  nearbyGrocery: string;
  nearbyGym: string;
  hiddenCosts: { name: string; amount: number }[];
  imageUrl?: string;
}
