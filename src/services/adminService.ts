
// src/services/adminService.ts
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { AppConfig, CarTypeOptionAdmin, CarModelOptionAdmin } from '@/types/admin';
import { slugify } from '@/lib/slugify';
import crypto from 'crypto';

const APP_CONFIG_COLLECTION = 'appConfig';
const APP_CONFIG_DOC_ID = 'main';
const CAR_TYPES_COLLECTION = 'carTypes';
const CAR_MODELS_COLLECTION = 'carModels';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// --- App Configuration ---
export async function getAppConfig(): Promise<AppConfig | null> {
  try {
    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AppConfig;
    }
    return null;
  } catch (error) {
    console.error('Error fetching app config:', error);
    return null;
  }
}

export async function updateAppConfigAdmin(config: AppConfig): Promise<void> {
  const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
  await setDoc(docRef, config, { merge: true });
}

// --- Cloudinary Image Upload/Delete Helpers ---

function generateSha1(data: string): string {
  const hash = crypto.createHash('sha1');
  hash.update(data);
  return hash.digest('hex');
}

function generateSignature(paramsToSign: Record<string, string | number>, apiSecret: string): string {
  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map(key => `${key}=${paramsToSign[key]}`)
    .join('&');
  return generateSha1(`${sortedParams}${apiSecret}`);
}

async function uploadImageToCloudinary(file: File, folder: string): Promise<{ secure_url: string; public_id: string }> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('Cloudinary credentials are not configured in .env file or service.');
    throw new Error('فشل تحميل الصورة: لم يتم تكوين خدمة تحميل الصور بشكل صحيح (بيانات اعتماد Cloudinary مفقودة).');
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign: Record<string, string | number> = { // Explicitly define type
    folder: folder,
    timestamp: timestamp,
    // Add eager transformations or other parameters if needed, they must be part of the signature
  };
  const signature = generateSignature(paramsToSign, CLOUDINARY_API_SECRET);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);
  // Add any additional parameters here that were part of paramsToSign for the signature

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || result.error) {
      console.error('Cloudinary API Error (upload):', result.error);
      throw new Error(`فشل تحميل الصورة: ${result.error?.message || response.statusText}`);
    }
    if (result.secure_url && result.public_id) {
      return { secure_url: result.secure_url, public_id: result.public_id };
    }
    console.error('Cloudinary API Error: Unexpected response format (upload)', result);
    throw new Error('فشل تحميل الصورة: استجابة غير متوقعة من خادم صور Cloudinary.');
  } catch (error: any) {
    console.error("Full Cloudinary Upload Error:", error);
    throw new Error(`فشل تحميل الصورة: ${error.message || 'خطأ غير متوقع أثناء الاتصال بخادم صور Cloudinary.'}`);
  }
}

async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  if (!publicId) {
    console.warn('No publicId provided for Cloudinary deletion.');
    return;
  }
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('Cloudinary credentials are missing for deletion.');
    return;
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign: Record<string, string | number> = { // Explicitly define type
    public_id: publicId,
    timestamp: timestamp,
  };
  const signature = generateSignature(paramsToSign, CLOUDINARY_API_SECRET);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (result.result !== 'ok' && result.result !== 'not found') {
      console.error('Cloudinary API Error (delete):', result);
    } else {
      console.log('Cloudinary deletion status for', publicId, ':', result.result);
    }
  } catch (error: any) {
    console.error('Error deleting image from Cloudinary:', publicId, error);
  }
}

// --- Car Types ---
export async function getCarTypesAdmin(): Promise<CarTypeOptionAdmin[]> {
  const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CarTypeOptionAdmin));
}

export async function addCarTypeAdmin(
  data: { label: string; order: number; imageUrlInput: File }
): Promise<void> {
  const { label, order, imageUrlInput } = data;

  const { secure_url, public_id } = await uploadImageToCloudinary(imageUrlInput, 'car_types');
  const value = slugify(label);

  const dataToSave: Omit<CarTypeOptionAdmin, 'id'> = {
    label,
    order,
    value,
    imageUrl: secure_url,
    publicId: public_id,
  };
  await addDoc(collection(db, CAR_TYPES_COLLECTION), dataToSave);
}

