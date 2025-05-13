
// src/components/admin/CarModelManager.tsx
'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { CarModelOptionAdmin, CarTypeOptionAdmin } from '@/types/admin';
import { addCarModelAdmin, updateCarModelAdmin, deleteCarModelAdmin } from '@/services/adminService';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, PlusCircle, UploadCloud, XCircle } from 'lucide-react';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const carModelFormSchema = z.object({
  label: z.string().min(1, 'اسم الموديل (بالعربية) مطلوب').max(100, 'الاسم طويل جداً'),
  imageUrlInput: z.any().optional(), // Changed from z.instanceof(FileList)
  existingImageUrl: z.string().url().optional().or(z.literal('')),
  existingPublicId: z.string().optional().or(z.literal('')), // For Cloudinary public_id
  type: z.string().min(1, 'يجب اختيار نوع السيارة'),
  order: z.coerce.number().min(0, 'الترتيب يجب أن يكون 0 أو أكبر'),
}).refine(data => {
  // FileList is a browser API, check for its existence before using instanceof
  const hasNewFile = typeof FileList !== 'undefined' && data.imageUrlInput instanceof FileList && data.imageUrlInput.length > 0;
  const hasExistingImage = !!data.existingImageUrl;
  return hasNewFile || hasExistingImage;
}, {
  message: "الرجاء اختيار صورة جديدة أو التأكد من وجود صورة حالية.",
  path: ["imageUrlInput"],
});

type CarModelFormData = z.infer<typeof carModelFormSchema>;

interface CarModelManagerProps {
  initialCarModels: CarModelOptionAdmin[];
  allCarTypes: Pick<CarTypeOptionAdmin, 'value' | 'label'>[];
}

