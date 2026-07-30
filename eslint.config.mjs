import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // ⚠️ `public/swagger/` TÖRƏMƏ aktivlərdir (`npm run docs:assets` →
      // `swagger-ui-dist`-dən köçürülür). Minifikasiya olunmuş 1.5 MB bundle
      // ESLint-də 165 xəta + 3280 xəbərdarlıq verirdi və `npm run lint`-i
      // faktiki olaraq işlənməz edirdi. `.gitignore` ESLint-ə təsir ETMİR —
      // ignore siyahısı ayrıca saxlanılmalıdır.
      "public/swagger/**",
    ],
  },
];

export default eslintConfig;
