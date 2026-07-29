// ============================================================================
// prisma/seed-data/content.ts
// QU CLASS — seed məzmunu (mətn hovuzları).
//
// Bütün istifadəçi mətnləri AZƏRBAYCANCA və realdır (CLAUDE.md §9).
// Burada YALNIZ data var — məntiq `prisma/seed.ts`-dədir.
//
// ⚠️ Enum dəyərləri sətir literal kimi yazılmır; açarlar `src/lib/enums.ts`
// tiplərinə bağlıdır, ona görə enum-a yeni dəyər əlavə edildikdə `tsc` burada
// çatışmayan açarı göstərir.
// ============================================================================

import type {
  AchievementCategory,
  ClubCategory,
  ContentSection,
  EventCategory,
  EventScope,
  FaqCategory,
  GuideCategory,
  MemoryType,
  PostCategory,
  ProgramDegree,
  TagType,
} from "@/lib/enums";

// ---------------------------------------------------------------------------
// 1. Adlar
// ---------------------------------------------------------------------------

export const MALE_FIRST_NAMES = [
  "Elvin", "Rəşad", "Tural", "Kamran", "Orxan", "Nihat", "Ceyhun", "Fuad",
  "Emin", "Nurlan", "Samir", "Rauf", "Elçin", "Vüqar", "Anar", "Turan",
  "Murad", "İlkin", "Zaur", "Ramil", "Cavid", "Səbuhi", "Toğrul", "Ayxan",
  "Kənan", "Fərid", "Mahir", "Elmar", "Ruslan", "Bəxtiyar",
] as const;

export const FEMALE_FIRST_NAMES = [
  "Aysel", "Nərmin", "Günel", "Leyla", "Səbinə", "Xədicə", "Nigar", "Aygün",
  "Fidan", "Ülviyyə", "Şəbnəm", "Zeynəb", "Lalə", "Gülnar", "Aytac", "Türkan",
  "Mələk", "Nərgiz", "Sevinc", "Ayşən", "Ruqiyyə", "Vüsalə", "Günay", "Nübar",
  "Sara", "Aynur", "Fatimə", "Zərifə", "Mədinə", "Ayan",
] as const;

/** Kişi variantı; qadınlar üçün seed.ts sonuna "a" əlavə edir (Məmmədov → Məmmədova). */
export const LAST_NAME_STEMS = [
  "Məmmədov", "Əliyev", "Hüseynov", "Quliyev", "Həsənov", "İsmayılov",
  "Rəhimov", "Abbasov", "Nəbiyev", "Cəfərov", "Kərimov", "Sultanov",
  "Bağırov", "Xəlilov", "Vəliyev", "Musayev", "Səfərov", "Əhmədov",
  "Orucov", "Zeynalov", "Mirzəyev", "Qasımov", "Şirinov", "Tağıyev",
  "Nərimanov", "Babayev", "Ağayev", "Salmanov", "Rzayev", "Novruzov",
] as const;

export const HOMETOWNS = [
  "Bakı", "Gəncə", "Sumqayıt", "Şəki", "Lənkəran", "Quba", "Şirvan", "Mingəçevir",
  "Naxçıvan", "Xankəndi", "Şuşa", "Ağdam", "Füzuli", "Zəngilan", "Cəbrayıl",
  "Laçın", "Kəlbəcər", "Tərtər", "Bərdə", "Yevlax", "Salyan", "Masallı",
  "Qazax", "Tovuz", "Şamaxı", "İsmayıllı", "Xaçmaz", "Astara", "Göyçay", "Ucar",
] as const;

// ---------------------------------------------------------------------------
// 2. Profil mətnləri
// ---------------------------------------------------------------------------

export const BIOS = [
  "Kompüter şəbəkələri və məlumat təhlükəsizliyi ilə maraqlanıram. Boş vaxtımda açıq mənbəli layihələrə kiçik töhfələr verirəm.",
  "Universitetə qədər riyaziyyat olimpiadalarına hazırlaşırdım. İndi eyni intizamı proqramlaşdırmaya yönəltməyə çalışıram.",
  "Sinif yoldaşlarımla birgə layihə işləməyi sevirəm — tək işləməkdən daha çox şey öyrənirsən.",
  "Kitabxanada çox vaxt keçirirəm. Oxuduğum hər kitabdan bir səhifə qeyd saxlayıram.",
  "Marketinq və məzmun istehsalı ilə maraqlanıram. Universitetin tədbirlərinin sosial media hesablarını könüllü idarə edirəm.",
  "Doğulduğum rayonda kiçik bir kitab klubu qurmuşdum. Burada da oxşar bir şey etmək istəyirəm.",
  "Məlumat analitikası mənim üçün ən maraqlı sahədir — rəqəmlərin arxasındakı hekayəni tapmaq xoşuma gəlir.",
  "Psixologiya oxuyuram, amma texnologiya ilə kəsişən mövzular — istifadəçi davranışı, rəqəmsal asılılıq — məni daha çox çəkir.",
  "Universitet komandasında futbol oynayıram. Məşq cədvəli ilə dərs cədvəlini uyğunlaşdırmaq ayrıca bacarıqdır.",
  "Şəkil çəkməyi sevirəm; kampusun ilk ilinə aid arxiv toplamağa çalışıram.",
  "Maliyyə modelləşdirməsi üzrə onlayn kurslar keçirəm. Məqsədim təcrübəni bank sektorunda keçməkdir.",
  "İngilis və türk dillərində sərbəst danışıram, alman dilini yeni öyrənməyə başlamışam.",
  "Könüllü təşkilatlarda uşaqlara riyaziyyat öyrədirəm. Həftədə iki dəfə onlayn dərs keçirəm.",
  "Robototexnika dərnəyində iştirak edirəm. İlk layihəmiz kampus üçün sadə çeşidləyici qol idi.",
  "Ədəbiyyata marağım var — xüsusilə müasir Azərbaycan nəsri. Öz yazılarımı da bloqda paylaşıram.",
  "İnşaat mühəndisliyi oxuyuram. Bərpa layihələri, xüsusilə tarixi binaların bərpası maraq dairəmdədir.",
  "Sahibkarlıq mərkəzinin təlimlərində iştirak edirəm. Kiçik bir onlayn mağaza layihəm var.",
  "Ekologiya və su resursları mövzusunda araşdırma aparıram. Kurs işim də bu mövzudadır.",
  "Video montaj ilə məşğulam; universitetin tədbirlərinin qısa xülasə videolarını hazırlayıram.",
  "Sakit adamam, amma komanda işində məsuliyyəti üzərimə götürməyi bacarıram.",
] as const;

export const LEARNING_GOALS = [
  "İxtisas fənlərini yaxşı mənimsəmək və ikinci kursdan etibarən real layihələrdə işləmək istəyirəm.",
  "Nəzəri biliyi praktikaya çevirməyi öyrənmək — ən böyük hədəfim budur.",
  "Akademik yazı bacarığımı inkişaf etdirib məqalə dərc etdirmək istəyirəm.",
  "Beynəlxalq mübadilə proqramına düşmək üçün dil və akademik göstəricilərimi gücləndirməliyəm.",
  "Komanda ilə işləmək, layihə idarə etmək və vaxtı planlamaq bacarıqlarını qazanmaq istəyirəm.",
  "Sahəmdə hansı istiqamətin mənə uyğun olduğunu aydınlaşdırmaq üçün müxtəlif təcrübə proqramlarında iştirak etmək niyyətindəyəm.",
  "Məlumatla işləmək — toplamaq, təmizləmək, təhlil etmək — bacarığını peşəkar səviyyəyə çatdırmaq istəyirəm.",
  "Universiteti bitirənə qədər ən azı bir sosial layihəni əvvəldən sona qədər aparmaq istəyirəm.",
] as const;

export const ASK_ME_ABOUT = [
  "Universitetə qəbul prosesi və sənəd qaydaları",
  "Proqramlaşdırmaya sıfırdan başlamaq",
  "Kitabxanadan və elektron bazalardan istifadə",
  "Yataqxana həyatı və Xankəndidə məişət məsələləri",
  "İngilis dili imtahanlarına hazırlıq",
  "Tələbə klublarına necə qoşulmaq olar",
  "Yay təcrübəsi üçün müraciət və müsahibə mərhələləri",
  "Könüllü proqramlar və sertifikatlar",
  "Kurs işi və buraxılış layihəsinin planlanması",
  "Karyera dəyişikliyi və ilk iş təcrübəsi",
] as const;

export const EXPECTATIONS = [
  "Güclü bir sinif kollektivi və ömürlük dostluqlar gözləyirəm.",
  "Müəllimlərlə açıq ünsiyyət və real layihələr üzərində işləmək imkanı.",
  "Universitetin yeni olması məni qorxutmur — əksinə, ilk məzunlardan biri olmaq maraqlıdır.",
  "Kampusda aktiv tələbə həyatı, klublar və tədbirlər olmasını istəyirəm.",
  "Beynəlxalq əlaqələr və mübadilə proqramlarının genişlənməsini gözləyirəm.",
  "Nəzəriyyə ilə praktikanın balanslı olmasını gözləyirəm.",
  "Məzun olandan sonra da bu şəbəkənin qalmasını istəyirəm.",
  "Fərqli şəhərlərdən gələn insanlarla tanış olub dünyagörüşümü genişləndirmək.",
] as const;

export const FUTURE_PLANS = [
  "Magistratura təhsilini xaricdə davam etdirmək və sonra ölkəyə qayıdıb tədris etmək.",
  "Öz komandamla kiçik bir texnologiya şirkəti qurmaq.",
  "Sahəmdə sertifikatlaşdırılmış mütəxəssis olmaq və beynəlxalq layihələrdə işləmək.",
  "Doğulduğum bölgədə təhsil layihələri həyata keçirmək.",
  "Bank sektorunda risk idarəetməsi üzrə ixtisaslaşmaq.",
  "Doktorantura və akademik karyera.",
  "Universitetin karyera mərkəzi ilə əməkdaşlığı davam etdirmək, tələbələrə mentorluq etmək.",
  "Öz sahəmdə azərbaycandilli tədris materialları hazırlamaq.",
] as const;

// ---------------------------------------------------------------------------
// 3. Akademik struktur
// ---------------------------------------------------------------------------

export interface FacultySeed {
  key: string;
  name: string;
  nameEn: string;
  slug: string;
  description: string;
}

export const FACULTIES: readonly FacultySeed[] = [
  {
    key: "eng",
    name: "Mühəndislik və Texnologiya fakültəsi",
    nameEn: "Faculty of Engineering and Technology",
    slug: "muhendislik-ve-texnologiya",
    description:
      "Kompüter, informasiya təhlükəsizliyi və inşaat mühəndisliyi istiqamətləri üzrə kadr hazırlığı aparır. Laboratoriyalar və layihə studiyaları fakültənin əsas tədris mühitidir.",
  },
  {
    key: "econ",
    name: "İqtisadiyyat və İdarəetmə fakültəsi",
    nameEn: "Faculty of Economics and Management",
    slug: "iqtisadiyyat-ve-idareetme",
    description:
      "Biznes, maliyyə və marketinq proqramlarını birləşdirir. Tədris real şirkət keysləri və simulyasiyalar üzərində qurulub.",
  },
  {
    key: "hum",
    name: "Təbiət və Humanitar Elmlər fakültəsi",
    nameEn: "Faculty of Natural and Human Sciences",
    slug: "tebiet-ve-humanitar-elmler",
    description:
      "Müəllim hazırlığı, psixologiya və riyaziyyat proqramlarını əhatə edir. Pedaqoji təcrübə bölgə məktəbləri ilə birgə təşkil olunur.",
  },
  {
    key: "agro",
    name: "Aqrar Elmlər və Ekologiya fakültəsi",
    nameEn: "Faculty of Agricultural Sciences and Ecology",
    slug: "aqrar-elmler-ve-ekologiya",
    description:
      "Regionun aqrar potensialı və ekoloji bərpası üzərində fokuslanır. Tədris təsərrüfat sahələrində sahə işləri ilə tamamlanır.",
  },
] as const;

