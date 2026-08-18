// A SİYAHISI — fakültə kataloqu (`/faculties`).
//
// 🔴 Route qrupu (`(index)`) TƏLƏ B üçündür: fayl `faculties/loading.tsx` kimi
// qoyulsaydı qonşu `faculties/[slug]`-a da düşərdi və orada `notFound()` var
// (naməlum fakültə slug-ı 404 verməlidir). Qrup URL-i dəyişmir. Tam izah:
// `(public)/(landing)/loading.tsx`.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function FacultiesLoading() {
  return <PageSkeleton variant="cards" label="Fakültə kataloqu yüklənir" />;
}
