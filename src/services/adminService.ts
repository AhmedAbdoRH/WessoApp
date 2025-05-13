// src/services/adminService.ts
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import type { CarTypeOptionAdmin, CarModelOptionAdmin, AppConfig } from '@/types/admin';

// Firestore collection names
const CAR_TYPES_COLLECTION = 'carTypes';
const CAR_MODELS_COLLECTION = 'carModels';
const APP_CONFIG_COLLECTION = 'appConfig';
const APP_CONFIG_DOC_ID = 'main';


// --- Car Types ---
export async function getCarTypesForBooking(): Promise<Omit<CarTypeOptionAdmin, 'order' | 'dataAiHint'>[]> {
  const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id, // Firestore document ID is the 'value'
      value: docSnap.id,
      label: data.label,
      imageUrl: data.imageUrl,
    } as Omit<CarTypeOptionAdmin, 'order' | 'dataAiHint'>;
  });
}

export async function getCarTypesAdmin(): Promise<CarTypeOptionAdmin[]> {
  const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CarTypeOptionAdmin));
}

export async function addCarTypeAdmin(carType: Omit<CarTypeOptionAdmin, 'id'>): Promise<string> {
  if (!carType.value || carType.value.trim() === '') {
    throw new Error('Car type value (ID) cannot be empty.');
  }
  const docRef = doc(db, CAR_TYPES_COLLECTION, carType.value);
  await setDoc(docRef, carType);
  return carType.value;
}

export async function updateCarTypeAdmin(id: string, carTypeUpdate: Partial<Omit<CarTypeOptionAdmin, 'id' | 'value'>>): Promise<void> {
  const docRef = doc(db, CAR_TYPES_COLLECTION, id);
  await updateDoc(docRef, carTypeUpdate);
}

export async function deleteCarTypeAdmin(id: string): Promise<void> {
  // Also delete associated car models
  await runTransaction(db, async (transaction) => {
    const carTypeDocRef = doc(db, CAR_TYPES_COLLECTION, id);
    transaction.delete(carTypeDocRef);

    const modelsQuery = query(collection(db, CAR_MODELS_COLLECTION), where('type', '==', id));
    const modelsSnapshot = await getDocs(modelsQuery); // Execute query outside transaction read if possible, or ensure it's within
    modelsSnapshot.forEach(modelDoc => {
      transaction.delete(doc(db, CAR_MODELS_COLLECTION, modelDoc.id));
    });
  });
}


// --- Car Models ---
export async function getCarModelsForBooking(carTypeValue: string): Promise<Omit<CarModelOptionAdmin, 'order' | 'dataAiHint' | 'type'>[]> {
  if (!carTypeValue) return [];
  const q = query(collection(db, CAR_MODELS_COLLECTION), where('type', '==', carTypeValue), orderBy('order'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id, // Firestore document ID is the 'value'
      value: docSnap.id,
      label: data.label,
      imageUrl: data.imageUrl,
    } as Omit<CarModelOptionAdmin, 'order' | 'dataAiHint' | 'type'>;
  });
}

export async function getCarModelsAdmin(): Promise<CarModelOptionAdmin[]> {
  const q = query(collection(db, CAR_MODELS_COLLECTION), orderBy('type'), orderBy('order'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CarModelOptionAdmin));
}

export async function addCarModelAdmin(carModel: Omit<CarModelOptionAdmin, 'id'>): Promise<string> {
  if (!carModel.value || carModel.value.trim() === '') {
    throw new Error('Car model value (ID) cannot be empty.');
  }
  const docRef = doc(db, CAR_MODELS_COLLECTION, carModel.value);
  await setDoc(docRef, carModel);
  return carModel.value;
}

export async function updateCarModelAdmin(id: string, carModelUpdate: Partial<Omit<CarModelOptionAdmin, 'id' | 'value'>>): Promise<void> {
  const docRef = doc(db, CAR_MODELS_COLLECTION, id);
  await updateDoc(docRef, carModelUpdate);
}

export async function deleteCarModelAdmin(id: string): Promise<void> {
  const docRef = doc(db, CAR_MODELS_COLLECTION, id);
  await deleteDoc(docRef);
}

// --- App Config ---
export async function getAppConfig(): Promise<AppConfig | null> {
    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as AppConfig;
    }
    // Create default if it doesn't exist
    const defaultConfig: AppConfig = { appName: 'ClearRide', logoUrl: '' };
    await setDoc(docRef, defaultConfig);
    return defaultConfig;
}

export async function updateAppConfigAdmin(config: AppConfig): Promise<void> {
    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    await setDoc(docRef, config, { merge: true });
}