export interface ProgramSeed {
  key: string;
  facultyKey: string;
  name: string;
  nameEn: string;
  slug: string;
  degree: ProgramDegree;
}

export const PROGRAMS: readonly ProgramSeed[] = [
  { key: "cs", facultyKey: "eng", name: "Kompüter mühəndisliyi", nameEn: "Computer Engineering", slug: "komputer-muhendisliyi", degree: "BACHELOR" },
  { key: "sec", facultyKey: "eng", name: "İnformasiya təhlükəsizliyi", nameEn: "Information Security", slug: "informasiya-tehlukesizliyi", degree: "BACHELOR" },
  { key: "civ", facultyKey: "eng", name: "İnşaat mühəndisliyi", nameEn: "Civil Engineering", slug: "insaat-muhendisliyi", degree: "BACHELOR" },
  { key: "biz", facultyKey: "econ", name: "Biznesin idarə edilməsi", nameEn: "Business Administration", slug: "biznesin-idare-edilmesi", degree: "BACHELOR" },
  { key: "fin", facultyKey: "econ", name: "Maliyyə", nameEn: "Finance", slug: "maliyye", degree: "BACHELOR" },
  { key: "mkt", facultyKey: "econ", name: "Marketinq", nameEn: "Marketing", slug: "marketinq", degree: "BACHELOR" },
  { key: "eng-teach", facultyKey: "hum", name: "İngilis dili müəllimliyi", nameEn: "English Language Teaching", slug: "ingilis-dili-muellimliyi", degree: "BACHELOR" },
  { key: "psy", facultyKey: "hum", name: "Psixologiya", nameEn: "Psychology", slug: "psixologiya", degree: "BACHELOR" },
  { key: "math", facultyKey: "hum", name: "Riyaziyyat müəllimliyi", nameEn: "Mathematics Teaching", slug: "riyaziyyat-muellimliyi", degree: "BACHELOR" },
  { key: "agr", facultyKey: "agro", name: "Aqronomluq", nameEn: "Agronomy", slug: "aqronomluq", degree: "BACHELOR" },
] as const;

export interface CohortSeed {
  key: string;
  programKey: string;
  admissionYear: number;
  graduationYear: number;
  /** ISO tarixlər — mərhələ keçidinin VAHİD mənbəyi (src/lib/stage.ts). */
  academicStartsAt: string;
  graduatesAt: string;
  memberCount: number;
  welcomeMessage: string;
}

/**
 * 6 cohort. `academicStartsAt` / `graduatesAt` elə seçilib ki, 2026-cı ilin
 * ortasında `resolveStage` müvafiq olaraq INCOMING / STUDENT / ALUMNI versin.
 */
export const COHORTS: readonly CohortSeed[] = [
  {
    key: "cs2026",
    programKey: "cs",
    admissionYear: 2026,
    graduationYear: 2030,
    academicStartsAt: "2026-09-15T09:00:00.000Z",
    graduatesAt: "2030-06-28T10:00:00.000Z",
    memberCount: 22,
    welcomeMessage:
      "Kompüter mühəndisliyi 2026 qəbuluna xoş gəlmisiniz! Dərslər sentyabrın 15-də başlayır. O vaxta qədər bir-birinizi tanıyın, suallarınızı bu səhifədə verin.",
  },
  {
    key: "biz2026",
    programKey: "biz",
    admissionYear: 2026,
    graduationYear: 2030,
    academicStartsAt: "2026-09-15T09:00:00.000Z",
    graduatesAt: "2030-06-28T10:00:00.000Z",
    memberCount: 20,
    welcomeMessage:
      "Biznesin idarə edilməsi 2026 qəbulu — bu səhifə sizin sinif səhifənizdir. Oriyentasiya proqramı sentyabrın 10-da başlayacaq.",
  },
  {
    key: "sec2023",
    programKey: "sec",
    admissionYear: 2023,
    graduationYear: 2027,
    academicStartsAt: "2023-09-18T09:00:00.000Z",
    graduatesAt: "2027-06-25T10:00:00.000Z",
    memberCount: 24,
    welcomeMessage:
      "İnformasiya təhlükəsizliyi 2023 — dördüncü kursa hazırlaşırıq. Buraxılış layihəsi mövzularını burada müzakirə edirik.",
  },
  {
    key: "eng2024",
    programKey: "eng-teach",
    admissionYear: 2024,
    graduationYear: 2028,
    academicStartsAt: "2024-09-16T09:00:00.000Z",
    graduatesAt: "2028-06-26T10:00:00.000Z",
    memberCount: 22,
    welcomeMessage:
      "İngilis dili müəllimliyi 2024 — pedaqoji təcrübə cədvəli və dərs materialları burada paylaşılır.",
  },
  {
    key: "fin2018",
    programKey: "fin",
    admissionYear: 2018,
    graduationYear: 2022,
    academicStartsAt: "2018-09-17T09:00:00.000Z",
    graduatesAt: "2022-06-24T10:00:00.000Z",
    memberCount: 18,
    welcomeMessage:
      "Maliyyə 2018 məzunları — sinif səhifəmiz bağlanmır. Kim harada işləyir, kim harada yaşayır — hamısı buradadır.",
  },
  {
    key: "psy2019",
    programKey: "psy",
    admissionYear: 2019,
    graduationYear: 2023,
    academicStartsAt: "2019-09-16T09:00:00.000Z",
    graduatesAt: "2023-06-23T10:00:00.000Z",
    memberCount: 14,
    welcomeMessage:
      "Psixologiya 2019 məzunları. İllik görüşün tarixini bu səhifədə səsverməyə qoyuruq.",
  },
] as const;

// ---------------------------------------------------------------------------
// 4. Taqlar
// ---------------------------------------------------------------------------

export interface TagSeed {
  type: TagType;
  name: string;
  slug: string;
}

export const TAGS: readonly TagSeed[] = [
  { type: "INTEREST", name: "Süni intellekt", slug: "suni-intellekt" },
  { type: "INTEREST", name: "Kibertəhlükəsizlik", slug: "kibertehlukesizlik" },
  { type: "INTEREST", name: "Startaplar", slug: "startaplar" },
  { type: "INTEREST", name: "Robototexnika", slug: "robototexnika" },
  { type: "INTEREST", name: "Ekologiya", slug: "ekologiya" },
  { type: "INTEREST", name: "Astronomiya", slug: "astronomiya" },
  { type: "INTEREST", name: "Psixologiya", slug: "psixologiya" },
  { type: "INTEREST", name: "Tarix", slug: "tarix" },
  { type: "INTEREST", name: "Fotoqrafiya", slug: "fotoqrafiya" },
  { type: "INTEREST", name: "Kino", slug: "kino" },
  { type: "INTEREST", name: "Ədəbiyyat", slug: "edebiyyat" },
  { type: "INTEREST", name: "Könüllülük", slug: "konulluluk" },

  { type: "HOBBY", name: "Futbol", slug: "futbol" },
  { type: "HOBBY", name: "Basketbol", slug: "basketbol" },
  { type: "HOBBY", name: "Şahmat", slug: "sahmat" },
  { type: "HOBBY", name: "Gitara", slug: "gitara" },
  { type: "HOBBY", name: "Rəsm", slug: "resm" },
  { type: "HOBBY", name: "Səyahət", slug: "seyahet" },
  { type: "HOBBY", name: "Dağ yürüşü", slug: "dag-yurusu" },
  { type: "HOBBY", name: "Üzgüçülük", slug: "uzguculuk" },
  { type: "HOBBY", name: "Kulinariya", slug: "kulinariya" },
  { type: "HOBBY", name: "Kitab oxumaq", slug: "kitab-oxumaq" },

  { type: "SKILL", name: "Python", slug: "python" },
  { type: "SKILL", name: "JavaScript", slug: "javascript" },
  { type: "SKILL", name: "TypeScript", slug: "typescript" },
  { type: "SKILL", name: "SQL", slug: "sql" },
  { type: "SKILL", name: "Excel", slug: "excel" },
  { type: "SKILL", name: "Figma", slug: "figma" },
  { type: "SKILL", name: "Məlumat analitikası", slug: "melumat-analitikasi" },
  { type: "SKILL", name: "Layihə idarəetməsi", slug: "layihe-idareetmesi" },
  { type: "SKILL", name: "İctimai çıxış", slug: "ictimai-cixis" },
  { type: "SKILL", name: "Video montaj", slug: "video-montaj" },
  { type: "SKILL", name: "Maliyyə modelləşdirməsi", slug: "maliyye-modellesdirmesi" },
  { type: "SKILL", name: "Rəqəmsal marketinq", slug: "reqemsal-marketinq" },

  { type: "LANGUAGE", name: "Azərbaycan dili", slug: "azerbaycan-dili" },
  { type: "LANGUAGE", name: "İngilis dili", slug: "ingilis-dili" },
  { type: "LANGUAGE", name: "Rus dili", slug: "rus-dili" },
  { type: "LANGUAGE", name: "Türk dili", slug: "turk-dili" },
  { type: "LANGUAGE", name: "Alman dili", slug: "alman-dili" },
  { type: "LANGUAGE", name: "Fransız dili", slug: "fransiz-dili" },
] as const;

// ---------------------------------------------------------------------------
// 5. Feed məzmunu
// ---------------------------------------------------------------------------

