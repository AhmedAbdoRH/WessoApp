// src/components/admin/AppConfigManager.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { AppConfig } from '@/types/admin';
import { updateAppConfigAdmin } from '@/services/adminService'; // Server Action
import { useRouter } from 'next/navigation';

const appConfigSchema = z.object({
  appName: z.string().min(1, 'اسم التطبيق مطلوب').max(50, 'اسم التطبيق طويل جداً'),
});

type AppConfigFormData = z.infer<typeof appConfigSchema>;

interface AppConfigManagerProps {
  initialConfig: AppConfig | null;
}

export function AppConfigManager({ initialConfig }: AppConfigManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<AppConfigFormData>({
    resolver: zodResolver(appConfigSchema),
    defaultValues: {
      appName: initialConfig?.appName || 'ClearRide',
    },
  });

  const onSubmit: SubmitHandler<AppConfigFormData> = async (data) => {
    startTransition(async () => {
      try {
        const formDataToServer = new FormData();
        formDataToServer.append('appName', data.appName);
        
        // Logo management is removed, only appName is updated.
        // The logo URL is now hardcoded in src/app/page.tsx.
        // The logoUrl and logoPublicId fields in Firestore will no longer be updated by this admin panel for the logo.

        await updateAppConfigAdmin(formDataToServer);
        
        toast({
          title: 'تم الحفظ بنجاح',
          description: 'تم تحديث اسم التطبيق.',
        });
        router.refresh(); // Refresh server components
      } catch (error) {
        console.error('Failed to update app config:', error);
        toast({
          title: 'خطأ في الحفظ',
          description: 'لم نتمكن من تحديث اسم التطبيق. ' + (error instanceof Error ? error.message : ''),
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 admin-form">
      <div>
        <Label htmlFor="appName">اسم التطبيق</Label>
        <Input
          id="appName"
          {...register('appName')}
          placeholder="أدخل اسم التطبيق"
        />
        {errors.appName && <p className="text-sm text-destructive mt-1">{errors.appName.message}</p>}
      </div>

      {/* Logo management UI removed */}

      <Button type="submit" disabled={isPending || !isDirty}>
        {isPending ? 'جاري الحفظ...' : 'حفظ اسم التطبيق'}
      </Button>
    </form>
  );
}
