// src/components/admin/PhoneNumberManager.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { CustomerContactAdmin } from '@/types/admin';
import { deletePhoneNumberAdmin, getPhoneNumbersAdmin } from '@/services/adminService'; // Server Actions
import { useRouter } from 'next/navigation';
import { Trash2, RefreshCw } from 'lucide-react';
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

interface PhoneNumberManagerProps {
  initialPhoneNumbers: CustomerContactAdmin[];
}

export function PhoneNumberManager({ initialPhoneNumbers }: PhoneNumberManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [phoneNumbers, setPhoneNumbers] = useState<CustomerContactAdmin[]>(initialPhoneNumbers);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setPhoneNumbers(initialPhoneNumbers);
  }, [initialPhoneNumbers]);

  const handleDelete = (phoneNumberEntry: CustomerContactAdmin) => {
    startTransition(async () => {
      try {
        await deletePhoneNumberAdmin(phoneNumberEntry.id);
        toast({ title: 'تم الحذف بنجاح', description: `تم حذف رقم الهاتف: ${phoneNumberEntry.phoneNumber}` });
        // Refresh the list from the server to ensure consistency
        await fetchPhoneNumbers();
      } catch (error) {
        console.error('Failed to delete phone number:', error);
        toast({
          title: 'خطأ في الحذف',
          description: (error instanceof Error ? error.message : 'فشل حذف رقم الهاتف.'),
          variant: 'destructive',
        });
      }
    });
  };

  const fetchPhoneNumbers = async () => {
    setIsFetching(true);
    try {
      const updatedPhoneNumbers = await getPhoneNumbersAdmin();
      setPhoneNumbers(updatedPhoneNumbers);
      router.refresh(); // To ensure server components dependent on this data also refresh if any
    } catch (error) {
      toast({
        title: 'خطأ في تحديث القائمة',
        description: 'لم نتمكن من جلب أحدث قائمة بأرقام الهواتف.',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-foreground">قائمة أرقام هواتف العملاء</h3>
        <Button onClick={fetchPhoneNumbers} disabled={isFetching || isPending} variant="outline" size="sm" className="glass-button">
          <RefreshCw className={`ml-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          تحديث القائمة
        </Button>
      </div>
      {phoneNumbers.length === 0 ? (
        <p className="text-muted-foreground">لا توجد أرقام هواتف مسجلة حالياً.</p>
      ) : (
        <div className="admin-item-list space-y-3">
          {phoneNumbers.map((entry) => (
            <div key={entry.id} className="admin-item">
              <div className="flex-grow">
                <p className="font-medium text-foreground">{entry.firstName} - <span dir="ltr" className="text-sm">{entry.phoneNumber}</span></p>
                <p className="text-xs text-muted-foreground">
                  تاريخ الإضافة: {new Date(entry.createdAt).toLocaleString('ar-EG', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="admin-item-actions">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive" aria-label="حذف الرقم" disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>هل أنت متأكد?</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم حذف رقم الهاتف الخاص بالعميل "{entry.firstName} - {entry.phoneNumber}". لا يمكن التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(entry)}
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
      )}
    </div>
  );
}
