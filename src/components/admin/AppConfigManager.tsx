// src/components/admin/AppConfigManager.tsx
'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
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
import Image from 'next/image';
import { UploadCloud, XCircle } from 'lucide-react';

const appConfigSchema = z.object({
  appName: z.string().min(1, 'اسم التطبيق مطلوب').max(50, 'اسم التطبيق طويل جداً'),
  logoUrlInput: z.any().optional(), // For new file uploads
});

type AppConfigFormData = z.infer<typeof appConfigSchema>;

interface AppConfigManagerProps {
  initialConfig: AppConfig | null;
}

export function AppConfigManager({ initialConfig }: AppConfigManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(initialConfig?.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, formState: { errors, isDirty }, watch, setValue } = useForm<AppConfigFormData>({
    resolver: zodResolver(appConfigSchema),
    defaultValues: {
      appName: initialConfig?.appName || 'ClearRide',
      logoUrlInput: undefined,
    },
  });

  const watchedLogoUrlInput = watch('logoUrlInput');
  const { ref: logoUrlInputRegisterRef, ...logoUrlInputProps } = register('logoUrlInput');


  useEffect(() => {
    if (watchedLogoUrlInput && watchedLogoUrlInput[0] instanceof File) {
      const file = watchedLogoUrlInput[0];
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    } else if (!watchedLogoUrlInput && !imagePreviewUrl && initialConfig?.logoUrl) {
      // This case handles if the form is reset or an external factor clears the input
      // while there was an initial logo. We restore the initial preview.
      // However, direct user clearing of file input doesn't reliably trigger this.
      // The 'Remove Logo' button is the explicit way to clear the preview.
      // setImagePreviewUrl(initialConfig.logoUrl);
    }
  }, [watchedLogoUrlInput, initialConfig?.logoUrl, imagePreviewUrl]);

  const handleRemoveLogo = () => {
    setImagePreviewUrl(null);
    setValue('logoUrlInput', undefined, { shouldDirty: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit: SubmitHandler<AppConfigFormData> = async (data) => {
    startTransition(async () => {
      try {
        const logoFile = data.logoUrlInput && data.logoUrlInput[0] instanceof File ? data.logoUrlInput[0] : null;
        
        const formDataToServer = new FormData();
        formDataToServer.append('appName', data.appName);
        
        if (logoFile) {
          formDataToServer.append('logoFile', logoFile);
        }
        
        // Signal to remove logo if preview is null AND there was an initial logo
        const removeLogoFlag = !imagePreviewUrl && !!initialConfig?.logoUrl;
        formDataToServer.append('removeLogo', String(removeLogoFlag));

        if (initialConfig?.logoPublicId) {
          formDataToServer.append('currentLogoPublicId', initialConfig.logoPublicId);
        }

        await updateAppConfigAdmin(formDataToServer);
        
        toast({
          title: 'تم الحفظ بنجاح',
          description: 'تم تحديث إعدادات التطبيق.',
        });
        router.refresh(); // Refresh server components
      } catch (error) {
        console.error('Failed to update app config:', error);
        toast({
          title: 'خطأ في الحفظ',
          description: 'لم نتمكن من تحديث إعدادات التطبيق. ' + (error instanceof Error ? error.message : ''),
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

      <div>
        <Label htmlFor="logoUrlInput">شعار التطبيق (Logo)</Label>
        <div className="flex items-center gap-4 mt-1">
          {imagePreviewUrl ? (
            <div className="relative w-24 h-24 rounded-md border border-muted overflow-hidden">
              <Image src={imagePreviewUrl} alt="معاينة الشعار" layout="fill" objectFit="contain" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-md border border-dashed border-muted flex items-center justify-center bg-muted/20">
              <UploadCloud className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="flex-grow">
            <Input
              id="logoUrlInput"
              type="file"
              accept="image/*"
              {...logoUrlInputProps}
              ref={(e) => {
                logoUrlInputRegisterRef(e);
                fileInputRef.current = e;
              }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {errors.logoUrlInput && <p className="text-sm text-destructive mt-1">{errors.logoUrlInput.message as string}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              اختر ملف صورة (PNG, JPG, SVG). سيتم تغيير حجم الشعار إذا لزم الأمر.
            </p>
          </div>
          {imagePreviewUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo} aria-label="إزالة الشعار">
              <XCircle className="w-5 h-5 text-destructive" />
            </Button>
          )}
        </div>
      </div>


      <Button type="submit" disabled={isPending || !isDirty}>
        {isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </form>
  );
}
