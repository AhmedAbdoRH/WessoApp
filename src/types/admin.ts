export interface CarTypeOptionAdmin {
  id?: string; // Firestore document ID
  value: string; // Will store the Firestore document ID, used for consistency (e.g. Select components)
  label: string; // Arabic label
  imageUrl: string;
  publicId?: string; // Cloudinary public_id for image management
  order: number; // For display order
}

export interface CarModelOptionAdmin {
  id?: string; // Firestore document ID
  value: string; // Will store the Firestore document ID
  label: string; // Arabic label
  imageUrl: string;
  publicId?: string; // Cloudinary public_id for image management
  type: string; // Corresponds to CarTypeOptionAdmin.value (which is the ID of the car type)
  order: number; // For display order
}

export interface AppConfig {
  appName?: string;
  logoUrl?: string;
  logoPublicId?: string; 
}

export interface CustomerContactAdmin {
  id: string; // Firestore document ID
  firstName: string;
  phoneNumber: string;
  createdAt: string; // ISO string date
}
