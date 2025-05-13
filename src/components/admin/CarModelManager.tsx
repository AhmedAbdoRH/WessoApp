// src/components/admin/CarModelManager.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { CarModelOptionAdmin, CarTypeOptionAdmin } from '@/types/admin';
import { addCarModelAdmin, updateCarModelAdmin, deleteCarModelAdmin } from '@/services/adminService'; // Server Actions
import { useRouter } from 'next/navigation';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
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

const carModelSchema = z.object({
  value: z.string().min(1, 'معرف الموديل مطلوب').max(50, 'المعرف طويل جداً').regex(/^[a-z0-9-]+$/, 'المعرف يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط.'),
  label: z.string().min(1, 'اسم الموديل (بالعربية) مطلوب').max(100, 'الاسم طويل جداً'),
  imageUrl: z.string().url('رابط صورة صالح مطلوب'),
  type: z.string().min(1, 'يجب اختيار نوع السيارة'),
  dataAiHint: z.string().optional(),
  order: z.coerce.number().min(0, 'الترتيب يجب أن يكون 0 أو أكبر'),
});

type CarModelFormData = z.infer<typeof carModelSchema>;

interface CarModelManagerProps {
  initialCarModels: CarModelOptionAdmin[];
  allCarTypes: Pick<CarTypeOptionAdmin, 'value' | 'label'>[]; // To populate dropdown
}

export function CarModelManager({ initialCarModels, allCarTypes }: CarModelManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingCarModel, setEditingCarModel] = useState<CarModelOptionAdmin | null>(null);
  const [carModels, setCarModels] = useState<CarModelOptionAdmin[]>(initialCarModels);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty } } = useForm<CarModelFormData>({
    resolver: zodResolver(carModelSchema),
    defaultValues: {
      value: '',
      label: '',
      imageUrl: '',
      type: '',
      dataAiHint: '',
      order: 0, // Default order, can be improved
    },
  });
  
  useEffect(() => {
    setCarModels(initialCarModels);
    if (!editingCarModel && !showForm) {
        const defaultOrder = initialCarModels.length > 0 ? Math.max(...initialCarModels.map(cm => cm.order)) + 1 : 0;
        reset({ order: defaultOrder, type: allCarTypes[0]?.value || '' });
    }
  }, [initialCarModels, allCarTypes, reset, editingCarModel, showForm]);


  const handleEdit = (carModel: CarModelOptionAdmin) => {
    setEditingCarModel(carModel);
    setValue('value', carModel.value);
    setValue('label', carModel.label);
    setValue('imageUrl', carModel.imageUrl);
    setValue('type', carModel.type);
    setValue('dataAiHint', carModel.dataAiHint || '');
    setValue('order', carModel.order);
    setShowForm(true);
  };

  const resetFormAndState = () => {
    const defaultOrder = carModels.length > 0 ? Math.max(...carModels.map(cm => cm.order)) + 1 : 0;
    reset({
      value: '',
      label: '',
      imageUrl: '',
      type: allCarTypes[0]?.value || '',
      dataAiHint: '',
      order: defaultOrder,
    });
    setEditingCarModel(null);
    setShowForm(false);
  };

  const onSubmit: SubmitHandler<CarModelFormData> = async (data) => {
    startTransition(async () => {
      try {
        if (editingCarModel) {
          // Value (ID) cannot be changed during an update.
          await updateCarModelAdmin(editingCarModel.id!, {
            label: data.label,
            imageUrl: data.imageUrl,
            type: data.type,
            dataAiHint: data.dataAiHint,
            order: data.order,
          });
          toast({ title: 'تم التحديث', description: `تم تحديث موديل السيارة: ${data.label}` });
        } else {
          await addCarModelAdmin(data);
          toast({ title: 'تمت الإضافة', description: `تمت إضافة موديل السيارة: ${data.label}` });
        }
        resetFormAndState();
        router.refresh(); // Reload data
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

  const handleDelete = (id: string, label: string) => {
    startTransition(async () => {
      try {
        await deleteCarModelAdmin(id);
        toast({ title: 'تم الحذف', description: `تم حذف موديل السيارة: ${label}` });
        setCarModels(prev => prev.filter(cm => cm.id !== id)); // Optimistic update
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

  return (
    <div className="space-y-6">
      <Button onClick={() => { 
          setShowForm(true); 
          setEditingCarModel(null); 
          const defaultOrder = carModels.length > 0 ? Math.max(...carModels.map(cm => cm.order)) + 1 : 0;
          reset({ order: defaultOrder, type: allCarTypes[0]?.value || '' });
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
            <Label htmlFor="cm-value">المعرّف (ID - إنجليزي، مثال: toyota-camry)</Label>
            <Input id="cm-value" {...register('value')} disabled={!!editingCarModel} />
            {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
            {!!editingCarModel && <p className="text-xs text-muted-foreground mt-1">لا يمكن تغيير المعرّف بعد الإنشاء.</p>}
          </div>
          <div>
            <Label htmlFor="cm-label">الاسم (بالعربية)</Label>
            <Input id="cm-label" {...register('label')} />
            {errors.label && <p className="text-sm text-destructive mt-1">{errors.label.message}</p>}
          </div>
          <div>
            <Label htmlFor="cm-imageUrl">رابط الصورة</Label>
            <Input id="cm-imageUrl" type="url" {...register('imageUrl')} />
            {errors.imageUrl && <p className="text-sm text-destructive mt-1">{errors.imageUrl.message}</p>}
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
            <Label htmlFor="cm-dataAiHint">وصف للصورة (لـ AI - اختياري)</Label>
            <Input id="cm-dataAiHint" {...register('dataAiHint')} />
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
              <Image src={carModel.imageUrl} alt={carModel.label} width={60} height={40} className="rounded object-cover" data-ai-hint={carModel.dataAiHint || "car model image"}/>
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
                      onClick={() => handleDelete(carModel.id!, carModel.label)}
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