export const POST_BODIES: Record<PostCategory, readonly string[]> = {
  FIRST_DAY: [
    "Universitetdəki ilk günüm bitdi. Kampus gözlədiyimdən daha səliqəli çıxdı, qrup yoldaşlarımın yarısı ilə artıq tanış olmuşam.",
    "Bu gün ilk dəfə auditoriyaya girdim. Həyəcanlı idim, amma müəllimlərin münasibəti bütün gərginliyi götürdü.",
    "İlk gün üçün siyahı hazırlamışdım: sənədlər, tələbə bileti, kitabxana qeydiyyatı. Üçünü də bir günə çatdırdıq.",
    "Sabahdan dərslər başlayır. Bu gün sadəcə korpusları gəzdik və hansı auditoriyanın harada olduğunu öyrəndik.",
    "İlk gün ən çətini yol oldu — səhər avtobusunu bir az gec tutdum. Sabah 20 dəqiqə tez çıxıram.",
    "Qrupumuzun ilk ümumi şəkli. Bir ildən sonra baxıb gülməyimiz üçün buraya qoyuram.",
  ],
  ORIENTATION: [
    "Oriyentasiya proqramında fakültənin strukturu, kredit sistemi və kitabxanadan istifadə qaydaları izah olundu.",
    "Oriyentasiya həftəsində tələbə klublarının təqdimatı oldu. İkisinə yazılmaq qərarına gəldim.",
    "Dekanlıq oriyentasiyada akademik borc və təkrar kurs qaydalarını ətraflı danışdı — qeydlərimi qrupa yükləyirəm.",
    "Bu gün kitabxana turu keçirdik. Elektron bazalara universitet hesabı ilə evdən də giriş var.",
    "Oriyentasiyanın ikinci günü karyera mərkəzi çıxış etdi. Birinci kursdan CV hazırlamağı məsləhət gördülər.",
    "Yataqxanaya köçmək istəyənlər üçün müraciət qaydalarını oriyentasiyada izah etdilər. Sənəd siyahısını şərhdə yazıram.",
  ],
  EVENT_PHOTOS: [
    "Dünənki tədbirdən bir neçə kadr. Zal dolu idi, çıxışlar da gözlədiyimizdən maraqlı alındı.",
    "Fakültə gecəsindən şəkillər. Təşkilatçılara ayrıca təşəkkür — hər şey vaxtında başladı.",
    "Açıq havada keçən görüşdən fotolar. Hava bir az sərin idi, amma iştirak yaxşı oldu.",
    "Bu şəkilləri arxiv üçün saxlayıram — ilk illərin fotosu sonradan qiymətli olur.",
    "Konfransın ikinci sessiyasından kadrlar. Sual-cavab hissəsi ən canlı yer oldu.",
    "Səhnə arxasından bir neçə kadr. Hazırlıq özü tədbirdən çətin idi.",
  ],
  ACADEMIC_ACHIEVEMENT: [
    "Semestr imtahanlarının nəticələri açıqlandı — ortalama balım 92 oldu. Hazırlıq ağır keçdi, amma dəydi.",
    "Elmi məqaləm universitetin tələbə konfransı toplusunda dərc olundu.",
    "Kurs işim fakültə üzrə ən yaxşı üç işdən biri seçildi.",
    "Riyaziyyat analizindən semestri maksimum balla bağladım. Həftəlik məsələ həlli cədvəli çox kömək etdi.",
    "Beynəlxalq jurnalda həmmüəllif olduğum tezis qəbul edildi.",
    "Təqaüd komissiyası nəticələri elan etdi — növbəti semestrdə fərqlənmə təqaüdü alacağam.",
  ],
  SOCIAL_ACHIEVEMENT: [
    "Könüllü proqramında 100 saatı tamamladım. Sertifikatı bu gün təqdim etdilər.",
    "Bölgə məktəblərində keçirdiyimiz karyera günü layihəsi başa çatdı — 6 məktəb, 300-dən çox şagird.",
    "Tələbə həmrəyliyi aksiyasında topladığımız kitablar rayon kitabxanasına təhvil verildi.",
    "Sinif olaraq təşkil etdiyimiz qan donorluğu aksiyası gözlədiyimizdən çox iştirakçı topladı.",
    "Universitetin ekoloji təmizlik aksiyasında komandamız birinci yeri tutdu.",
    "Onlayn təlim layihəmizə 200-dən çox şagird qeydiyyatdan keçdi.",
  ],
  TRIPS: [
    "Şuşaya təşkil olunan tələbə səfərindən qayıtdıq. Marşrut yorucu idi, amma gördüklərimizə dəyərdi.",
    "Fakültə səfəri çərçivəsində istehsalat müəssisəsində olduq — dərsdə oxuduğumuz prosesi canlı gördük.",
    "Həftəsonu təşkil etdiyimiz yürüşdən qeydlər. Marşrut orta çətinlikdə idi, 4 saat çəkdi.",
    "Bakıya təşkil olunan muzey turundan qayıtdıq. Növbəti səfər üçün təkliflərinizi yazın.",
    "Sinif səfərimizin bütün xərc hesabatını şərhdə paylaşıram — növbəti dəfə planlamaq üçün faydalı olar.",
    "Ağdam istiqamətindəki bərpa işlərinə baxış turunda olduq. Mühəndislik baxımından çox şey öyrəndik.",
  ],
  EXAM_PERIOD: [
    "İmtahan sessiyası başladı. Kitabxananın oxu zalı gecə 22:00-a qədər açıqdır — istifadə edin.",
    "Sessiya cədvəli dəyişdi, iki imtahanın tarixi bir gün irəli çəkilib. Dekanlığın elanını yoxlayın.",
    "Kollokvium suallarının siyahısını qrup qovluğuna yüklədim.",
    "Birgə hazırlıq üçün hər axşam 18:00-da 204 nömrəli auditoriyada toplaşırıq. Qoşulmaq istəyən yazsın.",
    "Sessiya bitdi. Bu semestr ən çətini statistika oldu, ən rahatı isə seçmə fənn.",
    "İmtahan öncəsi son gecə oxumaq işləmir — bunu üçüncü dəfədir təsdiqləyirəm.",
  ],
  INTERNSHIP: [
    "Yay təcrübəmi Bakıda bir texnologiya şirkətində keçirirəm. İlk həftənin qeydlərini paylaşıram.",
    "Təcrübə müsahibəsindən keçdim. Suallar əsasən layihə təcrübəsi haqqında idi, nəzəri sual az oldu.",
    "Bank sektorunda təcrübə proqramına qəbul olundum. Müraciət mərhələlərini şərhdə yazıram.",
    "Təcrübə yerində ilk müstəqil tapşırığımı təhvil verdim. Kod baxışından çox şey öyrəndim.",
    "Təcrübə hesabatını yazarkən gündəlik qeyd tutmağın nə qədər vacib olduğunu anladım.",
    "Yay təcrübəsi elanlarını bir siyahıda topladım — sinifdə hamıya faydalı olar.",
  ],
  CLUB_ACTIVITY: [
    "Debat klubunun həftəlik görüşündə mövzumuz süni intellektin təhsildə rolu idi.",
    "İT klubunda bu həftə versiya nəzarəti üzrə seminar keçirdik — iştirak gözlədiyimizdən çox oldu.",
    "Könüllülər klubu yeni üzv qəbuluna başladı. Müraciət formu profilimdəki linkdədir.",
    "İdman klubunun daxili turnirinin cədvəli hazırdır. Qeydiyyat cümə gününə qədərdir.",
    "Mədəniyyət klubunun kitab müzakirəsində bu ay seçilən əsər müasir Azərbaycan nəsrindən idi.",
    "Sahibkarlıq klubunda ideya təqdimatı gecəsi keçirdik — beş komanda çıxış etdi.",
  ],
  COMPETITION: [
    "Respublika proqramlaşdırma olimpiadasında komandamız üçüncü yeri tutdu.",
    "Universitetlərarası keys yarışmasında finala çıxdıq. Təqdimat slaydlarını paylaşacağam.",
    "Hakaton 36 saat çəkdi. Yuxusuz qaldıq, amma işləyən prototip təhvil verdik.",
    "Riyaziyyat turnirində fakültəmizi təmsil etdik — komanda hesabında ikinci yer.",
    "Debat turnirinin yarımfinalında məğlub olduq, amma çıxışlarımızdan razıyıq.",
    "İdman yarışlarında sinif komandamız qrup mərhələsini birinci yerlə bitirdi.",
  ],
  CAPSTONE: [
    "Buraxılış layihəmizin ilk prototipi hazırdır. Rəhbərimizlə ilk baxış görüşünü keçirdik.",
    "Layihə mövzumuzu dəqiqləşdirdik: kampus üçün tədbir idarəetmə sistemi.",
    "Buraxılış işinin ədəbiyyat icmalını bitirdim. Mənbələrin siyahısını qrupla bölüşürəm.",
    "Layihəmizin ilk istifadəçi testini keçirdik — beş nəfər, on tapşırıq, çoxlu qeyd.",
    "Müdafiə tarixləri elan olundu. Hazırlıq üçün cəmi üç həftə qalır.",
    "Layihə sənədləşməsini tamamladıq. Ən çox vaxt aparan hissə diaqramlar oldu.",
  ],
  GENERAL: [
    "Sabahkı dərsin materiallarını qrupun ümumi qovluğuna yüklədim.",
    "Kampusda internetin sürətində problem var idi, texniki şöbə düzəltdi.",
    "Kitabxanaya yeni kitablar gəlib — siyahını elanlar lövhəsində gördüm.",
    "Növbəti həftə dərs cədvəlində kiçik dəyişiklik var, diqqətli olun.",
    "Yeməkxananın iş saatları dəyişib: səhər 8:30-dan axşam 18:00-a qədər.",
    "Sinif olaraq ümumi qovluq yaratdıq — konspektləri ora yığaq, hamı üçün rahat olar.",
  ],
};

export const POST_CLOSERS = [
  "Sualı olan şərhdə yazsın.",
  "Fikirlərinizi bilmək maraqlıdır.",
  "Kim qoşulmaq istəyirsə xəbər versin.",
  "Növbəti dəfə daha yaxşı planlaşdıracağıq.",
  "Qeydləri sonra da paylaşacağam.",
  "Təşəkkür edirəm hamıya.",
  "Bu barədə ayrıca yazacağam.",
  "Ümid edirəm faydalı olar.",
] as const;

export const COMMENT_BODIES = [
  "Təşəkkür edirəm, çox faydalı oldu.",
  "Mən də iştirak etmək istəyirəm, harada qeydiyyatdan keçmək olar?",
  "Bu məlumatı axtarırdım, vaxtında paylaşdın.",
  "Təbrik edirəm, layiqincə qazanmısan!",
  "Şəkillər çox gözəldir, arxiv üçün saxlayaq.",
  "Bizim qrupda da eyni problem var idi, belə həll etdik.",
  "Cədvəli dəqiqləşdirə bilərsənmi?",
  "Növbəti dəfə mən də könüllü kimi kömək edərəm.",
  "Materialları qovluğa əlavə etdim, hamı baxa bilər.",
  "Bu mövzuda bir seminar təşkil etsək yaxşı olar.",
  "Razıyam, xüsusilə ikinci bənddə yazdığınla.",
  "Mənim təcrübəm bir az fərqli oldu, sonra danışarıq.",
  "Yaxşı ideyadır, dəstəkləyirəm.",
  "Linki yeniləyə bilərsənmi? Məndə açılmır.",
  "Uğurlar! Nəticəni gözləyirik.",
  "Bunu birinci kurslara da çatdırmaq lazımdır.",
  "Çox səliqəli hazırlanıb, əməyinə sağlıq.",
  "Mən keçən il iştirak etmişdim, tövsiyə edirəm.",
  "Tarixi dəqiqləşdirdikdə xəbər et, cədvəlimə yazım.",
  "Bu barədə dekanlıqla danışmaq daha effektiv olar.",
] as const;

// ---------------------------------------------------------------------------
// 6. Xatirələr (spec §11)
// ---------------------------------------------------------------------------

export interface MemorySeed {
  title: string;
  body: string;
}

