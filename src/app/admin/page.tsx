// src/app/admin/page.tsx
import { AppConfigManager } from '@/components/admin/AppConfigManager';
import { CarModelManager } from '@/components/admin/CarModelManager';
import { CarTypeManager } from '@/components/admin/CarTypeManager';
import { Button } from '@/components/ui/button';
import { getAppConfig, getCarTypesAdmin, getCarModelsAdmin } from '@/services/adminService';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';


export const metadata = {
  title: 'لوحة تحكم ClearRide',
  description: 'إدارة محتوى تطبيق ClearRide.',
};

export default async function AdminPage() {
  // Fetch initial data to pass to server components if needed, or they can fetch themselves
  const appConfig = await getAppConfig();
  const carTypes = await getCarTypesAdmin();
  const carModels = await getCarModelsAdmin(); // Fetch all for model manager context

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <Button asChild variant="outline" className="glass-button">
          <Link href="/">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى التطبيق
          </Link>
        </Button>
      </header>

      <section className="admin-section">
        <h2 className="admin-section-title">إعدادات التطبيق العامة</h2>
        <AppConfigManager initialConfig={appConfig} />
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">إدارة أنواع السيارات</h2>
        <CarTypeManager initialCarTypes={carTypes} />
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">إدارة موديلات السيارات</h2>
        {/* Pass carTypes for the dropdown in CarModelManager */}
        <CarModelManager initialCarModels={carModels} allCarTypes={carTypes.map(ct => ({ value: ct.value, label: ct.label }))} />
      </section>
      
      {/* Add a note about Firestore security rules */}
      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <p><strong>ملاحظة هامة:</strong> تأكد من تأمين قواعد بيانات Firestore الخاصة بك بقواعد أمان مناسبة لحماية بيانات لوحة التحكم هذه من الوصول غير المصرح به.</p>
      </footer>
    </div>
  );
}

// Force dynamic rendering to ensure data is fresh on each visit,
// or implement revalidation strategies.
export const dynamic = 'force-dynamic';