export async function updateCarTypeAdmin(
  id: string,
  data: {
    label?: string;
    order?: number;
    imageUrlInput?: File | null;
    currentImageUrl?: string;
    currentPublicId?: string;
   }
): Promise<void> {
  let newImageUrl = data.currentImageUrl;
  let newPublicId = data.currentPublicId;

  const { imageUrlInput, currentImageUrl, currentPublicId, ...updateDataFromForm } = data;

  if (imageUrlInput) { // A new file is uploaded
    if (currentPublicId) {
      await deleteImageFromCloudinary(currentPublicId);
    }
    const uploadResult = await uploadImageToCloudinary(imageUrlInput, 'car_types');
    newImageUrl = uploadResult.secure_url;
    newPublicId = uploadResult.public_id;
  } else if (imageUrlInput === null && !currentPublicId) {
    // Image was cleared and there was no existing publicId, or it was already cleared.
    // This case might be redundant if UI prevents clearing non-existent image.
    newImageUrl = '';
    newPublicId = '';
  } else if (imageUrlInput === null && currentPublicId) {
    // Image was explicitly cleared by user (e.g. X button)
    await deleteImageFromCloudinary(currentPublicId);
    newImageUrl = '';
    newPublicId = '';
  }
  // If imageUrlInput is undefined, it means the file input was not touched,
  // so we keep currentImageUrl and currentPublicId.

  const docRef = doc(db, CAR_TYPES_COLLECTION, id);
  const updatePayload: Partial<Omit<CarTypeOptionAdmin, 'id'>> = { ...updateDataFromForm };

  if (updateDataFromForm.label) {
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists() && updateDataFromForm.label !== currentDoc.data()?.label) {
      updatePayload.value = slugify(updateDataFromForm.label);
    }
  }

  // Only update image fields if they've actually changed
  if (newImageUrl !== currentImageUrl || newPublicId !== currentPublicId) {
    updatePayload.imageUrl = newImageUrl;
    updatePayload.publicId = newPublicId;
  }
  
  await updateDoc(docRef, updatePayload as any); // Type assertion needed due to partial nature
}


export async function deleteCarTypeAdmin(id: string): Promise<void> {
  const carTypeDocRef = doc(db, CAR_TYPES_COLLECTION, id);
  const carTypeDocSnap = await getDoc(carTypeDocRef);
  let carTypeValue = id; // Fallback to id if value not present
  let publicIdToDelete: string | undefined;

  if (carTypeDocSnap.exists()) {
    const carTypeData = carTypeDocSnap.data() as CarTypeOptionAdmin;
    carTypeValue = carTypeData.value || id; // Use slugified value for querying models
    publicIdToDelete = carTypeData.publicId;
  }

  if (publicIdToDelete) {
    await deleteImageFromCloudinary(publicIdToDelete);
  }
  await deleteDoc(carTypeDocRef);

  // Delete associated car models
  const modelsQuery = query(collection(db, CAR_MODELS_COLLECTION), where('type', '==', carTypeValue));
  const modelsSnapshot = await getDocs(modelsQuery);
  const batch = writeBatch(db);
  const modelImageDeletions: Promise<void>[] = [];

  modelsSnapshot.forEach((modelDoc) => {
    const modelData = modelDoc.data() as CarModelOptionAdmin;
    if (modelData.publicId) {
      modelImageDeletions.push(deleteImageFromCloudinary(modelData.publicId));
    }
    batch.delete(modelDoc.ref);
  });

  await Promise.all(modelImageDeletions); // Wait for all Cloudinary deletions
  await batch.commit(); // Then commit Firestore deletions
}

// --- Car Models ---
export async function getCarModelsAdmin(): Promise<CarModelOptionAdmin[]> {
  const q = query(collection(db, CAR_MODELS_COLLECTION), orderBy('order', 'asc'), orderBy('type', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CarModelOptionAdmin));
}