export const MEMORY_CONTENT: Record<MemoryType, readonly MemorySeed[]> = {
  SHORT_MEMORY: [
    { title: "Kitabxanada gecə yarısı", body: "Sessiya vaxtı kitabxanada qalıb səhərə qədər oxumuşduq. Nəticədən çox, o gecənin özü yadımda qaldı." },
    { title: "İlk qar", body: "Kampusda ilk qar yağanda bütün qrup dərsdən çıxıb həyətə töküldü. Müəllim də çıxıb bizə baxdı və heç nə demədi." },
    { title: "Yanlış auditoriya", body: "Səhvən başqa qrupun dərsinə girmişdim. Yarım saat oturub qeyd götürdüm, sonra anladım." },
    { title: "Avtobus söhbətləri", body: "Səhər avtobusundakı yarım saatlıq söhbətlər dörd ilin ən yaxşı hissəsi idi." },
    { title: "Kafedradakı çay", body: "Müəllimlərin kafedrasında verilən çay bütün kampusun ən yaxşı çayı idi. Bu, sinifdə açıq sirr sayılırdı." },
  ],
  UNIVERSITY_STORY: [
    { title: "Layihəni bir gecədə dəyişdik", body: "Təqdimatdan bir gün əvvəl layihənin bütün konsepsiyasını dəyişdik. Səhər saat 6-da bitirdik və o gün ən yüksək qiyməti aldıq." },
    { title: "İlk açıq dərsim", body: "Pedaqoji təcrübədə ilk dəfə lövhənin qarşısında dayandığım anı unutmuram. Səsim titrəyirdi, amma 40 dəqiqədən sonra sinif mənimlə idi." },
    { title: "Komanda dağılanda", body: "Üçüncü kursda komandamız yarıda dağıldı. Layihəni iki nəfər bitirdik və bu, mənə məsuliyyəti öyrətdi." },
    { title: "Səhv hesablama", body: "Laboratoriya işində vahidləri qarışdırmışdım. Müəllim gülümsəyib dedi: 'Mühəndis səhvini tapan adamdır.' O cümlə hələ də yadımdadır." },
    { title: "Kitabxanaçı ilə dostluq", body: "Dörd il ərzində kitabxanaçı mənə lazım olan kitabı adı ilə çıxarırdı. Məzuniyyətdə ən çox onunla vidalaşmaq çətin oldu." },
  ],
  THANKS_TEACHER: [
    { title: "Bir cümlə ilə istiqamət verdi", body: "Müəllimim mənə 'sən sual verməyi bacarırsan, bunu itirmə' demişdi. Peşə seçimimi o cümlə müəyyən etdi." },
    { title: "Qapısı həmişə açıq idi", body: "İş saatından sonra da sualımızı cavablandırırdı. Belə müəllimlər universiteti universitet edir." },
    { title: "Sərtliyin dəyəri", body: "Ən sərt qiymət verən müəllim, sonradan ən çox öyrəndiyim müəllim oldu." },
    { title: "Konfransa göndərdi", body: "Məni ilk elmi konfransa o təşviq etdi və tezisimi üç dəfə oxuyub düzəltdi." },
    { title: "Adımı yadda saxladı", body: "İlk dərsdə 60 nəfərin adını öyrənmişdi. O gündən dərsə hazırlaşmamaq mümkün deyildi." },
  ],
  THANKS_CLASSMATE: [
    { title: "Konspekt qəhrəmanı", body: "Xəstələndiyim həftənin bütün konspektlərini mənə köçürüb gətirmişdi. Sessiyanı onun sayəsində bağladım." },
    { title: "Birinci gün əlini uzatdı", body: "İlk gün heç kimi tanımırdım. Yanımda oturub adını dedi və dörd il ən yaxın dostum oldu." },
    { title: "Komandanın sakit adamı", body: "Hər layihədə ən az danışan, ən çox iş görən o idi. Bunu sonradan başa düşdük." },
    { title: "Təqdimatdan əvvəl", body: "Təqdimatdan əvvəl əllərim əsirdi. Çiynimə vurub 'sən bunu bilirsən' dedi — kifayət etdi." },
    { title: "Yataqxana qonşuluğu", body: "İki il eyni otaqda qaldıq. Mübahisələrimiz də oldu, amma indi ən çox onunla danışıram." },
  ],
  UNFORGETTABLE_LESSON: [
    { title: "Statistika dərsi", body: "Müəllim bütün dərsi bir məsələnin üzərində qurdu. O gün rəqəmlərin necə yalan danışa biləcəyini anladım." },
    { title: "Etika seminarı", body: "Auditoriyanı ikiyə bölüb bir-birinin mövqeyini müdafiə etməyə məcbur etdi. Fikirlərimin nə qədər tələsik olduğunu gördüm." },
    { title: "Sahə dərsi", body: "Dərs auditoriyada yox, tikinti sahəsində keçdi. Bir saatda semestrlik biliyi yerinə oturtduq." },
    { title: "Boş lövhə", body: "Müəllim gəlib lövhəyə heç nə yazmadı, sadəcə suallar verdi. Ən çox danışdığımız dərs o oldu." },
    { title: "Layihə təhlili", body: "Uğursuz bir layihəni addım-addım söküb göstərdi. Uğursuzluqdan öyrənmək belə olurmuş." },
  ],
  MEMORABLE_EVENT: [
    { title: "İlk məzuniyyət", body: "Universitetin ilk məzuniyyət mərasimi idi. Hamı bilirdi ki, bu, bir dəfə olacaq." },
    { title: "Yaz festivalı", body: "Kampusda ilk dəfə açıq havada konsert təşkil etdik. Səs sistemi yarıda söndü, amma heç kim getmədi." },
    { title: "Elm günü", body: "Layihələrimizi stendlərdə təqdim etdik. Uşaqlar üçün hazırladığımız təcrübə ən çox diqqət çəkəndi." },
    { title: "Sinif gecəsi", body: "Semestrin sonunda sinifcə görüşdük. Həmin gecənin şəkilləri hələ də qrupda paylaşılır." },
    { title: "Karyera günü", body: "İlk dəfə real işəgötürənlərlə üz-üzə danışdıq. CV-mi orada dörd dəfə düzəltdim." },
  ],
  WHAT_UNI_GAVE_ME: [
    { title: "Sual vermək cəsarəti", body: "Universitetdən əvvəl bilmədiyimi soruşmağa utanırdım. İndi ilk əlini qaldıran mən oluram." },
    { title: "Şəbəkə", body: "Ən böyük qazancım diplom yox, dörd ildə tanıdığım insanlar oldu. İşimi də onların biri vasitəsilə tapdım." },
    { title: "İntizam", body: "Cədvəllə yaşamağı, vaxtı bölməyi burada öyrəndim. Bu bacarıq indi hər gün işimə yarayır." },
    { title: "Fərqli baxış", body: "Fərqli şəhərlərdən gələn insanlarla eyni auditoriyada oturmaq mənə çox şey öyrətdi." },
    { title: "Öz sahəmi tapmaq", body: "İlk kursda nə istədiyimi bilmirdim. Üçüncü kursda seçmə fənn hər şeyi aydınlaşdırdı." },
  ],
  MESSAGE_TO_QU: [
    { title: "Kitabxananı böyüdün", body: "Universitetin ən güclü tərəfi insanlarıdır. Kitabxana fondu bir az da genişlənsə, tam olar." },
    { title: "Məzunlarla əlaqəni saxlayın", body: "Məzunlar universitetin ən yaxşı elçiləridir. Bizi tədbirlərə dəvət etməyə davam edin." },
    { title: "Təcrübə proqramlarını artırın", body: "Şirkətlərlə daha çox müqavilə olsa, tələbələr ikinci kursdan real iş görər." },
    { title: "Tələbə səsini eşidin", body: "Sinif nümayəndələrinin təklifləri çox vaxt praktik olur. Onlara daha çox söz verin." },
    { title: "İlk illəri arxivləşdirin", body: "Universitetin ilk illəri tarixdir. Foto və sənədləri indidən sistemli saxlamaq lazımdır." },
  ],
};

// ---------------------------------------------------------------------------
// 7. Nailiyyətlər (spec §12)
// ---------------------------------------------------------------------------

export interface AchievementSeed {
  title: string;
  description: string;
  organization: string;
}

export const ACHIEVEMENT_CONTENT: Record<AchievementCategory, readonly AchievementSeed[]> = {
  AWARD: [
    { title: "Fərqlənmə təqaüdü", description: "Semestr üzrə ən yüksək orta bala görə fərqlənmə təqaüdü təyin edildi.", organization: "Qarabağ Universiteti" },
    { title: "İlin tələbəsi mükafatı", description: "Akademik göstəricilər və ictimai fəaliyyətə görə fakültə üzrə seçildi.", organization: "Qarabağ Universiteti" },
    { title: "Rektorun təşəkkürnaməsi", description: "Universitetin təmsil olunmasında xüsusi xidmətə görə təşəkkürnamə.", organization: "Qarabağ Universiteti" },
    { title: "Ən yaxşı kurs işi", description: "Fakültə üzrə ən yaxşı kurs işi seçildi və elmi şuranın tövsiyəsini aldı.", organization: "Mühəndislik və Texnologiya fakültəsi" },
  ],
  STARTUP: [
    { title: "Tələbə startapı üçün ilkin investisiya", description: "Kənd təsərrüfatı üçün sadə monitorinq həlli ilə akselerasiya proqramına qəbul olundu.", organization: "Innoland Akselerator" },
    { title: "Startap yarışmasının qalibi", description: "Universitetlərarası startap yarışmasında birinci yeri tutan komandanın həmtəsisçisi.", organization: "Sahibkarlıq Mərkəzi" },
    { title: "İlk müştəri müqaviləsi", description: "Tələbə layihəsi kimi başlayan məhsul ilk kommersiya müqaviləsini imzaladı.", organization: "QU Startap Mərkəzi" },
    { title: "Akselerasiya proqramına qəbul", description: "Regional akselerasiya proqramının payız dövrünə seçildi.", organization: "Baku Innovation Hub" },
  ],
  PUBLICATION: [
    { title: "Tələbə konfransı materialları", description: "Elmi tezis universitetin illik tələbə konfransı toplusunda dərc olundu.", organization: "Qarabağ Universiteti" },
    { title: "Beynəlxalq jurnalda məqalə", description: "Həmmüəllif olduğu araşdırma beynəlxalq resenziyalı jurnalda çap edildi.", organization: "Journal of Applied Sciences" },
    { title: "Metodik vəsait", description: "Kiçik həcmli metodik vəsaitin hazırlanmasında iştirak etdi.", organization: "Təbiət və Humanitar Elmlər fakültəsi" },
    { title: "Konfrans posteri", description: "Poster təqdimatı beynəlxalq konfransın tələbə bölməsinə qəbul edildi.", organization: "Regional Research Forum" },
  ],
  GRANT: [
    { title: "Tədqiqat qrantı", description: "Bölgənin su resurslarının monitorinqi üzrə tələbə tədqiqat qrantı qazandı.", organization: "Elmin İnkişafı Fondu" },
    { title: "Mobillik qrantı", description: "Bir semestrlik mübadilə proqramı üçün mobillik qrantı aldı.", organization: "Erasmus+ proqramı" },
    { title: "Sosial layihə qrantı", description: "Bölgə məktəbləri üçün təhsil layihəsinə kiçik qrant ayrıldı.", organization: "Gənclər Fondu" },
    { title: "Konfrans iştirak qrantı", description: "Beynəlxalq konfransda çıxış üçün səfər qrantı təqdim edildi.", organization: "Elmin İnkişafı Fondu" },
  ],
  INTERNATIONAL_PROGRAM: [
    { title: "Mübadilə semestri", description: "Bir semestrlik mübadilə proqramında iştirak etdi və kreditləri tam transfer olundu.", organization: "Erasmus+ proqramı" },
    { title: "Yay məktəbi", description: "Beynəlxalq yay məktəbinin məlumat elmləri modulunu tamamladı.", organization: "Central European Summer School" },
    { title: "Beynəlxalq könüllü proqramı", description: "İki həftəlik beynəlxalq könüllü düşərgəsində iştirak etdi.", organization: "AIESEC" },
    { title: "Model BMT konfransı", description: "Beynəlxalq Model BMT konfransında universiteti təmsil etdi.", organization: "International MUN" },
  ],
  SPORTS: [
    { title: "Universitetlərarası turnir — I yer", description: "Universitetlərarası futbol turnirində komanda birinci yeri tutdu.", organization: "Tələbə İdman Federasiyası" },
    { title: "Şahmat çempionatı — II yer", description: "Regional tələbə şahmat çempionatında ikinci yer.", organization: "Şahmat Federasiyası" },
    { title: "Yarımmaraton iştirakçısı", description: "21 km məsafəni nəticə ilə tamamladı.", organization: "Baku Marathon" },
    { title: "Voleybol liqası — final", description: "Universitet komandası ilə tələbə liqasının finalına yüksəldi.", organization: "Tələbə İdman Federasiyası" },
  ],
  VOLUNTEERING: [
    { title: "100 saat könüllülük", description: "İl ərzində 100 saatdan çox könüllü fəaliyyət sertifikatı aldı.", organization: "Könüllülər Təşkilatı" },
    { title: "Məktəb mentorluğu", description: "Bölgə məktəblərində şagirdlərə həftəlik mentorluq etdi.", organization: "QU Könüllülər Klubu" },
    { title: "Ekoloji aksiya koordinatoru", description: "Kampusun ekoloji təmizlik aksiyasını koordinasiya etdi.", organization: "Qarabağ Universiteti" },
    { title: "Qan donorluğu təşkilatçısı", description: "Universitetdə qan donorluğu aksiyasının təşkilinə rəhbərlik etdi.", organization: "Qan Bankı" },
  ],
  CAREER: [
    { title: "İlk tam ştat iş təklifi", description: "Təcrübə proqramından sonra tam ştat vəzifəyə dəvət aldı.", organization: "Texnologiya şirkəti" },
    { title: "Vəzifə yüksəlişi", description: "İki il ərzində komanda rəhbəri vəzifəsinə yüksəldi.", organization: "Bank sektoru" },
    { title: "Peşəkar sertifikat", description: "Beynəlxalq peşəkar sertifikatın birinci mərhələsini uğurla keçdi.", organization: "ACCA" },
    { title: "Beynəlxalq şirkətə qəbul", description: "Beynəlxalq şirkətin gənc mütəxəssis proqramına seçildi.", organization: "Graduate Programme" },
  ],
  SOCIAL_PROJECT: [
    { title: "Kitab toplama kampaniyası", description: "Rayon kitabxanası üçün 1200-dən çox kitab toplandı.", organization: "QU Könüllülər Klubu" },
    { title: "Rəqəmsal savadlılıq layihəsi", description: "Yaşlılar üçün onlayn xidmətlərdən istifadə təlimləri təşkil edildi.", organization: "Gənclər Mərkəzi" },
    { title: "Məktəblilər üçün karyera günü", description: "Altı məktəbdə karyera yönümləndirmə sessiyaları keçirildi.", organization: "QU Karyera Mərkəzi" },
    { title: "Bərpa olunan enerji maarifləndirməsi", description: "Kampusda enerji qənaəti üzrə maarifləndirmə kampaniyası aparıldı.", organization: "Ekologiya Klubu" },
  ],
  COMPETITION: [
    { title: "Proqramlaşdırma olimpiadası — III yer", description: "Respublika səviyyəli komanda yarışında üçüncü yer.", organization: "Respublika Olimpiadası" },
    { title: "Keys yarışması finalçısı", description: "Universitetlərarası biznes keys yarışmasının finalına yüksəldi.", organization: "Business Case Cup" },
    { title: "Hakaton qalibi", description: "36 saatlıq hakatonda işləyən prototiplə birinci yeri tutdu.", organization: "Regional Hackathon" },
    { title: "Debat turniri — yarımfinal", description: "Milli tələbə debat turnirinin yarımfinalına çıxdı.", organization: "Debat Federasiyası" },
  ],
  PATENT: [
    { title: "Faydalı model müraciəti", description: "Suvarma sistemləri üçün sadə tənzimləyici üzrə faydalı model müraciəti qeydə alındı.", organization: "Əqli Mülkiyyət Agentliyi" },
    { title: "Proqram təminatının qeydiyyatı", description: "Hazırlanan proqram təminatı müəllif hüququ reyestrində qeydiyyatdan keçdi.", organization: "Əqli Mülkiyyət Agentliyi" },
    { title: "Sənaye nümunəsi", description: "Laboratoriya avadanlığı üçün sənaye nümunəsi müraciəti təqdim edildi.", organization: "Əqli Mülkiyyət Agentliyi" },
    { title: "Kollektiv patent müraciəti", description: "Kafedra ilə birgə patent müraciətinin həmmüəllifi oldu.", organization: "Qarabağ Universiteti" },
  ],
  REPRESENTATION: [
    { title: "Tələbə şurasının üzvü", description: "Fakültə üzrə tələbə şurasına seçildi.", organization: "Tələbə Şurası" },
    { title: "Sinif nümayəndəsi", description: "İki il ardıcıl sinif nümayəndəsi seçildi.", organization: "Qarabağ Universiteti" },
    { title: "Beynəlxalq forumda təmsilçilik", description: "Beynəlxalq gənclər forumunda universiteti təmsil etdi.", organization: "Youth Forum" },
    { title: "Məzunlar şurasının üzvü", description: "Universitetin məzunlar şurasının ilk tərkibinə daxil oldu.", organization: "QU Məzunlar Şurası" },
  ],
};

