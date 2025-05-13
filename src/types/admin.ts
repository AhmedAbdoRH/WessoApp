export interface CarTypeOptionAdmin {
  id?: string; // Firestore document ID, typically same as value
  value: string; // Unique identifier for the car type (e.g., 'sedan'), used as Firestore doc ID
  label: string; // Arabic label
  imageUrl: string;
  dataAiHint?: string;
  order: number; // For display order
}

export interface CarModelOptionAdmin {
  id?: string; // Firestore document ID, typically same as value
  value: string; // Unique identifier for the model (e.g., 'toyota-camry'), used as Firestore doc ID
  label: string; // Arabic label
  imageUrl: string;
  type: string; // Corresponds to CarTypeOptionAdmin.value
  dataAiHint?: string;
  order: number; // For display order
}

export interface AppConfig {
  appName?: string;
  logoUrl?: string;
}
