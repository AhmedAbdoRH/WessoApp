
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
// Firebase Storage imports are removed as we are switching to ImgBB
// import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { AppConfig, CarTypeOptionAdmin, CarModelOptionAdmin } from '@/types/admin';
import { slugify } from '@/lib/slugify'; // Helper for generating 'value'

const APP_CONFIG_COLLECTION = 'appConfig';
const APP_CONFIG_DOC_ID = 'main';
const CAR_TYPES_COLLECTION = 'carTypes';
const CAR_MODELS_COLLECTION = 'carModels';

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


// --- Image Upload Helper (ImgBB) ---
async function uploadImage(file: File, path?: string): Promise<string> { // path is optional for ImgBB
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey || apiKey === "YOUR_IMGBB_API_KEY_HERE") {
    console.error('ImgBB API Key is missing or not configured in .env file.');
    throw new Error('فشل تحميل الصورة: لم يتم تكوين خدمة تحميل الصور بشكل صحيح. (مفتاح API مفقود)');
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ImgBB API Error:', errorData);
      throw new Error(`فشل تحميل الصورة: ${errorData?.error?.message || response.statusText}`);
    }

    const result = await response.json();
    if (result.success && result.data && result.data.url) {
      return result.data.url; // Use 'url' which is often the direct image link, or 'display_url'
    } else {
      console.error('ImgBB API Error: Unexpected response format', result);
      throw new Error('فشل تحميل الصورة: استجابة غير متوقعة من خادم الصور.');
    }
  } catch (error: any) {
    console.error("Full ImgBB Upload Error:", error);
    throw new Error(`فشل تحميل الصورة: ${error.message || 'خطأ غير متوقع أثناء الاتصال بخادم الصور.'}`);
  }
}

async function deleteImage(imageUrl: string): Promise<void> {
  // For ImgBB, deletion requires a specific delete_url provided upon upload.
  // Since we are not storing it in this iteration, we cannot programmatically delete.
  // This function will be a no-op for ImgBB URLs.
  // If old Firebase URLs are encountered, this logic might need to be re-added or handled separately.
  if (imageUrl && imageUrl.includes('i.ibb.co')) {
    console.log('Automatic deletion for ImgBB URL is not supported without a delete_url:', imageUrl);
    return;
  }
  
  // Example of how Firebase deletion was handled (can be removed if only ImgBB is used)
  if (imageUrl && imageUrl.startsWith('https://firebasestorage.googleapis.com/')) {
     console.warn('Attempting to delete a Firebase Storage URL, but image storage has been switched to ImgBB. This old image might not be deleted by this function anymore:', imageUrl);
    // To re-enable Firebase deletion if needed:
    // const storage = getStorage();
    // try {
    //   const imageRef = ref(storage, imageUrl);
    //   await deleteObject(imageRef);
    //   console.log('Successfully deleted old Firebase image:', imageUrl);
    // } catch (error: any) {
    //   if (error.code === 'storage/object-not-found') {
    //     console.warn('Old Firebase image not found for deletion:', imageUrl);
    //   } else {
    //     console.error('Failed to delete old Firebase image:', imageUrl, error);
    //   }
    // }
    return;
  }
  console.log('Skipping delete for unrecognized image URL type:', imageUrl);
}


// --- Car Types ---
export async function getCarTypesAdmin(): Promise<CarTypeOptionAdmin[]> {
  const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarTypeOptionAdmin));
}

export async function addCarTypeAdmin(
  data: Omit<CarTypeOptionAdmin, 'id' | 'value' | 'imageUrl'> & { imageUrlInput: File }
): Promise<void> {
  const imageUrl = await uploadImage(data.imageUrlInput, 'car-types'); // path 'car-types' is illustrative for ImgBB
  const value = slugify(data.label);
  await addDoc(collection(db, CAR_TYPES_COLLECTION), { ...data, value, imageUrl });
}

export async function updateCarTypeAdmin(
  id: string,
  data: Partial<Omit<CarTypeOptionAdmin, 'id' | 'value' | 'imageUrl'>> & { imageUrlInput?: File | null, currentImageUrl?: string }
): Promise<void> {
  let newImageUrl = data.currentImageUrl;
  if (data.imageUrlInput) { // A new file is provided
    if (data.currentImageUrl) {
      // We don't automatically delete from ImgBB here as we don't have the delete_url
      console.log("A new image is being uploaded for car type, the old ImgBB image will not be automatically deleted:", data.currentImageUrl);
    }
    newImageUrl = await uploadImage(data.imageUrlInput, `car-types`);
  } else if (data.imageUrlInput === null && data.currentImageUrl) { 
    // Explicitly clearing image by setting imageUrlInput to null (meaning no new image, and old one should be considered "removed")
    // Again, actual deletion from ImgBB is not done here.
    console.log("Image cleared for car type. The ImgBB image will not be automatically deleted:", data.currentImageUrl);
    newImageUrl = ''; // Set to empty string to represent no image
  }

  const { imageUrlInput, currentImageUrl, ...updateData } = data;
  const docRef = doc(db, CAR_TYPES_COLLECTION, id);

  if (updateData.label && updateData.label !== (await getDoc(docRef)).data()?.label) {
    (updateData as CarTypeOptionAdmin).value = slugify(updateData.label);
  }
  
  await updateDoc(docRef, { ...updateData, imageUrl: newImageUrl });
}