// ---------------------------------------------------------------------------
// 8. Tədbirlər (spec §14, §15)
// ---------------------------------------------------------------------------

export interface EventSeed {
  title: string;
  description: string;
  agenda: string;
  category: EventCategory;
  scope: EventScope;
  location: string;
  isOnline: boolean;
  /** Bugünə (NOW) nisbətən gün fərqi — mənfi = keçmiş. */
  dayOffset: number;
  durationHours: number;
  capacity: number;
}

export const EVENTS: readonly EventSeed[] = [
  // --- Keçmiş (15) ---
  { title: "Qarabağ Universiteti Elm Günü 2025", description: "Tələbə layihələrinin stend təqdimatı və qısa çıxışlar.", agenda: "10:00 açılış\n10:30 stend təqdimatları\n14:00 münsiflərin qiymətləndirməsi\n16:00 mükafatlandırma", category: "CEREMONY", scope: "UNIVERSITY", location: "Baş korpus, akt zalı", isOnline: false, dayOffset: -420, durationHours: 6, capacity: 300 },
  { title: "Kibertəhlükəsizlik üzrə praktik seminar", description: "Şəbəkə təhlükəsizliyinin əsasları və sadə hücum ssenarilərinin təhlili.", agenda: "14:00 nəzəri hissə\n15:30 laboratoriya işi\n17:00 sual-cavab", category: "SEMINAR", scope: "FACULTY", location: "Laboratoriya 214", isOnline: false, dayOffset: -365, durationHours: 3, capacity: 40 },
  { title: "Şuşaya tələbə səfəri", description: "Tarixi abidələrə baxış və bərpa işləri ilə tanışlıq.", agenda: "07:00 hərəkət\n11:00 şəhər turu\n15:00 bərpa sahəsinə baxış\n19:00 qayıdış", category: "TRIP", scope: "UNIVERSITY", location: "Şuşa", isOnline: false, dayOffset: -300, durationHours: 12, capacity: 50 },
  { title: "Karyera Günü — payız", description: "İşəgötürənlərlə görüş, CV məsləhətləri və qısa müsahibələr.", agenda: "11:00 şirkət stendləri\n13:00 panel müzakirə\n15:00 fərdi görüşlər", category: "CAREER", scope: "UNIVERSITY", location: "Foye və konfrans zalı", isOnline: false, dayOffset: -250, durationHours: 5, capacity: 250 },
  { title: "Debat turniri — daxili mərhələ", description: "Klublararası debat turnirinin qrup mərhələsi.", agenda: "12:00 püşkatma\n12:30 raundlar\n17:00 nəticələr", category: "COMPETITION", scope: "CLUB", location: "Auditoriya 105", isOnline: false, dayOffset: -210, durationHours: 5, capacity: 60 },
  { title: "Məlumat analitikası emalatxanası", description: "Elektron cədvəllərdən vizuallaşdırmaya qədər praktik iş.", agenda: "10:00 giriş\n11:00 praktika\n13:00 komanda tapşırığı", category: "WORKSHOP", scope: "FACULTY", location: "Kompüter zalı 3", isOnline: false, dayOffset: -180, durationHours: 4, capacity: 30 },
  { title: "Maliyyə 2018 — məzunların görüşü", description: "Buraxılışdan sonrakı ilk böyük görüş və qeyri-rəsmi söhbət.", agenda: "18:00 qeydiyyat\n18:30 xatirələr\n20:00 şam yeməyi", category: "SOCIAL", scope: "REUNION", location: "Şəhər mərkəzi, restoran zalı", isOnline: false, dayOffset: -150, durationHours: 4, capacity: 60 },
  { title: "Yaz festivalı", description: "Açıq havada musiqi, tələbə stendləri və klub təqdimatları.", agenda: "15:00 açılış\n16:00 klub stendləri\n18:00 konsert", category: "SOCIAL", scope: "UNIVERSITY", location: "Kampus həyəti", isOnline: false, dayOffset: -120, durationHours: 6, capacity: 400 },
  { title: "Pedaqoji təcrübə üzrə hazırlıq görüşü", description: "Məktəb təcrübəsinin sənədləşməsi və qiymətləndirmə meyarları.", agenda: "13:00 təlimat\n14:00 sual-cavab", category: "MEETING", scope: "CLASS", location: "Auditoriya 302", isOnline: false, dayOffset: -95, durationHours: 2, capacity: 30 },
  { title: "Psixologiya 2019 — beşillik görüş", description: "Sinif yoldaşlarının illik görüşü və qısa xatirə sessiyası.", agenda: "17:00 görüş\n18:00 xatirə paylaşımı\n19:30 şam", category: "SOCIAL", scope: "REUNION", location: "Kampus kafeteriyası", isOnline: false, dayOffset: -70, durationHours: 4, capacity: 40 },
  { title: "Onlayn seminar: akademik yazı", description: "Elmi mətnin strukturu, mənbələrə istinad və plagiat qaydaları.", agenda: "19:00 mühazirə\n20:00 nümunə təhlili", category: "SEMINAR", scope: "UNIVERSITY", location: "Onlayn", isOnline: true, dayOffset: -55, durationHours: 2, capacity: 200 },
  { title: "Aqrar sahə təcrübəsi", description: "Təsərrüfat sahəsində praktik dərs və nümunə götürmə.", agenda: "09:00 hərəkət\n10:00 sahə işi\n14:00 hesabat", category: "TRIP", scope: "FACULTY", location: "Təcrübə sahəsi", isOnline: false, dayOffset: -40, durationHours: 6, capacity: 25 },
  { title: "İT klubu — versiya nəzarəti emalatxanası", description: "Komanda ilə kod idarəetməsinin praktik əsasları.", agenda: "16:00 giriş\n17:00 praktika", category: "WORKSHOP", scope: "CLUB", location: "Kompüter zalı 1", isOnline: false, dayOffset: -28, durationHours: 3, capacity: 35 },
  { title: "Sinif görüşü — semestrin yekunu", description: "Semestr nəticələrinin müzakirəsi və növbəti dövrün planlaması.", agenda: "15:00 yekun\n16:00 planlaşdırma", category: "MEETING", scope: "CLASS", location: "Auditoriya 201", isOnline: false, dayOffset: -18, durationHours: 2, capacity: 30 },
  { title: "Yay təcrübəsi üzrə brifinq", description: "Təcrübə yerləri, sənədlər və hesabat qaydaları haqqında məlumat.", agenda: "11:00 brifinq\n12:00 suallar", category: "OTHER", scope: "FACULTY", location: "Konfrans zalı", isOnline: false, dayOffset: -9, durationHours: 2, capacity: 80 },

  // --- Gələcək (10) ---
  { title: "Yeni tələbələr üçün onlayn tanışlıq görüşü", description: "2026 qəbulu üçün qeyri-rəsmi tanışlıq və suallar.", agenda: "19:00 tanışlıq\n19:30 sual-cavab", category: "MEETING", scope: "CLASS", location: "Onlayn", isOnline: true, dayOffset: 5, durationHours: 2, capacity: 60 },
  { title: "Kampus turu — yeni qəbul", description: "Korpuslar, kitabxana, yeməkxana və yataqxana ilə tanışlıq.", agenda: "10:00 toplanma\n10:30 tur\n12:30 sual-cavab", category: "MEETING", scope: "UNIVERSITY", location: "Baş korpus girişi", isOnline: false, dayOffset: 12, durationHours: 3, capacity: 120 },
  { title: "Oriyentasiya həftəsi — açılış", description: "Akademik qaydalar, kredit sistemi və dəstək xidmətləri.", agenda: "09:30 açılış\n10:00 akademik təlimat\n12:00 klub təqdimatları", category: "CEREMONY", scope: "UNIVERSITY", location: "Akt zalı", isOnline: false, dayOffset: 20, durationHours: 5, capacity: 300 },
  { title: "Tədris ilinin açılışı", description: "Yeni tədris ilinin rəsmi açılış mərasimi.", agenda: "10:00 mərasim\n11:00 fakültə görüşləri", category: "CEREMONY", scope: "UNIVERSITY", location: "Kampus həyəti", isOnline: false, dayOffset: 27, durationHours: 4, capacity: 500 },
  { title: "Klublar yarmarkası", description: "Bütün tələbə klublarının stend təqdimatı və qeydiyyat.", agenda: "13:00 stendlər\n16:00 qısa təqdimatlar", category: "SOCIAL", scope: "UNIVERSITY", location: "Foye", isOnline: false, dayOffset: 35, durationHours: 4, capacity: 250 },
  { title: "Karyera Günü — payız 2026", description: "Şirkət stendləri, panel və fərdi görüşlər.", agenda: "11:00 stendlər\n13:00 panel\n15:00 görüşlər", category: "CAREER", scope: "UNIVERSITY", location: "Konfrans zalı", isOnline: false, dayOffset: 45, durationHours: 5, capacity: 250 },
  { title: "Universitetlərarası hakaton", description: "36 saatlıq komanda yarışı — real problemlər üzərində prototip.", agenda: "1-ci gün 10:00 açılış\n2-ci gün 22:00 təqdimatlar", category: "COMPETITION", scope: "UNIVERSITY", location: "İnnovasiya mərkəzi", isOnline: false, dayOffset: 60, durationHours: 36, capacity: 100 },
  { title: "Məzunlar görüşü — payız", description: "Bütün buraxılışlar üçün ümumi məzun görüşü.", agenda: "17:00 qeydiyyat\n18:00 çıxışlar\n19:30 şəbəkələşmə", category: "SOCIAL", scope: "REUNION", location: "Akt zalı", isOnline: false, dayOffset: 75, durationHours: 4, capacity: 150 },
  { title: "Elmi yazı üzrə emalatxana", description: "Tezis hazırlığı və konfrans müraciətləri üçün praktik seminar.", agenda: "14:00 struktur\n15:30 redaktə praktikası", category: "WORKSHOP", scope: "FACULTY", location: "Auditoriya 106", isOnline: false, dayOffset: 95, durationHours: 3, capacity: 45 },
  { title: "Qış idman turniri", description: "Fakültələrarası mini-futbol və stolüstü tennis turniri.", agenda: "10:00 qrup mərhələsi\n15:00 final", category: "COMPETITION", scope: "CLUB", location: "İdman kompleksi", isOnline: false, dayOffset: 120, durationHours: 7, capacity: 120 },
] as const;