export async function addCarModelAdmin(
  data: { label: string; type: string; order: number; imageUrlInput: File }
): Promise<void> {
  const { label, type, order, imageUrlInput } = data;

  const { secure_url, public_id } = await uploadImageToCloudinary(imageUrlInput, `car_models/${type || 'general'}`);
  const value = slugify(label);

  const dataToSave: Omit<CarModelOptionAdmin, 'id'> = {
    label,
    type,
    order,
    value,
    imageUrl: secure_url,
    publicId: public_id,
  };
  await addDoc(collection(db, CAR_MODELS_COLLECTION), dataToSave);
}


export async function updateCarModelAdmin(
  id: string,
  data: {
    label?: string;
    type?: string;
    order?: number;
    imageUrlInput?: File | null;
    currentImageUrl?: string;
    currentPublicId?: string;
  }
): Promise<void> {
  let newImageUrl = data.currentImageUrl;
  let newPublicId = data.currentPublicId;

  const { imageUrlInput, currentImageUrl, currentPublicId, ...updateDataFromForm } = data;

  if (imageUrlInput) { // A new file is uploaded
    if (currentPublicId) {
      await deleteImageFromCloudinary(currentPublicId);
    }
    const uploadResult = await uploadImageToCloudinary(imageUrlInput, `car_models/${updateDataFromForm.type || 'general'}`);
    newImageUrl = uploadResult.secure_url;
    newPublicId = uploadResult.public_id;
  } else if (imageUrlInput === null && !currentPublicId) {
    newImageUrl = '';
    newPublicId = '';
  } else if (imageUrlInput === null && currentPublicId) {
    await deleteImageFromCloudinary(currentPublicId);
    newImageUrl = '';
    newPublicId = '';
  }

  const docRef = doc(db, CAR_MODELS_COLLECTION, id);
  const updatePayload: Partial<Omit<CarModelOptionAdmin, 'id'>> = { ...updateDataFromForm };

  if (updateDataFromForm.label) {
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists() && updateDataFromForm.label !== currentDoc.data()?.label) {
      updatePayload.value = slugify(updateDataFromForm.label);
    }
  }

  if (newImageUrl !== currentImageUrl || newPublicId !== currentPublicId) {
    updatePayload.imageUrl = newImageUrl;
    updatePayload.publicId = newPublicId;
  }
  
  await updateDoc(docRef, updatePayload as any);
}

export async function deleteCarModelAdmin(id: string): Promise<void> {
  const carModelDocRef = doc(db, CAR_MODELS_COLLECTION, id);
  const carModelDocSnap = await getDoc(carModelDocRef);
  if (carModelDocSnap.exists()) {
    const carModelData = carModelDocSnap.data() as CarModelOptionAdmin;
    if (carModelData.publicId) {
      await deleteImageFromCloudinary(carModelData.publicId);
    }
  }
  await deleteDoc(carModelDocRef);
}

// --- For Booking Form (Client-side data fetching) ---

// Get Car Types for Booking Form
export async function getCarTypesForBooking(): Promise<Omit<CarTypeOptionAdmin, 'order' | 'id' | 'publicId'>[]> {
  const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      value: data.value, // This is the slugified label, used as ID for model filtering
      label: data.label,
      imageUrl: data.imageUrl,
      dataAiHint: data.dataAiHint, // Keep if it exists, though admin won't set it
    } as Omit<CarTypeOptionAdmin, 'order' | 'id' | 'publicId'>;
  });
}

// Get Car Models for Booking Form based on selected Car Type
export async function getCarModelsForBooking(carTypeValue: string): Promise<Omit<CarModelOptionAdmin, 'order' | 'type'| 'id' | 'publicId'>[]> {
  if (!carTypeValue) return [];
  const q = query(
    collection(db, CAR_MODELS_COLLECTION),
    where('type', '==', carTypeValue), // carTypeValue is the slugified CarType.label
    orderBy('order', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      value: data.value, // This is the slugified model label
      label: data.label,
      imageUrl: data.imageUrl,
      dataAiHint: data.dataAiHint, // Keep if it exists
    } as Omit<CarModelOptionAdmin, 'order' | 'type'| 'id' | 'publicId'>;
  });
}
