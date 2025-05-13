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
import type { AppConfig, CarTypeOptionAdmin, CarModelOptionAdmin, CustomerContactAdmin } from '@/types/admin';
import { slugify } from '@/lib/slugify';
import crypto from 'crypto';

const APP_CONFIG_COLLECTION = 'appConfig';
const APP_CONFIG_DOC_ID = 'main';
const CAR_TYPES_COLLECTION = 'carTypes';
const CAR_MODELS_COLLECTION = 'carModels';
const CUSTOMER_CONTACTS_COLLECTION = 'customerContacts'; // New collection for phone numbers

// --- App Configuration ---
export async function getAppConfig(): Promise<AppConfig | null> {
  try {
    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as AppConfig;
    }
    // Return default config if none exists
    return { appName: 'ClearRide', logoUrl: '', logoPublicId: '' };
  } catch (error) {
    console.error('Error fetching app config:', error);
    if (error instanceof Error) {
        throw new Error(`Failed to fetch app config: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching app config.');
  }
}

export async function updateAppConfigAdmin(formData: FormData): Promise<void> {
  const appName = formData.get('appName') as string;
  const logoFile = formData.get('logoFile') as File | null;
  const removeLogoStr = formData.get('removeLogo') as string | null;
  const removeLogo = removeLogoStr === 'true';
  const currentLogoPublicId = formData.get('currentLogoPublicId') as string | null;

  try {
    const configUpdate: Partial<AppConfig> = { appName };

    if (logoFile) {
      // New logo uploaded
      if (currentLogoPublicId) {
        await deleteImageFromCloudinary(currentLogoPublicId).catch(e => console.warn("Failed to delete old app logo, continuing:", e instanceof Error ? e.message : String(e)));
      }
      const uploadResult = await uploadImageToCloudinary(logoFile, 'app_logos');
      configUpdate.logoUrl = uploadResult.secure_url;
      configUpdate.logoPublicId = uploadResult.public_id;
    } else if (removeLogo) {
      // User wants to remove the existing logo
      if (currentLogoPublicId) {
        await deleteImageFromCloudinary(currentLogoPublicId).catch(e => console.warn("Failed to delete app logo for removal, continuing:", e instanceof Error ? e.message : String(e)));
      }
      configUpdate.logoUrl = '';
      configUpdate.logoPublicId = '';
    } else {
      const existingConfig = await getAppConfig();
      if (existingConfig?.logoUrl && existingConfig?.logoPublicId){
        configUpdate.logoUrl = existingConfig.logoUrl;
        configUpdate.logoPublicId = existingConfig.logoPublicId;
      } else {
        configUpdate.logoUrl = '';
        configUpdate.logoPublicId = '';
      }
    }

    const docRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
    await setDoc(docRef, configUpdate, { merge: true });
  } catch (error) {
    console.error('Error updating app config:', error);
    if (error instanceof Error) {
        throw new Error(`Failed to update app config: ${error.message}`);
    }
    throw new Error('An unknown error occurred while updating app config.');
  }
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
  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('Cloudinary credentials are not configured in .env file or service.');
    throw new Error('فشل تحميل الصورة: لم يتم تكوين خدمة تحميل الصور بشكل صحيح (بيانات اعتماد Cloudinary مفقودة).');
  }

  if (!(file instanceof File)) {
    console.error('Invalid file object passed to uploadImageToCloudinary:', file);
    throw new Error('فشل تحميل الصورة: ملف غير صالح مقدم للتحميل.');
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign: Record<string, string | number> = {
    folder: folder,
    timestamp: timestamp,
  };
  const signature = generateSignature(paramsToSign, CLOUDINARY_API_SECRET);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();

    if (!response.ok || result.error) {
      console.error('Cloudinary API Error (upload):', result.error || `Status: ${response.status}`);
      throw new Error(`فشل تحميل الصورة: ${result.error?.message || response.statusText || 'خطأ غير معروف من Cloudinary.'}`);
    }
    if (result.secure_url && result.public_id) {
      return { secure_url: result.secure_url, public_id: result.public_id };
    }
    console.error('Cloudinary API Error: Unexpected response format (upload)', result);
    throw new Error('فشل تحميل الصورة: استجابة غير متوقعة من خادم صور Cloudinary.');
  } catch (error: any) {
    console.error("Full Cloudinary Upload Error details:", error);
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير متوقع أثناء الاتصال بخادم صور Cloudinary.';
    throw new Error(errorMessage);
  }
}

async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  if (!publicId) {
    console.warn('No publicId provided for Cloudinary deletion.');
    return;
  }

  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('Cloudinary credentials are missing for deletion.');
    throw new Error('فشل حذف الصورة: بيانات اعتماد Cloudinary مفقودة.');
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign: Record<string, string | number> = { 
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
      throw new Error(`فشل حذف الصورة من Cloudinary: ${result.error?.message || 'استجابة غير متوقعة.'}`);
    } else {
      console.log('Cloudinary deletion status for', publicId, ':', result.result);
    }
  } catch (error: any) {
    console.error('Error deleting image from Cloudinary:', publicId, error);
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير متوقع أثناء حذف الصورة من Cloudinary.';
    throw new Error(errorMessage);
  }
}

// --- Car Types ---
export async function getCarTypesAdmin(): Promise<CarTypeOptionAdmin[]> {
  try {
    const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CarTypeOptionAdmin));
  } catch (error) {
    console.error("Error in getCarTypesAdmin:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get car types: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching car types.');
  }
}

export async function addCarTypeAdmin(
  data: { label: string; order: number; imageUrlInput: File }
): Promise<void> {
  try {
    const { label, order, imageUrlInput } = data;

    const uploadResult = await uploadImageToCloudinary(imageUrlInput, 'car_types');
    const value = slugify(label);

    const dataToSave: Omit<CarTypeOptionAdmin, 'id'> = {
      label,
      order,
      value,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };
    await addDoc(collection(db, CAR_TYPES_COLLECTION), dataToSave);
  } catch (error) {
    console.error("Error in addCarTypeAdmin:", error);
    if (error instanceof Error) {
        throw error; 
    }
    throw new Error('An unknown error occurred while adding car type.');
  }
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
  try {
    let newImageUrl = data.currentImageUrl;
    let newPublicId = data.currentPublicId;

    const { imageUrlInput, ...updateDataFromForm } = data; 

    if (imageUrlInput instanceof File) { 
      if (data.currentPublicId) { 
        await deleteImageFromCloudinary(data.currentPublicId).catch(e => console.warn("Failed to delete old car type image, continuing:", e instanceof Error ? e.message : String(e)));
      }
      const uploadResult = await uploadImageToCloudinary(imageUrlInput, 'car_types');
      newImageUrl = uploadResult.secure_url;
      newPublicId = uploadResult.public_id;
    } else if (imageUrlInput === null && data.currentPublicId) { 
      await deleteImageFromCloudinary(data.currentPublicId).catch(e => console.warn("Failed to delete car type image for removal, continuing:", e instanceof Error ? e.message : String(e)));
      newImageUrl = '';
      newPublicId = '';
    }
  
    const docRef = doc(db, CAR_TYPES_COLLECTION, id);
    const updatePayload: Partial<Omit<CarTypeOptionAdmin, 'id'>> = { 
        ...(updateDataFromForm.label && { label: updateDataFromForm.label }),
        ...(updateDataFromForm.order !== undefined && { order: updateDataFromForm.order }),
     };

    if (updateDataFromForm.label) {
      const currentDoc = await getDoc(docRef);
      if (currentDoc.exists() && updateDataFromForm.label !== currentDoc.data()?.label) {
        updatePayload.value = slugify(updateDataFromForm.label);
      }
    }

    // Only update image fields if they have actually changed
    if (newImageUrl !== data.currentImageUrl || newPublicId !== data.currentPublicId) {
      updatePayload.imageUrl = newImageUrl || ''; // Ensure empty string if newImageUrl is undefined
      updatePayload.publicId = newPublicId || ''; // Ensure empty string if newPublicId is undefined
    }
    
    if (Object.keys(updatePayload).length > 0) {
      await updateDoc(docRef, updatePayload as any); 
    }
  } catch (error) {
    console.error("Error in updateCarTypeAdmin:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred while updating car type.');
  }
}


export async function deleteCarTypeAdmin(id: string): Promise<void> {
  try {
    const carTypeDocRef = doc(db, CAR_TYPES_COLLECTION, id);
    const carTypeDocSnap = await getDoc(carTypeDocRef);
    let carTypeValue = id; 
    let publicIdToDelete: string | undefined;

    if (carTypeDocSnap.exists()) {
      const carTypeData = carTypeDocSnap.data() as CarTypeOptionAdmin;
      carTypeValue = carTypeData.value || id; 
      publicIdToDelete = carTypeData.publicId;
    }

    if (publicIdToDelete) {
      await deleteImageFromCloudinary(publicIdToDelete).catch(e => console.warn("Failed to delete car type image from Cloudinary, continuing with Firestore delete:", e instanceof Error ? e.message : String(e)));
    }
    await deleteDoc(carTypeDocRef);

    const modelsQuery = query(collection(db, CAR_MODELS_COLLECTION), where('type', '==', carTypeValue));
    const modelsSnapshot = await getDocs(modelsQuery);
    const batch = writeBatch(db);
    const modelImageDeletions: Promise<void>[] = [];

    modelsSnapshot.forEach((modelDoc) => {
      const modelData = modelDoc.data() as CarModelOptionAdmin;
      if (modelData.publicId) {
        modelImageDeletions.push(deleteImageFromCloudinary(modelData.publicId).catch(e => console.warn(`Failed to delete car model image ${modelData.publicId}, continuing:`, e instanceof Error ? e.message : String(e))));
      }
      batch.delete(modelDoc.ref);
    });

    await Promise.all(modelImageDeletions); 
    await batch.commit(); 
  } catch (error) {
    console.error("Error in deleteCarTypeAdmin:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred while deleting car type.');
  }
}

// --- Car Models ---
export async function getCarModelsAdmin(): Promise<CarModelOptionAdmin[]> {
  try {
    const q = query(collection(db, CAR_MODELS_COLLECTION), orderBy('type', 'asc'), orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CarModelOptionAdmin));
  } catch (error) {
    console.error("Error in getCarModelsAdmin:", error);
     if (error instanceof Error) {
        throw new Error(`Failed to get car models: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching car models.');
  }
}

export async function addCarModelAdmin(
  data: { label: string; type: string; order: number; imageUrlInput: File }
): Promise<void> {
  try {
    const { label, type, order, imageUrlInput } = data;

    const uploadResult = await uploadImageToCloudinary(imageUrlInput, `car_models/${type || 'general'}`);
    const value = slugify(label);

    const dataToSave: Omit<CarModelOptionAdmin, 'id'> = {
      label,
      type,
      order,
      value,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };
    await addDoc(collection(db, CAR_MODELS_COLLECTION), dataToSave);
  } catch (error) {
    console.error("Error in addCarModelAdmin:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred while adding car model.');
  }
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
  try {
    let newImageUrl = data.currentImageUrl;
    let newPublicId = data.currentPublicId;

    const { imageUrlInput, ...updateDataFromForm } = data;

    if (imageUrlInput instanceof File) { 
      if (data.currentPublicId) {
        await deleteImageFromCloudinary(data.currentPublicId).catch(e => console.warn("Failed to delete old car model image, continuing:", e instanceof Error ? e.message : String(e)));
      }
      const uploadResult = await uploadImageToCloudinary(imageUrlInput, `car_models/${updateDataFromForm.type || 'general'}`);
      newImageUrl = uploadResult.secure_url;
      newPublicId = uploadResult.public_id;
    } else if (imageUrlInput === null && data.currentPublicId) {
      await deleteImageFromCloudinary(data.currentPublicId).catch(e => console.warn("Failed to delete car model image for removal, continuing:", e instanceof Error ? e.message : String(e)));
      newImageUrl = '';
      newPublicId = '';
    }

    const docRef = doc(db, CAR_MODELS_COLLECTION, id);
    const updatePayload: Partial<Omit<CarModelOptionAdmin, 'id' >> = {
        ...(updateDataFromForm.label && { label: updateDataFromForm.label }),
        ...(updateDataFromForm.type && { type: updateDataFromForm.type }),
        ...(updateDataFromForm.order !== undefined && { order: updateDataFromForm.order }),
    };

    if (updateDataFromForm.label) {
      const currentDoc = await getDoc(docRef);
      if (currentDoc.exists() && updateDataFromForm.label !== currentDoc.data()?.label) {
        updatePayload.value = slugify(updateDataFromForm.label);
      }
    }
    
    if (newImageUrl !== data.currentImageUrl || newPublicId !== data.currentPublicId) {
      updatePayload.imageUrl = newImageUrl || '';
      updatePayload.publicId = newPublicId || '';
    }
    
    if (Object.keys(updatePayload).length > 0) {
      await updateDoc(docRef, updatePayload as any);
    }
  } catch (error) {
    console.error("Error in updateCarModelAdmin:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred while updating car model.');
  }
}

export async function deleteCarModelAdmin(id: string): Promise<void> {
  try {
    const carModelDocRef = doc(db, CAR_MODELS_COLLECTION, id);
    const carModelDocSnap = await getDoc(carModelDocRef);
    if (carModelDocSnap.exists()) {
      const carModelData = carModelDocSnap.data() as CarModelOptionAdmin;
      if (carModelData.publicId) {
        await deleteImageFromCloudinary(carModelData.publicId).catch(e => console.warn(`Failed to delete car model image ${carModelData.publicId} from Cloudinary, continuing:`, e instanceof Error ? e.message : String(e)));
      }
    }
    await deleteDoc(carModelDocRef);
  } catch (error) {
    console.error("Error in deleteCarModelAdmin:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('An unknown error occurred while deleting car model.');
  }
}

// --- For Booking Form (Client-side data fetching) ---

export async function getCarTypesForBooking(): Promise<Omit<CarTypeOptionAdmin, 'order' | 'id' | 'publicId'>[]> {
  try {
    const q = query(collection(db, CAR_TYPES_COLLECTION), orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        value: data.value, 
        label: data.label,
        imageUrl: data.imageUrl,
      } as Omit<CarTypeOptionAdmin, 'order' | 'id' | 'publicId'>;
    });
  } catch (error) {
     console.error("Error in getCarTypesForBooking:", error);
     return [];
  }
}

export async function getCarModelsForBooking(carTypeValue: string): Promise<Omit<CarModelOptionAdmin, 'order' | 'type'| 'id' | 'publicId'>[]> {
  try {
    if (!carTypeValue) return [];
    const q = query(
      collection(db, CAR_MODELS_COLLECTION),
      where('type', '==', carTypeValue), 
      orderBy('order', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        value: data.value, 
        label: data.label,
        imageUrl: data.imageUrl,
      } as Omit<CarModelOptionAdmin, 'order' | 'type'| 'id' | 'publicId'>;
    });
  } catch (error) {
    console.error("Error in getCarModelsForBooking (type: " + carTypeValue + "):", error);
    return [];
  }
}


// --- Customer Phone Numbers ---
export async function getPhoneNumbersAdmin(): Promise<CustomerContactAdmin[]> {
  try {
    const q = query(collection(db, CUSTOMER_CONTACTS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as CustomerContactAdmin));
  } catch (error) {
    console.error("Error in getPhoneNumbersAdmin:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get phone numbers: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching phone numbers.');
  }
}

export async function deletePhoneNumberAdmin(id: string): Promise<void> {
  try {
    const phoneNumberDocRef = doc(db, CUSTOMER_CONTACTS_COLLECTION, id);
    await deleteDoc(phoneNumberDocRef);
  } catch (error) {
    console.error("Error in deletePhoneNumberAdmin:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete phone number: ${error.message}`);
    }
    throw new Error('An unknown error occurred while deleting phone number.');
  }
}