export async function deleteCarTypeAdmin(id: string): Promise<void> {
  const carTypeDocRef = doc(db, CAR_TYPES_COLLECTION, id);
  const carTypeDoc = await getDoc(carTypeDocRef);
  let carTypeValue = id; // Fallback to id if value field isn't there or doc doesn't exist

  if (carTypeDoc.exists()) {
    const carTypeData = carTypeDoc.data() as CarTypeOptionAdmin;
    carTypeValue = carTypeData.value || id; // Use carTypeData.value for querying models
    if (carTypeData.imageUrl) {
      // Deletion from ImgBB is manual / not supported here
      console.log("Deleting car type. Associated ImgBB image will not be automatically deleted:", carTypeData.imageUrl);
    }
  }

  await deleteDoc(carTypeDocRef);

  // Delete associated car models
  const modelsQuery = query(collection(db, CAR_MODELS_COLLECTION), where('type', '==', carTypeValue));
  const modelsSnapshot = await getDocs(modelsQuery);
  const batch = writeBatch(db);
  modelsSnapshot.forEach((modelDoc) => {
    const modelData = modelDoc.data() as CarModelOptionAdmin;
    if (modelData.imageUrl) {
      // Deletion from ImgBB is manual / not supported here
       console.log("Deleting associated car model. ImgBB image will not be automatically deleted:", modelData.imageUrl);
    }
    batch.delete(modelDoc.ref);
  });
  await batch.commit();
}

// --- Car Models ---
export async function getCarModelsAdmin(): Promise<CarModelOptionAdmin[]> {
  const q = query(collection(db, CAR_MODELS_COLLECTION), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarModelOptionAdmin));
}

export async function addCarModelAdmin(
  data: Omit<CarModelOptionAdmin, 'id' | 'value' | 'imageUrl'> & { imageUrlInput: File }
): Promise<void> {
  const imageUrl = await uploadImage(data.imageUrlInput, `car-models/${data.type}`);
  const value = slugify(data.label);
  await addDoc(collection(db, CAR_MODELS_COLLECTION), { ...data, value, imageUrl });
}

export async function updateCarModelAdmin(
  id: string,
  data: Partial<Omit<CarModelOptionAdmin, 'id'| 'value' | 'imageUrl'>> & { imageUrlInput?: File | null, currentImageUrl?: string }
): Promise<void> {
  let newImageUrl = data.currentImageUrl;
  if (data.imageUrlInput) {
    if (data.currentImageUrl) {
      console.log("A new image is being uploaded for car model, the old ImgBB image will not be automatically deleted:", data.currentImageUrl);
    }
    newImageUrl = await uploadImage(data.imageUrlInput, `car-models/${data.type || 'general'}`);
  } else if (data.imageUrlInput === null && data.currentImageUrl) {
     console.log("Image cleared for car model. The ImgBB image will not be automatically deleted:", data.currentImageUrl);
     newImageUrl = '';
  }

  const { imageUrlInput, currentImageUrl, ...updateData } = data;
  const docRef = doc(db, CAR_MODELS_COLLECTION, id);
  
  if (updateData.label && updateData.label !== (await getDoc(docRef)).data()?.label) {
    (updateData as CarModelOptionAdmin).value = slugify(updateData.label);
  }

  await updateDoc(docRef, { ...updateData, imageUrl: newImageUrl });
}

export async function deleteCarModelAdmin(id: string): Promise<void> {
  const carModelDocRef = doc(db, CAR_MODELS_COLLECTION, id);
  const carModelDoc = await getDoc(carModelDocRef);
  if (carModelDoc.exists()) {
    const carModelData = carModelDoc.data() as CarModelOptionAdmin;
    if (carModelData.imageUrl) {
      console.log("Deleting car model. Associated ImgBB image will not be automatically deleted:", carModelData.imageUrl);
    }
  }
  await deleteDoc(carModelDocRef);
}

// --- For Booking Form (Client-side data fetching) ---

export async function getCarTypesForBooking(): Promise<Omit<CarTypeOptionAdmin, 'order' | 'dataAiHint' | 'id'>[]> {
  const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnapshot => { // Renamed doc to docSnapshot to avoid conflict
    const data = docSnapshot.data();
    return {
      value: data.value, // Use the slugified 'value' field
      label: data.label,
      imageUrl: data.imageUrl,
    } as Omit<CarTypeOptionAdmin, 'order' | 'dataAiHint'| 'id'>;
  });
}

export async function getCarModelsForBooking(carTypeValue: string): Promise<Omit<CarModelOptionAdmin, 'order' | 'dataAiHint' | 'type'| 'id'>[]> {
  if (!carTypeValue) return [];
  const q = query(
    collection(db, CAR_MODELS_COLLECTION),
    where('type', '==', carTypeValue), // Filter by car type's 'value' (slug)
    orderBy('order', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnapshot => { // Renamed doc to docSnapshot
    const data = docSnapshot.data();
    return {
      value: data.value, // Use the slugified 'value' field
      label: data.label,
      imageUrl: data.imageUrl,
    } as Omit<CarModelOptionAdmin, 'order' | 'dataAiHint' | 'type'| 'id'>;
  });
}
