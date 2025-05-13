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
  allCarTypes: Pick&lt;CarTypeOptionAdmin, 'value' | 'label'&gt;[]; // To populate dropdown
}

export function CarModelManager({ initialCarModels, allCarTypes }: CarModelManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingCarModel, setEditingCarModel] = useState&lt;CarModelOptionAdmin | null&gt;(null);
  const [carModels, setCarModels] = useState&lt;CarModelOptionAdmin[]&gt;(initialCarModels);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isDirty } } = useForm&lt;CarModelFormData&gt;({
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
        const defaultOrder = initialCarModels.length > 0 ? Math.max(...initialCarModels.map(cm =&gt; cm.order)) + 1 : 0;
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
    const defaultOrder = carModels.length > 0 ? Math.max(...carModels.map(cm =&gt; cm.order)) + 1 : 0;
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

  const onSubmit: SubmitHandler&lt;CarModelFormData&gt; = async (data) => {
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
        setCarModels(prev =&gt; prev.filter(cm =&gt; cm.id !== id)); // Optimistic update
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
    &lt;div className="space-y-6"&gt;
      &lt;Button onClick={() =&gt; { 
          setShowForm(true); 
          setEditingCarModel(null); 
          const defaultOrder = carModels.length > 0 ? Math.max(...carModels.map(cm =&gt; cm.order)) + 1 : 0;
          reset({ order: defaultOrder, type: allCarTypes[0]?.value || '' });
        }}  
        className="mb-4 bg-accent hover:bg-accent/90 text-accent-foreground"
        disabled={allCarTypes.length === 0}
        &gt;
        &lt;PlusCircle className="ml-2 h-4 w-4" /&gt; إضافة موديل سيارة جديد
      &lt;/Button&gt;
      {allCarTypes.length === 0 && &lt;p className="text-destructive"&gt;الرجاء إضافة أنواع سيارات أولاً قبل إضافة الموديلات.&lt;/p&gt;}


      {showForm && allCarTypes.length > 0 && (
        &lt;form onSubmit={handleSubmit(onSubmit)} className="space-y-4 admin-form p-4 glass-card mb-6"&gt;
          &lt;h3 className="text-lg font-medium"&gt;{editingCarModel ? 'تعديل موديل السيارة' : 'إضافة موديل سيارة جديد'}&lt;/h3&gt;
          &lt;div&gt;
            &lt;Label htmlFor="cm-value"&gt;المعرّف (ID - إنجليزي، مثال: toyota-camry)&lt;/Label&gt;
            &lt;Input id="cm-value" {...register('value')} disabled={!!editingCarModel} /&gt;
            {errors.value && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.value.message}&lt;/p&gt;}
            {!!editingCarModel && &lt;p className="text-xs text-muted-foreground mt-1"&gt;لا يمكن تغيير المعرّف بعد الإنشاء.&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="cm-label"&gt;الاسم (بالعربية)&lt;/Label&gt;
            &lt;Input id="cm-label" {...register('label')} /&gt;
            {errors.label && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.label.message}&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="cm-imageUrl"&gt;رابط الصورة&lt;/Label&gt;
            &lt;Input id="cm-imageUrl" type="url" {...register('imageUrl')} /&gt;
            {errors.imageUrl && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.imageUrl.message}&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="cm-type"&gt;نوع السيارة&lt;/Label&gt;
            &lt;Controller
              name="type"
              control={control}
              render={({ field }) =&gt; (
                &lt;Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} dir="rtl"&gt;
                  &lt;SelectTrigger id="cm-type"&gt;
                    &lt;SelectValue placeholder="اختر نوع السيارة" /&gt;
                  &lt;/SelectTrigger&gt;
                  &lt;SelectContent&gt;
                    {allCarTypes.map(type =&gt; (
                      &lt;SelectItem key={type.value} value={type.value}&gt;{type.label}&lt;/SelectItem&gt;
                    ))}
                  &lt;/SelectContent&gt;
                &lt;/Select&gt;
              )}
            /&gt;
            {errors.type && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.type.message}&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="cm-dataAiHint"&gt;وصف للصورة (لـ AI - اختياري)&lt;/Label&gt;
            &lt;Input id="cm-dataAiHint" {...register('dataAiHint')} /&gt;
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="cm-order"&gt;ترتيب العرض&lt;/Label&gt;
            &lt;Input id="cm-order" type="number" {...register('order')} /&gt;
            {errors.order && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.order.message}&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div className="flex gap-2"&gt;
            &lt;Button type="submit" disabled={isPending || !isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground"&gt;
              {isPending ? 'جاري الحفظ...' : (editingCarModel ? 'حفظ التعديلات' : 'إضافة الموديل')}
            &lt;/Button&gt;
            &lt;Button type="button" variant="outline" onClick={resetFormAndState} disabled={isPending}&gt;
              إلغاء
            &lt;/Button&gt;
          &lt;/div&gt;
        &lt;/form&gt;
      )}

      &lt;div className="admin-item-list"&gt;
        {carModels.length === 0 && !showForm && &lt;p&gt;لا توجد موديلات سيارات معرفة حالياً.&lt;/p&gt;}
        {carModels.map((carModel) =&gt; (
          &lt;div key={carModel.id} className="admin-item"&gt;
             &lt;div className="flex items-center gap-4"&gt;
              &lt;Image src={carModel.imageUrl} alt={carModel.label} width={60} height={40} className="rounded object-cover" data-ai-hint={carModel.dataAiHint || "car model image"}/&gt;
              &lt;div&gt;
                &lt;p className="font-semibold"&gt;{carModel.label} &lt;span className="text-xs text-muted-foreground"&gt;({carModel.value})&lt;/span&gt;&lt;/p&gt;
                &lt;p className="text-xs text-muted-foreground"&gt;النوع: {allCarTypes.find(t =&gt; t.value === carModel.type)?.label || carModel.type} | الترتيب: {carModel.order}&lt;/p&gt;
              &lt;/div&gt;
            &lt;/div&gt;
            &lt;div className="admin-item-actions"&gt;
              &lt;Button variant="ghost" size="sm" onClick={() =&gt; handleEdit(carModel)} aria-label="تعديل"&gt;
                &lt;Edit className="h-4 w-4" /&gt;
              &lt;/Button&gt;
               &lt;AlertDialog&gt;
                &lt;AlertDialogTrigger asChild&gt;
                  &lt;Button variant="ghost" size="sm" className="text-destructive" aria-label="حذف"&gt;
                    &lt;Trash2 className="h-4 w-4" /&gt;
                  &lt;/Button&gt;
                &lt;/AlertDialogTrigger&gt;
                &lt;AlertDialogContent&gt;
                  &lt;AlertDialogHeader&gt;
                    &lt;AlertDialogTitle&gt;هل أنت متأكد?&lt;/AlertDialogTitle&gt;
                    &lt;AlertDialogDescription&gt;
                      سيتم حذف موديل السيارة "{carModel.label}". لا يمكن التراجع عن هذا الإجراء.
                    &lt;/AlertDialogDescription&gt;
                  &lt;/AlertDialogHeader&gt;
                  &lt;AlertDialogFooter&gt;
                    &lt;AlertDialogCancel&gt;إلغاء&lt;/AlertDialogCancel&gt;
                    &lt;AlertDialogAction
                      onClick={() =&gt; handleDelete(carModel.id!, carModel.label)}
                      disabled={isPending}
                       className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    &gt;
                       {isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
                    &lt;/AlertDialogAction&gt;
                  &lt;/AlertDialogFooter&gt;
                &lt;/AlertDialogContent&gt;
              &lt;/AlertDialog&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        ))}
      &lt;/div&gt;
    &lt;/div&gt;
  );
}