// ---------------------------------------------------------------------------
// 9. Klublar
// ---------------------------------------------------------------------------

export interface ClubSeed {
  name: string;
  slug: string;
  category: ClubCategory;
  description: string;
}

export const CLUBS: readonly ClubSeed[] = [
  { name: "Debat Klubu", slug: "debat-klubu", category: "ACADEMIC", description: "Həftəlik debat məşqləri, turnirlərə hazırlıq və ictimai çıxış təlimləri." },
  { name: "İT və Proqramlaşdırma Klubu", slug: "it-proqramlasdirma-klubu", category: "TECH", description: "Emalatxanalar, hakatonlar və açıq mənbəli layihələr üzərində komanda işi." },
  { name: "Karyera və Sahibkarlıq Klubu", slug: "karyera-sahibkarliq-klubu", category: "ACADEMIC", description: "CV emalatxanaları, işəgötürənlərlə görüşlər və startap ideyalarının müzakirəsi." },
  { name: "Könüllülər Klubu", slug: "konullular-klubu", category: "SOCIAL", description: "Bölgə məktəbləri, ekoloji aksiyalar və sosial layihələr üzrə könüllü fəaliyyət." },
  { name: "İdman Klubu", slug: "idman-klubu", category: "SPORTS", description: "Universitet komandaları, daxili turnirlər və həftəlik məşq cədvəli." },
  { name: "Mədəniyyət və İncəsənət Klubu", slug: "medeniyyet-incesenet-klubu", category: "ARTS", description: "Kitab müzakirələri, foto sərgiləri, teatr və musiqi layihələri." },
] as const;

// ---------------------------------------------------------------------------
// 10. Where Are We Now — karyera datası
// ---------------------------------------------------------------------------

export const COUNTRIES: readonly { country: string; cities: readonly string[] }[] = [
  { country: "Azərbaycan", cities: ["Bakı", "Gəncə", "Sumqayıt", "Xankəndi", "Şuşa", "Mingəçevir"] },
  { country: "Türkiyə", cities: ["İstanbul", "Ankara", "İzmir", "Antalya"] },
  { country: "Almaniya", cities: ["Berlin", "Münhen", "Hamburq", "Köln"] },
  { country: "Böyük Britaniya", cities: ["London", "Mançester", "Edinburq"] },
  { country: "ABŞ", cities: ["Nyu-York", "Boston", "Sietl", "Ostin"] },
  { country: "Kanada", cities: ["Toronto", "Vankuver", "Monreal"] },
  { country: "Niderland", cities: ["Amsterdam", "Rotterdam", "Eyndhoven"] },
  { country: "Polşa", cities: ["Varşava", "Krakov", "Vroslav"] },
  { country: "Gürcüstan", cities: ["Tbilisi", "Batumi"] },
  { country: "Birləşmiş Ərəb Əmirlikləri", cities: ["Dubay", "Əbu-Dabi"] },
  { country: "Qazaxıstan", cities: ["Almatı", "Astana"] },
  { country: "İtaliya", cities: ["Milan", "Roma", "Turin"] },
  { country: "Fransa", cities: ["Paris", "Lion", "Tuluza"] },
  { country: "İsveç", cities: ["Stokholm", "Göteborq"] },
  { country: "Çexiya", cities: ["Praqa", "Brno"] },
] as const;

export const COMPANIES = [
  "Azercell", "Bakcell", "Nar", "Kapital Bank", "PAŞA Bank", "ABB",
  "SOCAR", "BP Azerbaijan", "AZAL", "Wolt", "PashaPay", "Ultra Technologies",
  "Sinam", "R.I.S.K Company", "Bestcomp Group", "AzInTelecom", "Delta Telecom",
  "Azərpoçt", "Baku Steel Company", "Azersun Holding", "Gilan Holding",
  "Veysəloğlu", "Bravo", "Trendyol", "Getir", "Turkcell", "Aselsan",
  "Siemens", "Bosch", "SAP", "Deloitte", "EY", "PwC", "KPMG",
  "Microsoft", "Booking.com", "Revolut", "N26", "Zalando", "Accenture",
] as const;

export const POSITIONS = [
  "Proqram təminatı mühəndisi", "Məlumat analitiki", "Kibertəhlükəsizlik mütəxəssisi",
  "Sistem administratoru", "Layihə meneceri", "Biznes analitiki",
  "Maliyyə analitiki", "Kredit mütəxəssisi", "Audit üzrə köməkçi",
  "Marketinq mütəxəssisi", "Rəqəmsal marketinq üzrə mütəxəssis", "Məzmun redaktoru",
  "İngilis dili müəllimi", "Məktəb psixoloqu", "Tədris koordinatoru",
  "Aqronom", "Keyfiyyətə nəzarət mütəxəssisi", "Layihə mühəndisi",
  "İnsan resursları üzrə mütəxəssis", "Məhsul meneceri",
] as const;

export const CAREER_DESCRIPTIONS = [
  "Komanda ilə birgə məhsulun yeni modullarının hazırlanmasında iştirak edirəm.",
  "Gündəlik hesabatların avtomatlaşdırılması və məlumat keyfiyyətinə nəzarət mənim məsuliyyətimdədir.",
  "Müştəri layihələrində tələblərin toplanması və sənədləşdirilməsi ilə məşğulam.",
  "Şöbənin illik büdcə planlamasına dəstək verirəm.",
  "Tədris proqramının hazırlanması və dərs materiallarının yenilənməsi üzərində işləyirəm.",
  "İnfrastrukturun monitorinqi və insident cavablandırma prosesində növbətçilik edirəm.",
  "Kampaniyaların planlanması və nəticələrinin təhlili mənim üzərimdədir.",
  "Sahə işlərinin koordinasiyası və hesabatlılığı ilə məşğulam.",
] as const;

export const INSTITUTIONS = [
  "Qarabağ Universiteti", "Bakı Dövlət Universiteti", "ADA Universiteti",
  "Azərbaycan Dövlət İqtisad Universiteti", "Boğaziçi Üniversitesi",
  "Technical University of Munich", "University of Warsaw", "KU Leuven",
  "University of Edinburgh", "Charles University", "Tbilisi State University",
  "Middle East Technical University",
] as const;

export const EDUCATION_FIELDS = [
  "Kompüter elmləri", "İnformasiya təhlükəsizliyi", "Maliyyə", "Biznes idarəetməsi",
  "Təhsil menecmenti", "Psixologiya", "Riyaziyyat", "Aqrar iqtisadiyyat",
  "Məlumat elmləri", "Beynəlxalq münasibətlər",
] as const;

export const SUPPORT_OFFER_NOTES = [
  "Semestrdə bir dəfə onlayn qoşula bilərəm.",
  "Bakıda görüşmək mümkündür, əvvəlcədən razılaşaq.",
  "Şirkətimizin təcrübə proqramı hər il yanvarda müraciət qəbul edir.",
  "İş axtaran məzunlara CV baxışı ilə kömək edə bilərəm.",
  "Aylıq bir mentorluq sessiyası üçün vaxt ayıra bilərəm.",
  "Komandamız tələbə layihələri ilə əməkdaşlığa açıqdır.",
  "Tədbirlərdə çıxış üçün ən azı iki həftə əvvəl xəbər verin.",
  "Onlayn formatda daha rahatam.",
] as const;

// ---------------------------------------------------------------------------
// 11. Xankəndi Bələdçisi (spec §3)
// ---------------------------------------------------------------------------

export interface GuidePlaceSeed {
  category: GuideCategory;
  title: string;
  description: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  openingHours?: string;
  isEmergency?: boolean;
}