export function CarModelManager({ initialCarModels, allCarTypes }: CarModelManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingCarModel, setEditingCarModel] = useState<CarModelOptionAdmin | null>(null);
  const [carModels, setCarModels] = useState<CarModelOptionAdmin[]>(initialCarModels);
  const [showForm, setShowForm] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors, isDirty } } = useForm<CarModelFormData>({
    resolver: zodResolver(carModelFormSchema),
    defaultValues: {
      label: '',
      existingImageUrl: '',
      existingPublicId: '',
      type: '',
      order: 0,
      imageUrlInput: undefined,
    },
  });

  const watchedImageUrlInput = watch('imageUrlInput');
  const watchedExistingImageUrl = watch('existingImageUrl');
  
  const { ref: imageInputRegisterRef, ...imageInputProps } = register('imageUrlInput');

  useEffect(() => {
    if (watchedImageUrlInput && watchedImageUrlInput.length > 0 && watchedImageUrlInput[0] instanceof File) {
      const file = watchedImageUrlInput[0];
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    } else if (watchedExistingImageUrl) {
      setImagePreviewUrl(watchedExistingImageUrl);
    } else {
      setImagePreviewUrl(null);
    }
  }, [watchedImageUrlInput, watchedExistingImageUrl]);

  const handleEdit = (carModel: CarModelOptionAdmin) => {
    setEditingCarModel(carModel);
    setValue('label', carModel.label);
    setValue('existingImageUrl', carModel.imageUrl || '');
    setValue('existingPublicId', carModel.publicId || '');
    setValue('imageUrlInput', undefined);
    setValue('type', carModel.type);
    setValue('order', carModel.order);
    setShowForm(true);
    setImagePreviewUrl(carModel.imageUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear file input
    }
  };
  
  const handleClearImage = () => {
    setValue('imageUrlInput', undefined);
    setValue('existingImageUrl', '');
    setValue('existingPublicId', '');
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    setImagePreviewUrl(null);
  };

  const resetFormAndState = () => {
    const defaultOrder = carModels.length > 0 ? Math.max(...carModels.map(cm => cm.order)) + 1 : 0;
    reset({
      label: '',
      imageUrlInput: undefined,
      existingImageUrl: '',
      existingPublicId: '',
      type: allCarTypes[0]?.value || '',
      order: defaultOrder,
    });
    setEditingCarModel(null);
    setShowForm(false);
    setImagePreviewUrl(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const onSubmit: SubmitHandler<CarModelFormData> = async (data) => {
    startTransition(async () => {
      try {
        const imageFile = data.imageUrlInput && data.imageUrlInput.length > 0 && data.imageUrlInput[0] instanceof File ? data.imageUrlInput[0] : null;

        if (editingCarModel) {
          if (!imageFile && !data.existingImageUrl) {
            toast({ title: 'خطأ في الصورة', description: 'يجب توفير صورة للمتابعة أو الإبقاء على الصورة الحالية.', variant: 'destructive' });
            return;
          }
          await updateCarModelAdmin(editingCarModel.id!, { 
            label: data.label,
            type: data.type,
            order: data.order,
            imageUrlInput: imageFile,
            currentImageUrl: editingCarModel.imageUrl,
            currentPublicId: editingCarModel.publicId,
          });
          toast({ title: 'تم التحديث', description: `تم تحديث موديل السيارة: ${data.label}` });
        } else {
          if (!imageFile) {
            toast({ title: 'خطأ في الصورة', description: 'الرجاء اختيار ملف صورة لإضافته.', variant: 'destructive' });
            return;
          }
          await addCarModelAdmin({
            label: data.label,
            type: data.type,
            order: data.order,
            imageUrlInput: imageFile, 
          });
          toast({ title: 'تمت الإضافة', description: `تمت إضافة موديل السيارة: ${data.label}` });
        }
        resetFormAndState();
        router.refresh();
      } catch (error) {
        console.error('Failed to save car model:', error);
        toast({
          title: 'خطأ في الحفظ',
          description: (error instanceof Error ? error.message : 'فشل حفظ موديل السيارة.'),
          variant: 'destructive',
        });
      }
    });
  };

  const handleDelete = (carModel: CarModelOptionAdmin) => {
    startTransition(async () => {
      try {
        await deleteCarModelAdmin(carModel.id!);
        toast({ title: 'تم الحذف', description: `تم حذف موديل السيارة: ${carModel.label}` });
        router.refresh();
      } catch (error) {
        console.error('Failed to delete car model:', error);
        toast({
          title: 'خطأ في الحذف',
          description: (error instanceof Error ? error.message : 'فشل حذف موديل السيارة.'),
          variant: 'destructive',
        });
      }
    });
  };
  
  useEffect(() => {
    setCarModels(initialCarModels);
    if (!editingCarModel && !showForm) {
        const defaultOrder = initialCarModels.length > 0 ? Math.max(...initialCarModels.map(cm => cm.order)) + 1 : 0;
        reset({ 
            label: '',
            imageUrlInput: undefined,
            existingImageUrl: '',
            existingPublicId: '',
            type: allCarTypes[0]?.value || '', 
            order: defaultOrder 
        });
    }
  }, [initialCarModels, allCarTypes, reset, editingCarModel, showForm]);


  return (
    <div className="space-y-6">
      <Button onClick={() => { 
          setShowForm(true); 
          setEditingCarModel(null); 
          const defaultOrder = carModels.length > 0 ? Math.max(...carModels.map(cm => cm.order)) + 1 : 0;
          reset({ 
            label: '',
            imageUrlInput: undefined,
            existingImageUrl: '',
            existingPublicId: '',
            type: allCarTypes[0]?.value || '',
            order: defaultOrder 
            });
          setImagePreviewUrl(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Clear file input
          }
        }}  
        className="mb-4 bg-accent hover:bg-accent/90 text-accent-foreground"
        disabled={allCarTypes.length === 0}
        >
        <PlusCircle className="ml-2 h-4 w-4" /> إضافة موديل سيارة جديد
      </Button>
      {allCarTypes.length === 0 && <p className="text-destructive">الرجاء إضافة أنواع سيارات أولاً قبل إضافة الموديلات.</p>}


      {showForm && allCarTypes.length > 0 && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 admin-form p-4 glass-card mb-6">
          <h3 className="text-lg font-medium">{editingCarModel ? 'تعديل موديل السيارة' : 'إضافة موديل سيارة جديد'}</h3>
          <div>
            <Label htmlFor="cm-label">الاسم (بالعربية)</Label>
            <Input id="cm-label" {...register('label')} />
            {errors.label && <p className="text-sm text-destructive mt-1">{errors.label.message}</p>}
          </div>

          <div>
            <Label htmlFor="cm-imageUrlInput">صورة الموديل</Label>
             <div className="flex items-center gap-4">
                {imagePreviewUrl && (
                    <div className="relative w-24 h-16 rounded border border-muted overflow-hidden">
                        <Image src={imagePreviewUrl} alt="معاينة الصورة" layout="fill" objectFit="cover" />
                    </div>
                )}
                 {!imagePreviewUrl && (
                    <div className="w-24 h-16 rounded border border-dashed border-muted flex items-center justify-center bg-muted/20">
                        <UploadCloud className="w-8 h-8 text-muted-foreground" />
                    </div>
                )}
                <Input 
                    id="cm-imageUrlInput" 
                    type="file" 
                    accept="image/*" 
                    {...imageInputProps} 
                    ref={(e) => { 
                        imageInputRegisterRef(e); 
                        fileInputRef.current = e; 
                    }}
                    className="flex-grow"
                />
                {(imagePreviewUrl || (watchedImageUrlInput && watchedImageUrlInput.length > 0)) && (
                     <Button type="button" variant="ghost" size="sm" onClick={handleClearImage} aria-label="مسح الصورة">
                        <XCircle className="w-5 h-5 text-destructive"/>
                    </Button>
                )}
            </div>
            <input type="hidden" {...register('existingImageUrl')} />
            <input type="hidden" {...register('existingPublicId')} />
            {errors.imageUrlInput && <p className="text-sm text-destructive mt-1">{errors.imageUrlInput.message}</p>}
            {editingCarModel && !imagePreviewUrl && !(watchedImageUrlInput && watchedImageUrlInput.length >0) && (
              <p className="text-xs text-muted-foreground mt-1">اترك حقل الملف فارغًا للاحتفاظ بالصورة الحالية: {editingCarModel.label}.</p>
            )}
          </div>

          <div>
            <Label htmlFor="cm-type">نوع السيارة</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} dir="rtl">
                  <SelectTrigger id="cm-type">
                    <SelectValue placeholder="اختر نوع السيارة" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCarTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
          </div>
          <div>
            <Label htmlFor="cm-order">ترتيب العرض</Label>
            <Input id="cm-order" type="number" {...register('order')} />
            {errors.order && <p className="text-sm text-destructive mt-1">{errors.order.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isPending ? 'جاري الحفظ...' : (editingCarModel ? 'حفظ التعديلات' : 'إضافة الموديل')}
            </Button>
            <Button type="button" variant="outline" onClick={resetFormAndState} disabled={isPending}>
              إلغاء
            </Button>
          </div>
        </form>
      )}

      <div className="admin-item-list">
        {carModels.length === 0 && !showForm && <p>لا توجد موديلات سيارات معرفة حالياً.</p>}
        {carModels.map((carModel) => (
          <div key={carModel.id} className="admin-item">
             <div className="flex items-center gap-4">
              {carModel.imageUrl ? (
                <Image src={carModel.imageUrl} alt={carModel.label} width={60} height={40} className="rounded object-cover" data-ai-hint={"car model image"}/>
              ) : (
                 <div className="w-[60px] h-[40px] rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">لا توجد صورة</div>
              )}
              <div>
                <p className="font-semibold">{carModel.label} <span className="text-xs text-muted-foreground">({carModel.value})</span></p>
                <p className="text-xs text-muted-foreground">النوع: {allCarTypes.find(t => t.value === carModel.type)?.label || carModel.type} | الترتيب: {carModel.order}</p>
              </div>
            </div>
            <div className="admin-item-actions">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(carModel)} aria-label="تعديل">
                <Edit className="h-4 w-4" />
              </Button>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive" aria-label="حذف">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد?</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف موديل السيارة "{carModel.label}". لا يمكن التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(carModel)}
                      disabled={isPending}
                       className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                       {isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
