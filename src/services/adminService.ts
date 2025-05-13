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
  runTransaction,
  addDoc as addFirestoreDoc // Use addDoc for auto-ID generation, then set specific doc for consistency
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, type FirebaseStorageError } from "firebase/storage";
import type { CarTypeOptionAdmin, CarModelOptionAdmin, AppConfig } from '@/types/admin';

const storage = getStorage(app); // Initialize Firebase Storage

// IMPORTANT: Firebase Storage Configuration
// If you encounter 'storage/unknown', 'storage/unauthorized', or CORS errors when uploading images:
// 1. Check Firebase Storage Rules:
//    - Ensure your rules allow write access to the paths used by this service (e.g., 'carTypes/', 'carModels/').
//    - For an admin panel, you might restrict access to authenticated admin users.
//    - Example basic rules (for development, refine for production):
//      rules_version = '2';
//      service firebase.storage {
//        match /b/{bucket}/o {
//          match /{allPaths=**} {
//            allow read; // Or more restrictive
//            allow write: if request.auth != null; // Example: Allow writes if user is authenticated
//          }
//        }
//      }
// 2. Check CORS Configuration on your Firebase Storage Bucket:
//    - Go to your Firebase project > Storage > Get Started (if not already).
//    - Your bucket name will be something like `your-project-id.appspot.com`.
//    - You need to configure CORS for this bucket, typically using `gsutil`.
//    - Create a `cors.json` file:
//      [
//        {
//          "origin": ["http://localhost:3000", "http://localhost:9002", "https://your-production-domain.com"], // Add your dev and prod domains
//          "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//          "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
//          "maxAgeSeconds": 3600
//        }
//      ]
//    - Upload this configuration using gsutil:
//      gsutil cors set cors.json gs://your-project-id.appspot.com
//    - You might need to install and configure gsutil: https://cloud.google.com/storage/docs/gsutil_install
//
// Common Error Codes and Meanings:
// - storage/unknown: Often a CORS issue or a very generic server error. Check network tab for server response.
// - storage/unauthorized: Storage rules are preventing the action. User might not have permission.
// - storage/object-not-found: Can sometimes be a symptom of CORS issues if the error message implies the bucket
//   doesn't have a CORS policy that allows your origin. Also, if the object truly doesn't exist during a delete.
// - storage/bucket-not-found: The storage bucket configured in your Firebase project doesn't exist.
// - storage/project-not-found: The Firebase project configured doesn't exist or cannot be accessed.


// Firestore collection names
const CAR_TYPES_COLLECTION = 'carTypes';
const CAR_MODELS_COLLECTION = 'carModels';
const APP_CONFIG_COLLECTION = 'appConfig';
const APP_CONFIG_DOC_ID = 'main';


