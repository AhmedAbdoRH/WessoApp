// src/components/admin/CarTypeManager.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { CarTypeOptionAdmin } from '@/types/admin';
import { addCarTypeAdmin, updateCarTypeAdmin, deleteCarTypeAdmin } from '@/services/adminService'; // Server Actions
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

const carTypeSchema = z.object({
  value: z.string().min(1, 'معرف النوع مطلوب (مثال: sedan)').max(50, 'المعرف طويل جداً').regex(/^[a-z0-9-]+$/, 'المعرف يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط.'),
  label: z.string().min(1, 'اسم النوع (بالعربية) مطلوب').max(100, 'الاسم طويل جداً'),
  imageUrl: z.string().url('رابط صورة صالح مطلوب'),
  dataAiHint: z.string().optional(),
  order: z.coerce.number().min(0, 'الترتيب يجب أن يكون 0 أو أكبر'),
});

type CarTypeFormData = z.infer<typeof carTypeSchema>;

interface CarTypeManagerProps {
  initialCarTypes: CarTypeOptionAdmin[];
}

export function CarTypeManager({ initialCarTypes }: CarTypeManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingCarType, setEditingCarType] = useState&lt;CarTypeOptionAdmin | null&gt;(null);
  const [carTypes, setCarTypes] = useState&lt;CarTypeOptionAdmin[]&gt;(initialCarTypes);
  const [showForm, setShowForm] = useState(false);


  const { register, handleSubmit, reset, setValue, formState: { errors, isDirty } } = useForm&lt;CarTypeFormData&gt;({
    resolver: zodResolver(carTypeSchema),
    defaultValues: {
      value: '',
      label: '',
      imageUrl: '',
      dataAiHint: '',
      order: 0, // Will be updated in useEffect
    },
  });

  const handleEdit = (carType: CarTypeOptionAdmin) => {
    setEditingCarType(carType);
    setValue('value', carType.value);
    setValue('label', carType.label);
    setValue('imageUrl', carType.imageUrl);
    setValue('dataAiHint', carType.dataAiHint || '');
    setValue('order', carType.order);
    setShowForm(true);
  };

  const resetFormAndState = () => {
    const defaultOrder = carTypes.length > 0 ? Math.max(...carTypes.map(ct =&gt; ct.order)) + 1 : 0;
    reset({
      value: '',
      label: '',
      imageUrl: '',
      dataAiHint: '',
      order: defaultOrder,
    });
    setEditingCarType(null);
    setShowForm(false);
  };

  const onSubmit: SubmitHandler&lt;CarTypeFormData&gt; = async (data) => {
    startTransition(async () => {
      try {
        if (editingCarType) {
          // Value (ID) cannot be changed during an update.
          await updateCarTypeAdmin(editingCarType.id!, {
            label: data.label,
            imageUrl: data.imageUrl,
            dataAiHint: data.dataAiHint,
            order: data.order,
          });
          toast({ title: 'تم التحديث', description: `تم تحديث نوع السيارة: ${data.label}` });
        } else {
          await addCarTypeAdmin(data);
          toast({ title: 'تمت الإضافة', description: `تمت إضافة نوع السيارة: ${data.label}` });
        }
        resetFormAndState();
        router.refresh(); // Reload data on the page
      } catch (error) {
        console.error('Failed to save car type:', error);
        toast({
          title: 'خطأ في الحفظ',
          description: (error instanceof Error ? error.message : 'فشل حفظ نوع السيارة.'),
          variant: 'destructive',
        });
      }
    });
  };

  const handleDelete = (id: string, label: string) => {
    startTransition(async () => {
      try {
        await deleteCarTypeAdmin(id);
        toast({ title: 'تم الحذف', description: `تم حذف نوع السيارة: ${label}` });
        // Optimistic update handled by router.refresh() which re-fetches initialCarTypes
        router.refresh();
      } catch (error) {
        console.error('Failed to delete car type:', error);
        toast({
          title: 'خطأ في الحذف',
          description: (error instanceof Error ? error.message : 'فشل حذف نوع السيارة.'),
          variant: 'destructive',
        });
      }
    });
  };
  
  useEffect(() => {
    setCarTypes(initialCarTypes);
     if (!editingCarType && !showForm) { 
        const defaultOrder = initialCarTypes.length > 0 ? Math.max(...initialCarTypes.map(ct =&gt; ct.order)) + 1 : 0;
        reset({ 
            value: '', 
            label: '', 
            imageUrl: '', 
            dataAiHint: '', 
            order: defaultOrder 
        });
    }
  }, [initialCarTypes, reset, editingCarType, showForm]);


  return (
    &lt;div className="space-y-6"&gt;
      &lt;Button onClick={() =&gt; { 
          setShowForm(true); 
          setEditingCarType(null); 
          const defaultOrder = carTypes.length > 0 ? Math.max(...carTypes.map(ct =&gt; ct.order)) + 1 : 0;
          reset({ 
              value: '', 
              label: '', 
              imageUrl: '', 
              dataAiHint: '', 
              order: defaultOrder 
          });
      }} className="mb-4 bg-accent hover:bg-accent/90 text-accent-foreground"&gt;
        &lt;PlusCircle className="ml-2 h-4 w-4" /&gt; إضافة نوع سيارة جديد
      &lt;/Button&gt;

      {showForm && (
        &lt;form onSubmit={handleSubmit(onSubmit)} className="space-y-4 admin-form p-4 glass-card mb-6"&gt;
          &lt;h3 className="text-lg font-medium"&gt;{editingCarType ? 'تعديل نوع السيارة' : 'إضافة نوع سيارة جديد'}&lt;/h3&gt;
          &lt;div&gt;
            &lt;Label htmlFor="ct-value"&gt;المعرّف (ID - إنجليزي، مثال: sedan)&lt;/Label&gt;
            &lt;Input id="ct-value" {...register('value')} disabled={!!editingCarType} /&gt;
            {errors.value && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.value.message}&lt;/p&gt;}
             {!!editingCarType && &lt;p className="text-xs text-muted-foreground mt-1"&gt;لا يمكن تغيير المعرّف بعد الإنشاء.&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="ct-label"&gt;الاسم (بالعربية)&lt;/Label&gt;
            &lt;Input id="ct-label" {...register('label')} /&gt;
            {errors.label && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.label.message}&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="ct-imageUrl"&gt;رابط الصورة&lt;/Label&gt;
            &lt;Input id="ct-imageUrl" type="url" {...register('imageUrl')} /&gt;
            {errors.imageUrl && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.imageUrl.message}&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="ct-dataAiHint"&gt;وصف للصورة (لـ AI - اختياري)&lt;/Label&gt;
            &lt;Input id="ct-dataAiHint" {...register('dataAiHint')} /&gt;
          &lt;/div&gt;
          &lt;div&gt;
            &lt;Label htmlFor="ct-order"&gt;ترتيب العرض&lt;/Label&gt;
            &lt;Input id="ct-order" type="number" {...register('order')} /&gt;
            {errors.order && &lt;p className="text-sm text-destructive mt-1"&gt;{errors.order.message}&lt;/p&gt;}
          &lt;/div&gt;
          &lt;div className="flex gap-2"&gt;
            &lt;Button type="submit" disabled={isPending || !isDirty} className="bg-accent hover:bg-accent/90 text-accent-foreground"&gt;
              {isPending ? 'جاري الحفظ...' : (editingCarType ? 'حفظ التعديلات' : 'إضافة النوع')}
            &lt;/Button&gt;
            &lt;Button type="button" variant="outline" onClick={resetFormAndState} disabled={isPending}&gt;
              إلغاء
            &lt;/Button&gt;
          &lt;/div&gt;
        &lt;/form&gt;
      )}

      &lt;div className="admin-item-list"&gt;
        {carTypes.length === 0 && !showForm && &lt;p&gt;لا توجد أنواع سيارات معرفة حالياً.&lt;/p&gt;}
        {carTypes.map((carType) =&gt; (
          &lt;div key={carType.id} className="admin-item"&gt;
            &lt;div className="flex items-center gap-4"&gt;
              &lt;Image src={carType.imageUrl} alt={carType.label} width={60} height={40} className="rounded object-cover" data-ai-hint={carType.dataAiHint || "car image"}/&gt;
              &lt;div&gt;
                &lt;p className="font-semibold"&gt;{carType.label} &lt;span className="text-xs text-muted-foreground"&gt;({carType.value})&lt;/span&gt;&lt;/p&gt;
                &lt;p className="text-xs text-muted-foreground"&gt;الترتيب: {carType.order}&lt;/p&gt;
              &lt;/div&gt;
            &lt;/div&gt;
            &lt;div className="admin-item-actions"&gt;
              &lt;Button variant="ghost" size="sm" onClick={() =&gt; handleEdit(carType)} aria-label="تعديل"&gt;
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
                      سيتم حذف نوع السيارة "{carType.label}" وجميع موديلات السيارات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
                    &lt;/AlertDialogDescription&gt;
                  &lt;/AlertDialogHeader&gt;
                  &lt;AlertDialogFooter&gt;
                    &lt;AlertDialogCancel&gt;إلغاء&lt;/AlertDialogCancel&gt;
                    &lt;AlertDialogAction
                      onClick={() =&gt; handleDelete(carType.id!, carType.label)}
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