export const GUIDE_PLACES: readonly GuidePlaceSeed[] = [
  { category: "HISTORY", title: "Xankəndi haqqında qısa məlumat", description: "Xankəndi Qarabağ bölgəsinin inzibati mərkəzlərindən biridir. Şəhər dağətəyi ərazidə yerləşir, iqlimi yaydan sərin, qışdan mülayimdir. Yeni gələnlər üçün ən vacib məqam məsafələrin qısa olmasıdır — mərkəzdən əsas obyektlərə piyada getmək mümkündür." },
  { category: "HISTORY", title: "Şəhərin bərpa və quruculuq işləri", description: "Son illərdə şəhərdə infrastruktur, yol və mənzil fondunun bərpası üzrə geniş işlər aparılır. Tələbələr üçün bu, kampus ətrafında daim dəyişən mənzərə deməkdir; bəzi küçələr müvəqqəti bağlana bilər, marşrutu əvvəlcədən yoxlayın." },
  { category: "HISTORY", title: "Qarabağ Universitetinin təsis tarixi", description: "Universitet bölgənin təhsil mərkəzi kimi yaradılıb və ilk qəbulunu yeni kampusda həyata keçirib. İlk buraxılışlar universitetin tarixini formalaşdıran nəsil sayılır — bu platformadakı Timeline məhz o dövrü sənədləşdirmək üçündür." },

  { category: "LANDMARK", title: "Şəhər meydanı", description: "Şəhərin mərkəzi toplanış nöqtəsi. Rəsmi tədbirlər və bayram proqramları burada keçirilir. Tələbələr üçün ən çox istifadə olunan görüş yeridir.", address: "Mərkəz", lat: 39.8154, lng: 46.7519 },
  { category: "LANDMARK", title: "Mərkəzi xiyaban", description: "Meydandan başlayan piyada zonası. Kafelər, mağazalar və oturacaqlar boyunca uzanır; axşam saatlarında ən canlı yerdir.", address: "Mərkəzi xiyaban", lat: 39.8161, lng: 46.7532 },
  { category: "LANDMARK", title: "Şəhər parkı", description: "Kölgəli yolları və oturma zonaları olan böyük park. Dərs arasında oxumaq və ya qısa gəzinti üçün əlverişlidir.", address: "Park ərazisi", lat: 39.8138, lng: 46.7495, openingHours: "Hər gün 07:00–23:00" },
  { category: "LANDMARK", title: "Baxış meydançası", description: "Şəhərin yuxarı hissəsindəki baxış nöqtəsi. Səhər saatlarında mənzərə daha aydın olur. Piyada qalxmaq təxminən 25 dəqiqə çəkir.", lat: 39.8207, lng: 46.7568 },

  { category: "TRANSPORT", title: "Şəhərdaxili avtobus marşrutları", description: "Şəhərdaxili marşrutlar mərkəzdən yaşayış massivlərinə və kampus istiqamətinə işləyir. Ödəniş kartla və nağd mümkündür. Pik saatlar səhər 08:00–09:00 və axşam 17:00–18:30 arasıdır.", openingHours: "06:30–22:00" },
  { category: "TRANSPORT", title: "Avtovağzal və şəhərlərarası reyslər", description: "Şəhərlərarası avtobuslar buradan yola düşür. Bakı istiqamətinə reyslər əsasən səhər və axşam saatlarındadır; bilet üçün əvvəlcədən zəng etmək tövsiyə olunur.", address: "Avtovağzal ərazisi", phone: "+994 47 200 12 40", openingHours: "06:00–21:00" },
  { category: "TRANSPORT", title: "Taksi və təxmini qiymətlər", description: "Şəhərdaxili gediş qısa məsafələr üçün ucuzdur. Minməzdən əvvəl qiyməti dəqiqləşdirin və ya sayğaclı xidmətə üstünlük verin. Gecə saatlarında tarif fərqlənə bilər.", phone: "+994 47 200 55 55" },

  { category: "ROUTE_TO_UNI", title: "Mərkəzdən universitetə piyada marşrut", description: "Şəhər meydanından kampusa piyada təxminən 20–25 dəqiqə çəkir. Marşrut mərkəzi xiyabandan keçir, yol boyu səki və işıqlandırma var. Səhər saatlarında ən sərfəli variantdır." },
  { category: "ROUTE_TO_UNI", title: "Yataqxanadan kampusa gediş", description: "Yataqxana ilə kampus arasında müntəzəm servis avtobusu işləyir. Səhər ilk reys 07:40-da, axşam son reys 19:00-dadır. Cədvəl yataqxana girişindəki lövhədə yenilənir." },
  { category: "ROUTE_TO_UNI", title: "Səhər sıxlığı və vaxt planlaması", description: "08:15–08:45 arasında həm avtobuslarda, həm də kampus girişində sıxlıq olur. İlk dərsi 09:00-da olanlara evdən 20 dəqiqə tez çıxmaq tövsiyə edilir." },

  { category: "MARKET", title: "Mərkəzi bazar", description: "Meyvə-tərəvəz, süd məhsulları və ev üçün lazım olan əşyalar. Səhər saatlarında məhsul seçimi daha genişdir, qiymətlər isə həftəsonu bir qədər yüksək olur.", address: "Bazar küçəsi", openingHours: "08:00–19:00" },
  { category: "MARKET", title: "Gündəlik ərzaq mağazaları", description: "Yaşayış massivlərində və kampus ətrafında kiçik ərzaq mağazaları var. Əksəriyyəti gec saatlara qədər işləyir və kartla ödəniş qəbul edir.", openingHours: "08:00–23:00" },
  { category: "MARKET", title: "Qırtasiyə və kitab mağazası", description: "Dəftər, çap və cildləmə xidmətləri. Kurs işi və buraxılış layihəsi mövsümündə növbə olur — sənədləri əvvəlcədən çap etdirin.", openingHours: "09:00–18:00" },

  { category: "SERVICE", title: "Bank filialı və bankomatlar", description: "Şəhər mərkəzində bank filialı və bir neçə bankomat var. Tələbə kartının açılması üçün şəxsiyyət vəsiqəsi və universitetdən arayış tələb olunur.", openingHours: "B.e.–C. 09:30–17:30" },
  { category: "SERVICE", title: "Poçt şöbəsi", description: "Məktub və bağlama xidmətləri, kommunal ödənişlər. Bağlamalar üçün şəxsiyyət vəsiqəsi mütləqdir.", openingHours: "09:00–18:00" },
  { category: "SERVICE", title: "Mobil operator xidmət mərkəzi", description: "Nömrə qeydiyyatı, tarif dəyişikliyi və internet paketləri. Tələbələr üçün endirimli paketlər mövsümi olaraq təklif edilir.", openingHours: "10:00–19:00" },

  { category: "HEALTH", title: "Şəhər xəstəxanası", description: "Təcili və planlı tibbi yardım. Universitetdən arayış və tibbi sığorta sənədini özünüzlə götürün.", address: "Xəstəxana küçəsi", phone: "+994 47 200 10 03", openingHours: "24 saat", isEmergency: true },
  { category: "HEALTH", title: "Təcili tibbi yardım — 103", description: "Təcili hallarda 103 nömrəsinə zəng edin. Operator ünvanı və vəziyyəti soruşacaq — sakit danışın və dəqiq yer göstərin. Kampusda olduqda təhlükəsizlik xidmətinə də xəbər verin.", phone: "103", isEmergency: true },
  { category: "HEALTH", title: "Aptek və növbətçilik", description: "Mərkəzdə bir neçə aptek işləyir; ən azı biri gecə növbətçisidir. Reseptlə verilən dərmanlar üçün həkim təyinatı tələb olunur.", openingHours: "08:00–22:00 (bir aptek 24 saat)" },

  { category: "CULTURE", title: "Mədəniyyət mərkəzi", description: "Konsertlər, teatr tamaşaları və tələbə çıxışları üçün zal. Universitet tədbirlərinin bir hissəsi burada keçirilir.", openingHours: "10:00–20:00" },
  { category: "CULTURE", title: "Şəhər kitabxanası", description: "Oxu zalı və dövri mətbuat bölməsi. Universitet kitabxanasında olmayan bəzi mənbələr burada tapılır. Qeydiyyat üçün şəxsiyyət vəsiqəsi kifayətdir.", openingHours: "09:00–19:00" },
  { category: "CULTURE", title: "Sərgi zalı", description: "Rəssamlıq və fotoqrafiya sərgiləri üçün məkan. Tələbə klubları burada pulsuz sərgi təşkil edə bilir — müraciət mədəniyyət şöbəsinədir." },

  { category: "LEISURE", title: "İdman kompleksi", description: "Zal, açıq meydança və stolüstü tennis. Universitet tələbələri üçün həftənin müəyyən saatlarında güzəştli giriş var.", openingHours: "08:00–22:00" },
  { category: "LEISURE", title: "Kafelər və görüş yerləri", description: "Mərkəzi xiyaban boyunca bir neçə kafe var; çoxunda pulsuz internet mövcuddur. Qrup işi üçün ən rahatı gündüz saatlarıdır." },

  { category: "SAFETY", title: "Təhlükəsizlik qaydaları", description: "Şəhərdən kənara, xüsusilə işarələnməmiş sahələrə fərdi gəzinti təşkil etməyin. Yürüş və səfərləri universitetin və ya rəsmi turların təşkilatçılığı ilə edin. Kampusdan kənara çıxarkən qrup yoldaşlarınızdan birinə yerinizi bildirin." },
  { category: "SAFETY", title: "Faydalı təcili nömrələr", description: "Vahid çağrı mərkəzi 112, təcili tibbi yardım 103, polis 102, yanğından mühafizə 101. Universitetin təhlükəsizlik xidməti kampus girişində 24 saat növbətçidir.", phone: "112", isEmergency: true },

  { category: "TIP", title: "Yeni gələnlər üçün 10 praktik məsləhət", description: "1) Sənədlərin surətini ayrıca qovluqda saxlayın. 2) Tələbə biletini ilk həftə alın. 3) Kitabxana qeydiyyatını gecikdirməyin. 4) Avtobus cədvəlini telefonunuza yazın. 5) Səhər 20 dəqiqə tez çıxın. 6) Yağış üçün nazik gödəkçə saxlayın — hava tez dəyişir. 7) Kartla yanaşı bir az nağd olsun. 8) Qrupun ümumi qovluğuna qoşulun. 9) İlk aydan ən azı bir kluba yazılın. 10) Sual verməkdən çəkinməyin — burada hamı yenidir." },
] as const;

// ---------------------------------------------------------------------------
// 12. FAQ və ContentPage
// ---------------------------------------------------------------------------

export interface FaqSeed {
  question: string;
  answer: string;
  category: FaqCategory;
}

