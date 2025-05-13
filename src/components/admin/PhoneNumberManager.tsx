// src/components/admin/PhoneNumberManager.tsx
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { CustomerContactAdmin } from '@/types/admin';
import { deletePhoneNumberAdmin, getPhoneNumbersAdmin } from '@/services/adminService'; // Server Actions
import { useRouter } from 'next/navigation';
import { Trash2, RefreshCw, Download } from 'lucide-react'; // Added Download icon
import { format } from 'date-fns'; // For CSV date formatting
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
      router.refresh(); 
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

  const exportToCsv = () => {
    if (phoneNumbers.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", description: "قائمة أرقام الهواتف فارغة.", variant: "default" });
      return;
    }

    const csvHeaders = ["الاسم الأول", "رقم الهاتف", "تاريخ الإضافة"];
    const csvRows = phoneNumbers.map(entry => [
      entry.firstName,
      entry.phoneNumber,
      format(new Date(entry.createdAt), "yyyy-MM-dd HH:mm:ss") // Format date
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF for BOM to support Arabic in Excel
    csvContent += csvHeaders.join(",") + "\r\n";
    csvRows.forEach(rowArray => {
      const row = rowArray.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","); // Handle commas and quotes in fields
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customer_contacts.csv");
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);

    toast({ title: "تم التصدير بنجاح", description: "تم تنزيل ملف CSV بنجاح.", variant: "default" });
  };


  return (
    <div className="space-y-6">
       <div className="flex flex-wrap justify-between items-center gap-4">
        <h3 className="text-xl font-semibold text-foreground">قائمة أرقام هواتف العملاء</h3>
        <div className="flex gap-2">
          <Button onClick={fetchPhoneNumbers} disabled={isFetching || isPending} variant="outline" size="sm" className="glass-button">
            <RefreshCw className={`ml-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            تحديث القائمة
          </Button>
           <Button onClick={exportToCsv} disabled={phoneNumbers.length === 0 || isPending} variant="outline" size="sm" className="glass-button bg-primary/80 hover:bg-primary text-primary-foreground">
            <Download className="ml-2 h-4 w-4" />
            تصدير إلى CSV
          </Button>
        </div>
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