// Helper function to upload image and get URL
async function uploadImage(file: File, pathPrefix: string, entityId: string): Promise<string> {
  if (!file || !file.name || !(file instanceof File)) {
    throw new Error('ملف غير صالح مقدم للتحميل.');
  }
  const safeFileName = file.name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
  const fileName = `${entityId}-${Date.now()}-${safeFileName}`;
  const imagePath = `${pathPrefix}/${fileName}`;
  const imageReference = storageRef(storage, imagePath);
  
  try {
    const snapshot = await uploadBytes(imageReference, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Firebase Storage upload failed:", error); 
    let userMessage = 'فشل تحميل الصورة. حدث خطأ غير معروف.';
    if (error instanceof Error && 'code' in error) { 
        const firebaseError = error as FirebaseStorageError; 
        userMessage = `فشل تحميل الصورة (الكود: ${firebaseError.code}).`;
        
        if (firebaseError.serverResponse) {
            userMessage += ` استجابة الخادم: ${firebaseError.serverResponse}`;
        }

        switch (firebaseError.code) {
            case 'storage/unauthorized':
                userMessage = 'فشل تحميل الصورة: غير مصرح لك. يرجى التحقق من قواعد أمان Firebase Storage وأذونات المستخدم.';
                break;
            case 'storage/canceled':
                userMessage = 'فشل تحميل الصورة: تم إلغاء التحميل.';
                break;
            case 'storage/unknown':
                userMessage = 'فشل تحميل الصورة: خطأ غير معروف من الخادم. يرجى التحقق من إعدادات CORS وقواعد Storage في Firebase Console. راجع وحدة التحكم للمطورين في المتصفح لمزيد من التفاصيل حول استجابة الشبكة.';
                break;
            case 'storage/object-not-found':
                if (firebaseError.message?.toLowerCase().includes('cors')) {
                     userMessage = 'فشل تحميل الصورة. قد تكون هناك مشكلة في إعدادات CORS على Firebase Storage bucket. تأكد من أن نطاقك (origin) مسموح به.';
                } else {
                    userMessage = `فشل تحميل الصورة: الكائن غير موجود (الكود: ${firebaseError.code}).`;
                }
                break;
             case 'storage/bucket-not-found':
                userMessage = `فشل تحميل الصورة: لم يتم العثور على Storage bucket (الكود: ${firebaseError.code}). تحقق من إعدادات مشروع Firebase.`;
                break;
             case 'storage/project-not-found':
                userMessage = `فشل تحميل الصورة: لم يتم العثور على مشروع Firebase (الكود: ${firebaseError.code}). تحقق من إعدادات مشروع Firebase.`;
                break;
            default:
                userMessage = `فشل تحميل الصورة (الكود: ${firebaseError.code}). التفاصيل: ${firebaseError.message || 'لا توجد تفاصيل إضافية.'}`;
        }
    }
    throw new Error(userMessage);
  }
}

async function deleteOldImageWithCaution(imageUrl: string | undefined) {
    if (!imageUrl || !imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
        console.log("Skipping deletion of invalid or non-Firebase Storage URL:", imageUrl);
        return;
    }
    try {
        const imageHttpRef = storageRef(storage, imageUrl); 
        await deleteObject(imageHttpRef);
        console.log("Successfully deleted old image from Storage:", imageUrl);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.log("Old image not found in storage (may have been already deleted or path mismatch):", imageUrl);
        } else {
            console.error("Failed to delete old image from Storage:", imageUrl, error);
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
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, value: docSnap.id, ...docSnap.data() } as CarTypeOptionAdmin));
}

export async function addCarTypeAdmin(carTypeData: Omit<CarTypeOptionAdmin, 'id' | 'value' | 'imageUrl' | 'dataAiHint'> & { imageUrlInput: File | null }): Promise<string> {
  if (!(carTypeData.imageUrlInput instanceof File)) {
    throw new Error('ملف الصورة مطلوب لإضافة نوع سيارة جديد.');
  }
  
  // Create a new document reference with an auto-generated ID
  const newDocRef = doc(collection(db, CAR_TYPES_COLLECTION));
  const newId = newDocRef.id;

  const finalImageUrl = await uploadImage(carTypeData.imageUrlInput, CAR_TYPES_COLLECTION, newId);

  const dataToSave: Omit<CarTypeOptionAdmin, 'id' | 'dataAiHint'> = { // dataAiHint removed from what's saved
    value: newId, // Store the auto-generated ID in the 'value' field
    label: carTypeData.label,
    imageUrl: finalImageUrl,
    order: carTypeData.order,
  };

  await setDoc(newDocRef, dataToSave);
  return newId;
}

export async function updateCarTypeAdmin(id: string, carTypeUpdate: Partial<Omit<CarTypeOptionAdmin, 'id' | 'value' | 'imageUrl' | 'dataAiHint'>> & { imageUrlInput?: File | null, currentImageUrl?: string }): Promise<void> {
  const docRef = doc(db, CAR_TYPES_COLLECTION, id);
  
  const updatePayload: { [key: string]: any } = { ...carTypeUpdate };
  delete updatePayload.imageUrlInput; // remove from payload as it's handled separately
  const oldImageUrl = updatePayload.currentImageUrl; 
  delete updatePayload.currentImageUrl;
  // dataAiHint is implicitly removed if not in carTypeUpdate, which it won't be from the form anymore

  if (carTypeUpdate.imageUrlInput instanceof File) {
    if (oldImageUrl) {
        await deleteOldImageWithCaution(oldImageUrl); 
    }
    updatePayload.imageUrl = await uploadImage(carTypeUpdate.imageUrlInput, CAR_TYPES_COLLECTION, id);
  } else if (carTypeUpdate.imageUrlInput === null && oldImageUrl) {
    await deleteOldImageWithCaution(oldImageUrl);
    updatePayload.imageUrl = ''; 
  }

  if (Object.keys(updatePayload).length > 0) {
    await updateDoc(docRef, updatePayload);
  }
}

