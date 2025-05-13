export interface CarTypeOptionAdmin {
  id?: string; // Firestore document ID
  value: string; // Will store the Firestore document ID, used for consistency (e.g. Select components)
  label: string; // Arabic label
  imageUrl: string;
  publicId?: string; // Cloudinary public_id for image management
  dataAiHint?: string; // Optional, no longer collected from admin forms
  order: number; // For display order
}

export interface CarModelOptionAdmin {
  id?: string; // Firestore document ID
  value: string; // Will store the Firestore document ID
  label: string; // Arabic label
  imageUrl: string;
  publicId?: string; // Cloudinary public_id for image management
  type: string; // Corresponds to CarTypeOptionAdmin.value (which is the ID of the car type)
  dataAiHint?: string; // Optional, no longer collected from admin forms
  order: number; // For display order
}

export interface AppConfig {
  appName?: string;
  logoUrl?: string;
  // If logo is also uploaded to Cloudinary and managed via admin panel:
  // logoPublicId?: string; 
}
