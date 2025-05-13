// src/services/adminService.ts
'use server';

import { db, app } from '@/lib/firebase'; // app is needed for storage
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
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { CarTypeOptionAdmin, CarModelOptionAdmin, AppConfig } from '@/types/admin';

const storage = getStorage(app); // Initialize Firebase Storage

// Firestore collection names
const CAR_TYPES_COLLECTION = 'carTypes';
const CAR_MODELS_COLLECTION = 'carModels';
const APP_CONFIG_COLLECTION = 'appConfig';
const APP_CONFIG_DOC_ID = 'main';


// Helper function to upload image and get URL
async function uploadImage(file: File, pathPrefix: string, entityId: string): Promise<string> {
  if (!file || !file.name || !(file instanceof File)) {
    throw new Error('Invalid file provided for upload.');
  }
  const fileName = `${entityId}-${Date.now()}-${file.name}`;
  const imagePath = `${pathPrefix}/${fileName}`;
  const imageReference = storageRef(storage, imagePath);
  
  const snapshot = await uploadBytes(imageReference, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

// Helper function to delete an image from Firebase Storage
// This version attempts to delete based on URL, which can be fragile.
// A more robust solution would involve storing the storage path in Firestore.
async function deleteOldImageWithCaution(imageUrl: string | undefined) {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) return;
    try {
        const imageHttpRef = storageRef(storage, imageUrl); // Create a reference from the HTTP URL
        await deleteObject(imageHttpRef);
        console.log("Successfully deleted old image:", imageUrl);
    } catch (error: any) {
        // Common errors: object-not-found (if already deleted or path mismatch), or permission issues.
        // We'll log these but not let them block the overall operation.
        if (error.code === 'storage/object-not-found') {
            console.log("Old image not found in storage (may have been already deleted or path mismatch):", imageUrl);
        } else {
            console.error("Failed to delete old image:", imageUrl, error);
        }
    }
}


// --- Car Types ---
export async function getCarTypesForBooking(): Promise<Omit<CarTypeOptionAdmin, 'order' | 'dataAiHint'>[]> {
  const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
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

export async function addCarTypeAdmin(carTypeData: Omit<CarTypeOptionAdmin, 'id' | 'imageUrl'> & { imageUrlInput: File | null }): Promise<string> {
  if (!carTypeData.value || carTypeData.value.trim() === '') {
    throw new Error('Car type value (ID) cannot be empty.');
  }
  if (!(carTypeData.imageUrlInput instanceof File)) {
    throw new Error('Image file is required for adding a new car type.');
  }
  
  const finalImageUrl = await uploadImage(carTypeData.imageUrlInput, CAR_TYPES_COLLECTION, carTypeData.value);

  const dataToSave: Omit<CarTypeOptionAdmin, 'id'> = {
    value: carTypeData.value,
    label: carTypeData.label,
    imageUrl: finalImageUrl,
    dataAiHint: carTypeData.dataAiHint,
    order: carTypeData.order,
  };

  const docRef = doc(db, CAR_TYPES_COLLECTION, carTypeData.value);
  await setDoc(docRef, dataToSave);
  return carTypeData.value;
}

export async function updateCarTypeAdmin(id: string, carTypeUpdate: Partial<Omit<CarTypeOptionAdmin, 'id' | 'value' | 'imageUrl'>> & { imageUrlInput?: File | null, currentImageUrl?: string }): Promise<void> {
  const docRef = doc(db, CAR_TYPES_COLLECTION, id);
  
  // Create a mutable copy for the update payload
  const updatePayload: { [key: string]: any } = { ...carTypeUpdate };
  delete updatePayload.imageUrlInput; // Remove helper fields from payload
  delete updatePayload.currentImageUrl;


  if (carTypeUpdate.imageUrlInput instanceof File) {
    // If there's an existing image URL and it's different from a new one being uploaded, delete the old one.
    if (carTypeUpdate.currentImageUrl) {
        // await deleteOldImageWithCaution(carTypeUpdate.currentImageUrl); // Decided to skip deletion for now to avoid complexity
    }
    updatePayload.imageUrl = await uploadImage(carTypeUpdate.imageUrlInput, CAR_TYPES_COLLECTION, id);
  }
  // If imageUrlInput is null, it means user might want to clear image (if currentImageUrl exists).
  // This case is not explicitly handled to clear (set to '') imageUrl in Firestore yet.
  // If imageUrlInput is undefined, no new file was chosen, so imageUrl field in Firestore is not touched.

  if (Object.keys(updatePayload).length > 0) {
    await updateDoc(docRef, updatePayload);
  }
}

export async function deleteCarTypeAdmin(id: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const carTypeDocRef = doc(db, CAR_TYPES_COLLECTION, id);
    const carTypeSnap = await transaction.get(carTypeDocRef);
    if (!carTypeSnap.exists()) {
        throw new Error("Car type not found for deletion.");
    }
    const carTypeData = carTypeSnap.data() as CarTypeOptionAdmin;
    // await deleteOldImageWithCaution(carTypeData.imageUrl); // Skip deletion for now

    transaction.delete(carTypeDocRef);

    const modelsQuery = query(collection(db, CAR_MODELS_COLLECTION), where('type', '==', id));
    // Execute query outside transaction for reads if possible, or ensure it's brief.
    // For transaction safety, it's better to fetch models IDs before transaction or accept this read.
    const modelsSnapshot = await getDocs(modelsQuery); 
    modelsSnapshot.forEach(async modelDoc => {
      const modelData = modelDoc.data() as CarModelOptionAdmin;
      // await deleteOldImageWithCaution(modelData.imageUrl); // Skip deletion for now
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
      id: docSnap.id,
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

export async function addCarModelAdmin(carModelData: Omit<CarModelOptionAdmin, 'id' | 'imageUrl'> & { imageUrlInput: File | null }): Promise<string> {
  if (!carModelData.value || carModelData.value.trim() === '') {
    throw new Error('Car model value (ID) cannot be empty.');
  }
  if (!(carModelData.imageUrlInput instanceof File)) {
    throw new Error('Image file is required for adding a new car model.');
  }

  const finalImageUrl = await uploadImage(carModelData.imageUrlInput, CAR_MODELS_COLLECTION, carModelData.value);
  
  const dataToSave: Omit<CarModelOptionAdmin, 'id'> = {
    value: carModelData.value,
    label: carModelData.label,
    imageUrl: finalImageUrl,
    type: carModelData.type,
    dataAiHint: carModelData.dataAiHint,
    order: carModelData.order,
  };
  
  const docRef = doc(db, CAR_MODELS_COLLECTION, carModelData.value);
  await setDoc(docRef, dataToSave);
  return carModelData.value;
}

export async function updateCarModelAdmin(id: string, carModelUpdate: Partial<Omit<CarModelOptionAdmin, 'id' | 'value' | 'imageUrl'>> & { imageUrlInput?: File | null, currentImageUrl?: string }): Promise<void> {
  const docRef = doc(db, CAR_MODELS_COLLECTION, id);
  const updatePayload: { [key: string]: any } = { ...carModelUpdate };
  delete updatePayload.imageUrlInput;
  delete updatePayload.currentImageUrl;

  if (carModelUpdate.imageUrlInput instanceof File) {
     if (carModelUpdate.currentImageUrl) {
        // await deleteOldImageWithCaution(carModelUpdate.currentImageUrl); // Skip deletion
    }
    updatePayload.imageUrl = await uploadImage(carModelUpdate.imageUrlInput, CAR_MODELS_COLLECTION, id);
  }

  if (Object.keys(updatePayload).length > 0) {
    await updateDoc(docRef, updatePayload);
  }
}

export async function deleteCarModelAdmin(id: string): Promise<void> {
  const modelDocRef = doc(db, CAR_MODELS_COLLECTION, id);
  const modelSnap = await getDoc(modelDocRef);
  if (modelSnap.exists()) {
      const modelData = modelSnap.data() as CarModelOptionAdmin;
      // await deleteOldImageWithCaution(modelData.imageUrl); // Skip deletion
  }
  await deleteDoc(modelDocRef);
}

// --- App Config ---
// AppConfig still uses URL for logo for now. Can be updated similarly if needed.
export async function getAppConfig(): Promise<AppConfig | null> {
    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as AppConfig;
    }
    const defaultConfig: AppConfig = { appName: 'ClearRide', logoUrl: '' };
    await setDoc(docRef, defaultConfig);
    return defaultConfig;
}

export async function updateAppConfigAdmin(config: AppConfig): Promise<void> {
    // If logoUrl is a File object, upload it. This part is not implemented yet for AppConfig.
    // For now, assumes logoUrl is always a string.
    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    await setDoc(docRef, config, { merge: true });
}