export async function deleteCarTypeAdmin(id: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const carTypeDocRef = doc(db, CAR_TYPES_COLLECTION, id);
    const carTypeSnap = await transaction.get(carTypeDocRef);
    if (!carTypeSnap.exists()) {
        throw new Error("لم يتم العثور على نوع السيارة للحذف.");
    }
    const carTypeData = carTypeSnap.data() as CarTypeOptionAdmin;
    if (carTypeData.imageUrl) {
        await deleteOldImageWithCaution(carTypeData.imageUrl);
    }

    transaction.delete(carTypeDocRef);

    const modelsQuery = query(collection(db, CAR_MODELS_COLLECTION), where('type', '==', id));
    const modelsSnapshot = await getDocs(modelsQuery); 
    
    for (const modelDoc of modelsSnapshot.docs) {
      const modelData = modelDoc.data() as CarModelOptionAdmin;
      if (modelData.imageUrl) {
         await deleteOldImageWithCaution(modelData.imageUrl);
      }
      transaction.delete(doc(db, CAR_MODELS_COLLECTION, modelDoc.id));
    }
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
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, value: docSnap.id, ...docSnap.data() } as CarModelOptionAdmin));
}

export async function addCarModelAdmin(carModelData: Omit<CarModelOptionAdmin, 'id' | 'value' | 'imageUrl' | 'dataAiHint'> & { imageUrlInput: File | null }): Promise<string> {
  if (!(carModelData.imageUrlInput instanceof File)) {
    throw new Error('ملف الصورة مطلوب لإضافة موديل سيارة جديد.');
  }

  const newDocRef = doc(collection(db, CAR_MODELS_COLLECTION));
  const newId = newDocRef.id;

  const finalImageUrl = await uploadImage(carModelData.imageUrlInput, CAR_MODELS_COLLECTION, newId);
  
  const dataToSave: Omit<CarModelOptionAdmin, 'id' | 'dataAiHint'> = { // dataAiHint removed
    value: newId, // Store auto-generated ID in 'value'
    label: carModelData.label,
    imageUrl: finalImageUrl,
    type: carModelData.type,
    order: carModelData.order,
  };
  
  await setDoc(newDocRef, dataToSave);
  return newId;
}

export async function updateCarModelAdmin(id: string, carModelUpdate: Partial<Omit<CarModelOptionAdmin, 'id' | 'value' | 'imageUrl' | 'dataAiHint'>> & { imageUrlInput?: File | null, currentImageUrl?: string }): Promise<void> {
  const docRef = doc(db, CAR_MODELS_COLLECTION, id);
  const updatePayload: { [key: string]: any } = { ...carModelUpdate };
  delete updatePayload.imageUrlInput;
  const oldImageUrl = updatePayload.currentImageUrl;
  delete updatePayload.currentImageUrl;
  // dataAiHint is implicitly removed

  if (carModelUpdate.imageUrlInput instanceof File) {
     if (oldImageUrl) {
        await deleteOldImageWithCaution(oldImageUrl);
    }
    updatePayload.imageUrl = await uploadImage(carModelUpdate.imageUrlInput, CAR_MODELS_COLLECTION, id);
  } else if (carModelUpdate.imageUrlInput === null && oldImageUrl) {
    await deleteOldImageWithCaution(oldImageUrl);
    updatePayload.imageUrl = '';
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
      if(modelData.imageUrl) {
          await deleteOldImageWithCaution(modelData.imageUrl);
      }
  }
  await deleteDoc(modelDocRef);
}

// --- App Config ---
export async function getAppConfig(): Promise<AppConfig | null> {
    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as AppConfig;
    }
    const defaultConfig: AppConfig = { appName: 'ClearRide', logoUrl: '' };
    try {
        await setDoc(docRef, defaultConfig); 
        return defaultConfig;
    } catch (error) {
        console.error("Failed to set default app config:", error);
        return { appName: 'ClearRide', logoUrl: '' }; 
    }
}

export async function updateAppConfigAdmin(config: AppConfig): Promise<void> {
    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    await setDoc(docRef, config, { merge: true });
}
