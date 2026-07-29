"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  MapPin,
  Plus,
  Trophy,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { VISIBILITY_VALUES } from "@/lib/enums";
import { Caveat, Section, SubHeading } from "./Section";

// ---------------------------------------------------------------------------
// Düymələr — KUDS §11
// ---------------------------------------------------------------------------

export function ButtonsSection() {
  return (
    <Section
      id="buttons"
      title="Düymələr"
      description="KUDS §11. Radius 8px, hündürlük shadcn default (h-9 / h-10), ikon 16px."
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
          <SubHeading>Variantlar</SubHeading>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col items-start gap-2">
              <Button>Paylaş</Button>
              <code className="text-caption text-text-secondary">Primary — default</code>
            </div>

            <div className="flex flex-col items-start gap-2">
              <Button variant="outline">Ləğv et</Button>
              <code className="text-caption text-text-secondary">
                Secondary — variant=&quot;outline&quot;
              </code>
            </div>

            <div className="flex flex-col items-start gap-2">
              {/* Accent = ku-cream (accent token). Üzərində məcburi tünd mətn. */}
              <Button className="bg-accent text-accent-foreground hover:bg-accent/80">
                Xatirə əlavə et
              </Button>
              <code className="text-caption text-text-secondary">Accent — bg-accent</code>
            </div>

            <div className="flex flex-col items-start gap-2">
              <Button variant="destructive">Sil</Button>
              <code className="text-caption text-text-secondary">
                Danger — variant=&quot;destructive&quot;
              </code>
            </div>

            <div className="flex flex-col items-start gap-2">
              <Button disabled>Göndər</Button>
              <code className="text-caption text-text-secondary">Disabled</code>
            </div>

            <div className="flex flex-col items-start gap-2">
              <Button disabled>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Yüklənir...
              </Button>
              <code className="text-caption text-text-secondary">Loading</code>
            </div>

            <div className="flex flex-col items-start gap-2">
              <Button variant="ghost">Ghost</Button>
              <code className="text-caption text-text-secondary">Ghost</code>
            </div>

            <div className="flex flex-col items-start gap-2">
              <Button variant="link">Link</Button>
              <code className="text-caption text-text-secondary">Link</code>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
          <SubHeading>Ölçülər və ikonlar</SubHeading>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Kiçik</Button>
            <Button>Standart</Button>
            <Button size="lg">Böyük</Button>
            <Button size="icon" aria-label="Yeni post">
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline">
              <CalendarDays className="h-4 w-4" aria-hidden />
              Tədbirə yazıl
            </Button>
          </div>
        </div>

        <Caveat>
          <strong>KUDS §11: Secondary = Outline / Transparent Background.</strong>{" "}
          shadcn-də bu <code>variant=&quot;outline&quot;</code>-dır.{" "}
          <code>variant=&quot;secondary&quot;</code> <em>filled</em> render olunur və
          KUDS-a ziddir — işlətmə.
        </Caveat>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Kartlar — KUDS §12
// ---------------------------------------------------------------------------

export function CardsSection() {
  return (
    <Section
      id="cards"
      title="Kartlar"
      description="KUDS §12 struktur: Title → Description → Content → Actions. Fon ağ, radius 12, border 1px, shadow SM, padding 24."
    >
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm-kuds">
          <CardHeader>
            <CardTitle className="text-h4 text-text-primary">Sinif xronologiyası</CardTitle>
            <CardDescription className="text-small text-text-secondary">
              2026-2027 tədris ili
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-small text-text-primary">
              İlk dərs günündən məzuniyyətə qədər sinfin bütün mühüm anları bir xətdə.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Bax</Button>
            <Button size="sm" variant="outline">
              Paylaş
            </Button>
          </CardFooter>
        </Card>

        {/* globals.css-dəki hazır `.kuds-card` utiliti */}
        <div className="kuds-card flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-avatar bg-ku-blue text-ku-dark">
              <Trophy className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex flex-col">
              <span className="text-h4 text-text-primary">24</span>
              <span className="text-small text-text-secondary">Təsdiqlənmiş nailiyyət</span>
            </div>
          </div>
          <p className="text-caption text-text-secondary">
            <code>.kuds-card</code> — globals.css-dəki hazır utilit.
          </p>
        </div>

        <div className="kuds-card flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-avatar bg-ku-soft text-ku-dark">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex flex-col">
              <span className="text-h4 text-text-primary">15 ölkə</span>
              <span className="text-small text-text-secondary">Məzunlar hazırda burada</span>
            </div>
          </div>
          <p className="text-caption text-text-secondary">
            Aqreqasiya yalnız <code>includeInStats</code> razılığı olan qeydlərdən qurulur.
          </p>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Form elementləri — KUDS §13
// ---------------------------------------------------------------------------

export function FormsSection() {
  return (
    <Section
      id="forms"
      title="Form elementləri"
      description="KUDS §13. Label həmişə üstdə, radius 8px, focus halqası ku-green, səhv mətni input-un altında."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
          <div className="flex flex-col gap-2">
            <Label htmlFor="kuds-name">Ad, soyad</Label>
            <Input id="kuds-name" placeholder="Aysel Məmmədova" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="kuds-email">Universitet e-poçtu</Label>
            <Input
              id="kuds-email"
              type="email"
              defaultValue="aysel"
              aria-invalid
              aria-describedby="kuds-email-error"
              className="border-danger focus-visible:ring-danger"
            />
            <p id="kuds-email-error" className="text-caption text-danger-strong">
              E-poçt @qu.edu.az domenində olmalıdır.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="kuds-bio">Mənim haqqımda</Label>
            <Textarea
              id="kuds-bio"
              rows={3}
              placeholder="Bir neçə cümlə ilə özündən danış..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="kuds-visibility">Görünürlük</Label>
            <Select defaultValue="CLASS">
              <SelectTrigger id="kuds-visibility">
                <SelectValue placeholder="Səviyyə seç" />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_VALUES.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-caption text-text-secondary">
              Dəyərlər <code>src/lib/enums.ts</code>-dən gəlir — sətir literal yazılmır.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
          <div className="flex flex-col gap-3">
            <SubHeading>Seçim elementləri</SubHeading>

            <div className="flex items-center gap-3">
              <Checkbox id="kuds-timeline" defaultChecked />
              <Label htmlFor="kuds-timeline" className="font-normal">
                Xronologiyada göstər
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="kuds-achievements" />
              <Label htmlFor="kuds-achievements" className="font-normal">
                Nailiyyətlərə əlavə et
              </Label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="kuds-stats" className="font-normal">
                Statistikaya daxil et
              </Label>
              <Switch id="kuds-stats" defaultChecked />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <SubHeading>Kim görə bilər?</SubHeading>
            <RadioGroup defaultValue="CLASS" className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="PUBLIC" id="kuds-public" />
                <Label htmlFor="kuds-public" className="font-normal">
                  Hər kəs
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="UNIVERSITY" id="kuds-university" />
                <Label htmlFor="kuds-university" className="font-normal">
                  Universitet
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="CLASS" id="kuds-class" />
                <Label htmlFor="kuds-class" className="font-normal">
                  Yalnız sinif
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="PRIVATE" id="kuds-private" />
                <Label htmlFor="kuds-private" className="font-normal">
                  Yalnız mən
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <SubHeading>Tablar</SubHeading>
            <Tabs defaultValue="feed">
              <TabsList>
                <TabsTrigger value="feed">Lent</TabsTrigger>
                <TabsTrigger value="timeline">Xronologiya</TabsTrigger>
                <TabsTrigger value="members">Üzvlər</TabsTrigger>
              </TabsList>
              <TabsContent value="feed" className="pt-3 text-small text-text-secondary">
                Sinif lentindəki son paylaşımlar.
              </TabsContent>
              <TabsContent value="timeline" className="pt-3 text-small text-text-secondary">
                Tədris illəri üzrə xronologiya.
              </TabsContent>
              <TabsContent value="members" className="pt-3 text-small text-text-secondary">
                Sinif kataloqu və axtarış.
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Badge & Avatar
// ---------------------------------------------------------------------------

export function BadgesSection() {
  return (
    <Section
      id="badges"
      title="Badge və avatar"
      description="Badge radius 999px. Avatar dairəvi (rounded-avatar = 50%)."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
          <SubHeading>Badge</SubHeading>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-badge">Primary</Badge>
            <Badge variant="outline" className="rounded-badge">
              Outline
            </Badge>
            <Badge variant="destructive" className="rounded-badge">
              Silinib
            </Badge>
            <span className="kuds-badge-success">Təsdiqlənib</span>
            <span className="kuds-badge-warning">Gözləyir</span>
            <span className="kuds-badge-danger">Şikayət var</span>
          </div>

          <SubHeading>Görünürlük nişanları</SubHeading>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-badge bg-ku-soft px-3 py-1 text-caption text-ku-dark">
              PUBLIC
            </span>
            <span className="rounded-badge bg-ku-blue px-3 py-1 text-caption text-ku-dark">
              UNIVERSITY
            </span>
            <span className="rounded-badge bg-ku-cream px-3 py-1 text-caption text-ku-dark">
              CLASS
            </span>
            <span className="rounded-badge bg-muted px-3 py-1 text-caption text-text-primary">
              PRIVATE
            </span>
          </div>
          <p className="text-caption text-text-secondary">
            ku-soft / ku-blue / ku-cream fonlarında <strong>yalnız</strong> tünd mətn —
            ağ mətn heç vaxt (kontrast 1.15–1.31:1).
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
          <SubHeading>Avatar</SubHeading>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
                  AM
                </AvatarFallback>
              </Avatar>
              <span className="text-caption text-text-secondary">32px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar>
                <AvatarFallback className="bg-ku-blue text-small text-ku-dark">
                  RQ
                </AvatarFallback>
              </Avatar>
              <span className="text-caption text-text-secondary">40px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-ku-cream text-body text-ku-dark">
                  NƏ
                </AvatarFallback>
              </Avatar>
              <span className="text-caption text-text-secondary">48px</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-ku-green text-h4 text-white">
                  QU
                </AvatarFallback>
              </Avatar>
              <span className="text-caption text-text-secondary">64px</span>
            </div>
          </div>

          <SubHeading>Yığın</SubHeading>
          <div className="flex items-center">
            {["AM", "RQ", "NƏ", "SH"].map((initials, index) => (
              <Avatar
                key={initials}
                className={index === 0 ? "border-2 border-surface" : "-ml-2 border-2 border-surface"}
              >
                <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ))}
            <span className="ml-3 text-small text-text-secondary">+118 sinif yoldaşı</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Modal — KUDS §12 (radius 16)
// ---------------------------------------------------------------------------

export function ModalSection() {
  return (
    <Section
      id="modal"
      title="Modal"
      description="Radius 16px (rounded-modal), kölgə md-kuds, overlay tünd."
    >
      <div className="rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Modalı aç</Button>
          </DialogTrigger>
          <DialogContent className="rounded-modal shadow-md-kuds sm:rounded-modal">
            <DialogHeader>
              <DialogTitle className="text-h3 text-text-primary">
                Paylaşımı silmək istəyirsən?
              </DialogTitle>
              <DialogDescription className="text-small text-text-secondary">
                Paylaşım sinif lentindən və xronologiyadan çıxarılacaq. Bu əməliyyat
                geri qaytarıla bilməz.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">İmtina</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive">Sil</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Cədvəl və pagination — KUDS §14
// ---------------------------------------------------------------------------

const TABLE_ROWS = [
  { name: "Aysel Məmmədova", cohort: "İnformatika 2030", role: "Sinif nümayəndəsi", status: "Aktiv" },
  { name: "Rəşad Quliyev", cohort: "İnformatika 2030", role: "Üzv", status: "Aktiv" },
  { name: "Nərmin Əliyeva", cohort: "Filologiya 2027", role: "Moderator", status: "Gözləyir" },
  { name: "Səid Həsənov", cohort: "İqtisadiyyat 2024", role: "Üzv", status: "Arxiv" },
];

const STATUS_CLASS: Record<string, string> = {
  Aktiv: "kuds-badge-success",
  Gözləyir: "kuds-badge-warning",
  Arxiv: "kuds-badge-danger",
};

export function TableSection() {
  return (
    <Section
      id="table"
      title="Cədvəl və səhifələmə"
      description="KUDS §14 məcburi funksiyalar: sıralama, filtr, səhifələmə, axtarış, ixrac, responsive. Aşağıda vizual çərçivə göstərilir — məntiq Blok 6-da gəlir."
    >
      <div className="flex flex-col gap-6">
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-xs-kuds">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad, soyad</TableHead>
                  <TableHead>Sinif</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TABLE_ROWS.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium text-text-primary">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-text-secondary">{row.cohort}</TableCell>
                    <TableCell className="text-text-secondary">{row.role}</TableCell>
                    <TableCell className="text-right">
                      <span className={STATUS_CLASS[row.status]}>{row.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/*
          ⚠️ `PaginationPrevious` / `PaginationNext` mətni shadcn mənbəyində
          ingiliscə hardcode olunub ("Previous" / "Next") və children ilə
          əvəzlənmir. `src/components/ui/` toxunulmaz olduğu üçün azərbaycanca
          mətn `PaginationLink`-lə qurulur. Sonrakı bloklarda da belə et.
        */}
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-label="Əvvəlki səhifə"
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Əvvəlki
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-label="Növbəti səhifə"
                className="gap-1"
              >
                Növbəti
                <ChevronRight className="h-4 w-4" aria-hidden />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Boş vəziyyət və skeleton
// ---------------------------------------------------------------------------

export function StatesSection() {
  const [loading, setLoading] = useState(true);

  return (
    <Section
      id="states"
      title="Boş vəziyyət və skeleton"
      description="CLAUDE.md: boş ekran buraxma. Hər siyahının həm skeleton, həm də boş vəziyyəti olmalıdır."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-surface p-12 text-center shadow-xs-kuds">
          <span className="flex h-16 w-16 items-center justify-center rounded-avatar bg-muted text-text-secondary">
            <Inbox className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="text-h4 text-text-primary">Hələ paylaşım yoxdur</h3>
          <p className="max-w-sm text-small text-text-secondary">
            Sinfin ilk paylaşımını sən et — ilk dərs günündən bir şəkil kifayətdir.
          </p>
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            İlk paylaşımı et
          </Button>
        </div>

        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
          <div className="flex items-center justify-between gap-3">
            <SubHeading>Skeleton</SubHeading>
            <Button variant="outline" size="sm" onClick={() => setLoading((v) => !v)}>
              {loading ? "Məzmunu göstər" : "Skeleton-u göstər"}
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-avatar" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-24 w-full rounded-card" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-ku-soft text-small text-ku-dark">
                    AM
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-small font-medium text-text-primary">
                    Aysel Məmmədova
                  </span>
                  <span className="text-caption text-text-secondary">
                    2 saat əvvəl · İlk dərs günü
                  </span>
                </div>
              </div>
              <p className="text-small text-text-primary">
                İlk mühazirədən sonra bütün qrup həyətdə şəkil çəkdirdik. Bu anı
                xronologiyaya da əlavə etdim.
              </p>
              <div className="flex h-24 items-center justify-center rounded-card bg-muted text-caption text-text-secondary">
                Şəkil sahəsi
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
