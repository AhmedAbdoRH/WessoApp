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
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
    // In a real app, you might want to throw a more specific error or handle it
    return null; // Return null or a default config if appropriate
  }
}

export async function updateAppConfigAdmin(config: AppConfig): Promise<void> {
  const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
  await setDoc(docRef, config, { merge: true });
}


// --- Image Upload Helper ---
async function uploadImage(file: File, path: string): Promise<string> {
  const storage = getStorage();
  // Sanitize filename, replace spaces with underscores, ensure uniqueness
  const safeFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const storageRef = ref(storage, `${path}/${safeFileName}`);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error("Full Firebase Storage Error:", error);
    let userMessage = "فشل تحميل الصورة.";

    if (error.code) {
        switch (error.code) {
            case 'storage/unauthorized':
                userMessage = "فشل تحميل الصورة: ليس لديك إذن لتنفيذ هذا الإجراء. تحقق من قواعد أمان Firebase Storage.";
                break;
            case 'storage/canceled':
                userMessage = "فشل تحميل الصورة: تم إلغاء التحميل.";
                break;
            case 'storage/quota-exceeded':
                userMessage = "فشل تحميل الصورة: تجاوز حد التخزين المسموح به.";
                break;
            case 'storage/object-not-found':
                 userMessage = "فشل تحميل الصورة: الملف أو المسار غير موجود.";
                 break;
            case 'storage/retry-limit-exceeded':
                userMessage = "فشل تحميل الصورة: تم تجاوز مهلة المحاولة. يرجى التحقق من اتصالك بالإنترنت.";
                break;
             case 'storage/invalid-argument':
                userMessage = "فشل تحميل الصورة: وسيطة غير صالحة مقدمة لوظيفة التخزين.";
                break;
            // This case often indicates CORS issues or other server-side restrictions
            case 'storage/unknown': 
                userMessage = "فشل تحميل الصورة: خطأ غير معروف من الخادم. يرجى التحقق من إعدادات CORS وقواعد Storage في Firebase Console. راجع وحدة التحكم للمطورين في المتصفح لمزيد من التفاصيل حول استجابة الشبكة.";
                break;
            default:
                userMessage = `فشل تحميل الصورة: ${error.message || 'خطأ غير متوقع.'}`;
        }
    } else if (error.message && error.message.includes('CORS')) {
         userMessage = "فشل تحميل الصورة بسبب مشكلة CORS. تأكد من تكوين CORS بشكل صحيح لدلو Firebase Storage الخاص بك.";
    }

    // Log the detailed error for server-side debugging
    console.error(`Firebase Storage Error Code: ${error.code}, Server Message: ${error.serverResponse}`);
    console.error("User-facing error message being thrown:", userMessage);
    throw new Error(userMessage);
  }
}

async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith('https://firebasestorage.googleapis.com/')) {
    console.log('Invalid or non-Firebase Storage URL, skipping delete:', imageUrl);
    return;
  }
  const storage = getStorage();
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error: any) {
    // Log error but don't fail the whole operation if image deletion fails
    // (e.g., if the image was already deleted or permissions changed)
    if (error.code === 'storage/object-not-found') {
      console.warn('Image not found for deletion (might have been already deleted):', imageUrl);
    } else {
      console.error('Failed to delete image from storage:', imageUrl, error);
    }
  }
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
  const imageUrl = await uploadImage(data.imageUrlInput, 'car-types');
  const value = slugify(data.label); // Generate value from label
  await addDoc(collection(db, CAR_TYPES_COLLECTION), { ...data, value, imageUrl });
}

export async function updateCarTypeAdmin(
  id: string,
  data: Partial<Omit<CarTypeOptionAdmin, 'id' | 'value' | 'imageUrl'>> & { imageUrlInput?: File | null, currentImageUrl?: string }
): Promise<void> {
  let newImageUrl = data.currentImageUrl;
  if (data.imageUrlInput) {
    if (data.currentImageUrl) {
      await deleteImage(data.currentImageUrl);
    }
    newImageUrl = await uploadImage(data.imageUrlInput, 'car-types');
  } else if (data.imageUrlInput === null && data.currentImageUrl) { 
    // Explicitly clearing image by setting imageUrlInput to null
    await deleteImage(data.currentImageUrl);
    newImageUrl = ''; // Set to empty string or handle as needed
  }


  const { imageUrlInput, currentImageUrl, ...updateData } = data;
  const docRef = doc(db, CAR_TYPES_COLLECTION, id);

  // If label changes, update value
  if (updateData.label) {
    (updateData as CarTypeOptionAdmin).value = slugify(updateData.label);
  }
  
  await updateDoc(docRef, { ...updateData, imageUrl: newImageUrl });
}