export const FAQS: readonly FaqSeed[] = [
  { category: "GENERAL", question: "QU CLASS nədir?", answer: "QU CLASS Qarabağ Universitetinin tələbə və məzun sinif platformasıdır. Eyni sinif səhifəsi qəbuldan məzuniyyətə və sonrasına qədər açıq qalır." },
  { category: "GENERAL", question: "Platformadan kimlər istifadə edə bilər?", answer: "Universitetə qəbul olunmuş tələbələr, hazırkı tələbələr və məzunlar. Giriş universitet e-poçtu (@qu.edu.az) ilə həyata keçirilir." },
  { category: "GENERAL", question: "Sinif səhifəm məzuniyyətdən sonra bağlanır?", answer: "Xeyr. Səhifə bağlanmır — sadəcə məzmun və bölmələrin sırası mərhələyə uyğun dəyişir." },
  { category: "GENERAL", question: "Məlumatlarımı kim görür?", answer: "Hər sahə üçün ayrıca görünürlük təyin edə bilərsiniz: ictimai, universitet daxili, yalnız sinif və ya şəxsi. Telefon və şəxsi e-poçt standart olaraq şəxsidir." },
  { category: "GENERAL", question: "Hesabımı silə bilərəmmi?", answer: "Bəli. Profil parametrlərindən silinmə tələbi göndərə bilərsiniz; tələb 30 gün ərzində icra olunur." },

  { category: "ADMISSION", question: "Qəbul nəticələrindən sonra nə etməliyəm?", answer: "Universitet e-poçtunuzu aktivləşdirin, QU CLASS-da qeydiyyatdan keçin və fakültə, ixtisas, qəbul ilini seçin — sinif səhifəniz avtomatik təyin olunacaq." },
  { category: "ADMISSION", question: "Sənəd qəbulu üçün nə lazımdır?", answer: "Şəxsiyyət vəsiqəsi, attestat, qəbul vərəqəsi, tibbi arayış və fotoşəkillər. Dəqiq siyahı qəbul komissiyasının elanında verilir." },
  { category: "ADMISSION", question: "Yataqxanaya necə müraciət edim?", answer: "Müraciət qəbul dövründə onlayn formu doldurmaqla edilir. Yerlər məsafə və sosial meyarlar üzrə bölünür." },
  { category: "ADMISSION", question: "İxtisasımı dəyişə bilərəmmi?", answer: "İxtisasdəyişmə birinci kursun sonunda, akademik göstəricilər və boş yerlər nəzərə alınmaqla mümkündür." },
  { category: "ADMISSION", question: "Təqaüd şərtləri nədir?", answer: "Təqaüd semestr üzrə orta bala görə təyin olunur. Fərqlənmə təqaüdü üçün minimal hədd hər semestr dekanlıq tərəfindən elan edilir." },

  { category: "CAMPUS", question: "Kitabxanadan necə istifadə edim?", answer: "Tələbə bileti ilə qeydiyyatdan keçin. Elektron bazalara universitet hesabı ilə kampusdan kənarda da giriş var." },
  { category: "CAMPUS", question: "Kampusda internet varmı?", answer: "Bəli, bütün korpuslarda tələbələr üçün simsiz şəbəkə mövcuddur. Giriş məlumatları tələbə hesabı ilə eynidir." },
  { category: "CAMPUS", question: "Yeməkxananın iş saatları necədir?", answer: "Yeməkxana iş günləri 08:30–18:00 arasında işləyir. Sessiya dövründə iş saatları uzadıla bilər." },
  { category: "CAMPUS", question: "Xankəndidə yaşamaq üçün nələri bilməliyəm?", answer: "Nəqliyyat, bazar, səhiyyə və təhlükəsizlik məlumatları Xankəndi Bələdçisi bölməsində toplanıb. Yeni gələnlər üçün ayrıca məsləhətlər siyahısı var." },
  { category: "CAMPUS", question: "Tələbə klubuna necə yazılım?", answer: "Klublar yarmarkasında və ya klubun səhifəsindən müraciət edə bilərsiniz. Əksər klublar il boyu üzv qəbul edir." },

  { category: "PLATFORM", question: "Paylaşımım nə üçün Timeline-da görünmür?", answer: "Paylaşım yaradarkən 'Timeline-da göstər' seçimi işarələnməlidir. Timeline-ın görünürlüyü paylaşımdan kopyalanır və ondan daha açıq ola bilməz." },
  { category: "PLATFORM", question: "Nailiyyətim niyə hələ təsdiqlənməyib?", answer: "Nailiyyətlər əvvəlcə 'göndərilib' statusunda olur. Universitet administratoru yoxladıqdan sonra təsdiqlənmiş və ya seçilmiş statusuna keçir." },
  { category: "PLATFORM", question: "Where Are We Now statistikasına necə daxil oluram?", answer: "Karyera qeydinizdə 'statistikaya daxil et' seçimini aktivləşdirin. Görünürlük səviyyəsi tək başına kifayət etmir — bu ayrıca razılıqdır." },
  { category: "PLATFORM", question: "Qeyri-münasib məzmunu necə bildirim?", answer: "Hər paylaşımın menyusunda 'Şikayət et' düyməsi var. Şikayət sinif moderatoruna və universitet administratoruna göndərilir." },
  { category: "PLATFORM", question: "Paylaşımı silsəm nə olur?", answer: "Paylaşım siyahılardan dərhal çıxır və ona bağlı Timeline qeydi silinir. Nailiyyət qeydi isə arxivə keçir." },
] as const;

export interface ContentPageSeed {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  section: ContentSection;
}

export const CONTENT_PAGES: readonly ContentPageSeed[] = [
  {
    slug: "haqqimizda",
    title: "Qarabağ Universiteti haqqında",
    excerpt: "Bölgənin təhsil mərkəzi kimi qurulan universitetin missiyası və istiqamətləri.",
    section: "UNIVERSITY",
    body: "## Missiya\n\nQarabağ Universiteti bölgənin bərpası prosesində təhsil və elm mərkəzi rolunu daşıyır. Universitetin əsas hədəfi regionun ehtiyaclarına cavab verən mütəxəssislər hazırlamaqdır.\n\n## İstiqamətlər\n\nMühəndislik və texnologiya, iqtisadiyyat və idarəetmə, təbiət və humanitar elmlər, aqrar elmlər və ekologiya — dörd fakültə on bakalavr proqramını əhatə edir.\n\n## Tədris yanaşması\n\nTədris nəzəriyyə ilə praktikanın balansına əsaslanır: laboratoriya işləri, sahə təcrübəsi və layihə əsaslı öyrənmə bütün proqramların tərkib hissəsidir.",
  },
  {
    slug: "tarixce",
    title: "Universitetin tarixçəsi",
    excerpt: "Təsisdən ilk buraxılışa qədər əsas mərhələlər.",
    section: "UNIVERSITY",
    body: "## Təsis\n\nUniversitet bölgənin təhsil infrastrukturunun bərpası çərçivəsində yaradılıb və ilk tələbə qəbulunu yeni kampusda həyata keçirib.\n\n## İlk illər\n\nİlk qəbul nəsli universitetin ənənələrini formalaşdıran nəsildir: tələbə klubları, elmi konfranslar və könüllü proqramlar məhz həmin dövrdə qurulub.\n\n## Sənədləşdirmə\n\nQU CLASS platformasının Timeline bölməsi bu dövrün rəqəmsal arxivi kimi nəzərdə tutulub — hər sinif öz tarixini özü yazır.",
  },
  {
    slug: "kampus-heyati",
    title: "Kampus həyatı",
    excerpt: "Klublar, tədbirlər, idman və gündəlik kampus qaydaları.",
    section: "CAMPUS",
    body: "## Klublar\n\nKampusda debat, İT, karyera, könüllülük, idman və mədəniyyət klubları fəaliyyət göstərir. Üzvlük il boyu açıqdır.\n\n## Tədbirlər\n\nOriyentasiya həftəsi, Elm Günü, Karyera Günü, yaz festivalı və məzunlar görüşü universitetin daimi tədbir təqvimini təşkil edir.\n\n## Gündəlik həyat\n\nKitabxana, yeməkxana və idman kompleksi kampusun əsas ictimai məkanlarıdır. İş saatları semestr və sessiya dövründə fərqlənə bilər.",
  },
  {
    slug: "kitabxana",
    title: "Kitabxana və elektron bazalar",
    excerpt: "Fond, oxu zalı və rəqəmsal mənbələrdən istifadə qaydaları.",
    section: "CAMPUS",
    body: "## Fond\n\nKitabxana fondu ixtisas ədəbiyyatı, dövri mətbuat və elektron mənbələrdən ibarətdir.\n\n## Qeydiyyat\n\nQeydiyyat tələbə bileti ilə aparılır. Kitab götürmə müddəti 14 gündür və bir dəfə uzadıla bilər.\n\n## Elektron bazalar\n\nUniversitet hesabı ilə beynəlxalq elektron bazalara kampusdan kənarda da giriş mümkündür. Giriş problemi olduqda kitabxananın texniki dəstəyinə müraciət edin.",
  },
  {
    slug: "telebe-xidmetleri",
    title: "Tələbə xidmətləri",
    excerpt: "Dekanlıq, karyera mərkəzi, psixoloji dəstək və sənəd xidmətləri.",
    section: "SERVICES",
    body: "## Dekanlıq\n\nAkademik məsələlər, cədvəl, borc və təkrar kurs prosedurları dekanlıq vasitəsilə həll olunur.\n\n## Karyera mərkəzi\n\nCV emalatxanaları, təcrübə elanları və işəgötürənlərlə görüşlər karyera mərkəzi tərəfindən təşkil edilir.\n\n## Psixoloji dəstək\n\nTələbələr üçün fərdi məsləhət xidməti mövcuddur. Müraciət məxfidir və əvvəlcədən qeydiyyat tələb edir.\n\n## Sənəd xidmətləri\n\nArayış, transkript və təsdiqlənmiş sənəd sifarişləri onlayn qəbul olunur.",
  },
  {
    slug: "yataqxana",
    title: "Yataqxana",
    excerpt: "Müraciət qaydaları, yerləşmə şərtləri və daxili nizam.",
    section: "SERVICES",
    body: "## Müraciət\n\nYataqxanaya müraciət qəbul dövründə onlayn formu doldurmaqla edilir. Yerlər məsafə və sosial meyarlar əsasında bölünür.\n\n## Yerləşmə\n\nOtaqlar 2–4 nəfərlikdir. Ümumi mətbəx, oxu otağı və camaşırxana mövcuddur.\n\n## Daxili nizam\n\nSakitlik saatları 23:00-dan 07:00-a qədərdir. Qonaq qəbulu qeydiyyatla mümkündür.",
  },
  {
    slug: "yeni-gelenler",
    title: "Yeni gələnlər üçün başlanğıc",
    excerpt: "İlk həftədə görülməli işlərin qısa siyahısı.",
    section: "NEWCOMERS",
    body: "## İlk həftə\n\n1. Universitet e-poçtunu aktivləşdir.\n2. QU CLASS-da qeydiyyatdan keç və sinif səhifəni tap.\n3. Tələbə biletini al.\n4. Kitabxanada qeydiyyatdan keç.\n5. Dərs cədvəlini yüklə və auditoriyaları tap.\n\n## İkinci həftə\n\n1. Ən azı bir kluba yazıl.\n2. Qrupun ümumi qovluğuna qoşul.\n3. Xankəndi Bələdçisini oxu — nəqliyyat və məişət məsələləri orada izah olunub.\n\n## Kömək lazımdırsa\n\nSinif nümayəndəsi və sinif moderatoru ilk müraciət nöqtəsidir. Akademik suallar üçün dekanlığa yazın.",
  },
  {
    slug: "mezunlar",
    title: "Məzunlar üçün",
    excerpt: "Məzun şəbəkəsi, dəstək təklifləri və görüşlər.",
    section: "NEWCOMERS",
    body: "## Şəbəkə\n\nMəzunlar sinif səhifəsində qalır və 'Where Are We Now' bölməsində harada olduqlarını paylaşa bilirlər. Statistikaya daxil olmaq ayrıca razılıq tələb edir.\n\n## Dəstək təklifləri\n\nQonaq mühazirəsi, karyera söhbəti, təcrübə yeri, mentorluq və startap əməkdaşlığı — məzunlar bu formatlarda dəstək təklif edə bilər.\n\n## Görüşlər\n\nReunion tədbirləri sinif səviyyəsində və universitet səviyyəsində təşkil olunur. Təqvim Tədbirlər bölməsindədir.",
  },
] as const;

// ---------------------------------------------------------------------------
// 13. Bildiriş və moderasiya mətnləri
// ---------------------------------------------------------------------------

export const REPORT_DETAILS = [
  "Paylaşımın məzmunu mövzu ilə əlaqəli deyil və təkrarlanır.",
  "Şərhdə şəxsə yönəlik kobud ifadə var.",
  "Paylaşımda başqasının şəxsi məlumatı icazəsiz göstərilib.",
  "Məlumat yanlışdır, rəsmi elanla ziddiyyət təşkil edir.",
  "Eyni link bir neçə paylaşımda reklam məqsədilə yerləşdirilib.",
  "Şəkil icazəsiz istifadə olunub.",
] as const;

export const REPORT_RESOLUTIONS = [
  "Məzmun yoxlanıldı, qayda pozuntusu təsdiqlənmədi.",
  "Paylaşım gizlədildi və müəllifə xəbərdarlıq göndərildi.",
  "Şərh silindi, istifadəçi ilə əlaqə saxlanıldı.",
  "Şikayət əsassız sayıldı və bağlandı.",
] as const;
