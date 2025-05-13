// src/components/admin/CarTypeManager.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { CarTypeOptionAdmin } from '@/types/admin';
import { addCarTypeAdmin, updateCarTypeAdmin, deleteCarTypeAdmin } from '@/services/adminService'; // Server Actions
import { useRouter } from 'next/navigation';
import { Trash2, Edit, PlusCircle, Ban } from 'lucide-react';
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
  const [editingCarType, setEditingCarType] = useState<CarTypeOptionAdmin | null>(null);
  const [carTypes, setCarTypes] = useState<CarTypeOptionAdmin[]>(initialCarTypes);
  const [showForm, setShowForm] = useState(false);


  const { register, handleSubmit, reset, setValue, formState: { errors, isDirty } } = useForm<CarTypeFormData>({
    resolver: zodResolver(carTypeSchema),
    defaultValues: {
      value: '',
      label: '',
      imageUrl: '',
      dataAiHint: '',
      order: carTypes.length > 0 ? Math.max(...carTypes.map(ct => ct.order)) + 1 : 0,
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
    reset({
      value: '',
      label: '',
      imageUrl: '',
      dataAiHint: '',
      order: carTypes.length > 0 ? Math.max(...carTypes.map(ct => ct.order)) + 1 : 0,
    });
    setEditingCarType(null);
    setShowForm(false);
  };

  const onSubmit: SubmitHandler<CarTypeFormData> = async (data) => {
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
        setCarTypes(prev => prev.filter(ct => ct.id !== id)); // Optimistic update
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
  
  // Update local state if initialCarTypes prop changes (e.g. after router.refresh())
  React.useEffect(() => {
    setCarTypes(initialCarTypes);
     if (!editingCarType && !showForm) { // Only reset order if not actively editing or adding
        reset({ order: initialCarTypes.length > 0 ? Math.max(...initialCarTypes.map(ct => ct.order)) + 1 : 0 });
    }
  }, [initialCarTypes, reset, editingCarType, showForm]);


  return (
    <div className="space-y-6">
      <Button onClick={() => { setShowForm(true); setEditingCarType(null); reset({ order: carTypes.length > 0 ? Math.max(...carTypes.map(ct => ct.order)) + 1 : 0 }); }} className="mb-4 bg-primary hover:bg-primary/90">
        <PlusCircle className="ml-2 h-4 w-4" /> إضافة نوع سيارة جديد
      </Button>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 admin-form p-4 glass-card mb-6">
          <h3 className="text-lg font-medium">{editingCarType ? 'تعديل نوع السيارة' : 'إضافة نوع سيارة جديد'}</h3>
          <div>
            <Label htmlFor="ct-value">المعرّف (ID - إنجليزي، مثال: sedan)</Label>
            <Input id="ct-value" {...register('value')} disabled={!!editingCarType} />
            {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
             {!!editingCarType && <p className="text-xs text-muted-foreground mt-1">لا يمكن تغيير المعرّف بعد الإنشاء.</p>}
          </div>
          <div>
            <Label htmlFor="ct-label">الاسم (بالعربية)</Label>
            <Input id="ct-label" {...register('label')} />
            {errors.label && <p className="text-sm text-destructive mt-1">{errors.label.message}</p>}
          </div>
          <div>
            <Label htmlFor="ct-imageUrl">رابط الصورة</Label>
            <Input id="ct-imageUrl" type="url" {...register('imageUrl')} />
            {errors.imageUrl && <p className="text-sm text-destructive mt-1">{errors.imageUrl.message}</p>}
          </div>
          <div>
            <Label htmlFor="ct-dataAiHint">وصف للصورة (لـ AI - اختياري)</Label>
            <Input id="ct-dataAiHint" {...register('dataAiHint')} />
          </div>
          <div>
            <Label htmlFor="ct-order">ترتيب العرض</Label>
            <Input id="ct-order" type="number" {...register('order')} />
            {errors.order && <p className="text-sm text-destructive mt-1">{errors.order.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? 'جاري الحفظ...' : (editingCarType ? 'حفظ التعديلات' : 'إضافة النوع')}
            </Button>
            <Button type="button" variant="outline" onClick={resetFormAndState} disabled={isPending}>
              إلغاء
            </Button>
          </div>
        </form>
      )}

      <div className="admin-item-list">
        {carTypes.length === 0 && !showForm && <p>لا توجد أنواع سيارات معرفة حالياً.</p>}
        {carTypes.map((carType) => (
          <div key={carType.id} className="admin-item">
            <div className="flex items-center gap-4">
              <Image src={carType.imageUrl} alt={carType.label} width={60} height={40} className="rounded object-cover" data-ai-hint={carType.dataAiHint || "car image"}/>
              <div>
                <p className="font-semibold">{carType.label} <span className="text-xs text-muted-foreground">({carType.value})</span></p>
                <p className="text-xs text-muted-foreground">الترتيب: {carType.order}</p>
              </div>
            </div>
            <div className="admin-item-actions">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(carType)} aria-label="تعديل">
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" aria-label="حذف">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد?</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف نوع السيارة "{carType.label}" وجميع موديلات السيارات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(carType.id!, carType.label)}
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