export async function deleteCarTypeAdmin(id: string): Promise<void> {
  // First, fetch the car type to get its image URL for deletion
  const carTypeDoc = await getDoc(doc(db, CAR_TYPES_COLLECTION, id));
  if (carTypeDoc.exists()) {
    const carTypeData = carTypeDoc.data() as CarTypeOptionAdmin;
    if (carTypeData.imageUrl) {
      await deleteImage(carTypeData.imageUrl);
    }
  }

  // Delete the car type document
  await deleteDoc(doc(db, CAR_TYPES_COLLECTION, id));

  // Delete associated car models
  const modelsQuery = query(collection(db, CAR_MODELS_COLLECTION), where('type', '==', id));
  const modelsSnapshot = await getDocs(modelsQuery);
  const batch = writeBatch(db);
  modelsSnapshot.forEach(async (modelDoc) => {
    const modelData = modelDoc.data() as CarModelOptionAdmin;
    if (modelData.imageUrl) {
      await deleteImage(modelData.imageUrl); // Delete model image
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
  const value = slugify(data.label); // Generate value from label
  await addDoc(collection(db, CAR_MODELS_COLLECTION), { ...data, value, imageUrl });
}

export async function updateCarModelAdmin(
  id: string,
  data: Partial<Omit<CarModelOptionAdmin, 'id'| 'value' | 'imageUrl'>> & { imageUrlInput?: File | null, currentImageUrl?: string }
): Promise<void> {
  let newImageUrl = data.currentImageUrl;
  if (data.imageUrlInput) {
    if (data.currentImageUrl) {
      await deleteImage(data.currentImageUrl);
    }
    newImageUrl = await uploadImage(data.imageUrlInput, `car-models/${data.type || 'general'}`);
  } else if (data.imageUrlInput === null && data.currentImageUrl) {
     await deleteImage(data.currentImageUrl);
     newImageUrl = '';
  }

  const { imageUrlInput, currentImageUrl, ...updateData } = data;
  const docRef = doc(db, CAR_MODELS_COLLECTION, id);
  
  if (updateData.label) {
    (updateData as CarModelOptionAdmin).value = slugify(updateData.label);
  }

  await updateDoc(docRef, { ...updateData, imageUrl: newImageUrl });
}

export async function deleteCarModelAdmin(id: string): Promise<void> {
  const carModelDoc = await getDoc(doc(db, CAR_MODELS_COLLECTION, id));
  if (carModelDoc.exists()) {
    const carModelData = carModelDoc.data() as CarModelOptionAdmin;
    if (carModelData.imageUrl) {
      await deleteImage(carModelData.imageUrl);
    }
  }
  await deleteDoc(doc(db, CAR_MODELS_COLLECTION, id));
}

// --- For Booking Form (Client-side data fetching) ---
// These functions are called from client components.
// They don't need 'use server' if they are simple data fetches.
// However, if they involved mutations or complex logic that should be server-side,
// they would be server actions (or you'd call server actions from them).

export async function getCarTypesForBooking(): Promise<Omit<CarTypeOptionAdmin, 'order' | 'dataAiHint' | 'id'>[]> {
  const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      value: doc.id, // Use Firestore ID as the value for selection
      label: data.label,
      imageUrl: data.imageUrl,
    } as Omit<CarTypeOptionAdmin, 'order' | 'dataAiHint' | 'id'>;
  });
}

export async function getCarModelsForBooking(carTypeId: string): Promise<Omit<CarModelOptionAdmin, 'order' | 'dataAiHint' | 'type' | 'id'>[]> {
  if (!carTypeId) return [];
  const q = query(
    collection(db, CAR_MODELS_COLLECTION),
    where('type', '==', carTypeId), // Filter by car type ID
    orderBy('order', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      value: doc.id, // Use Firestore ID as the value
      label: data.label,
      imageUrl: data.imageUrl,
    } as Omit<CarModelOptionAdmin, 'order' | 'dataAiHint' | 'type' | 'id'>;
  });
}
