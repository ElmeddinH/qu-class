// Auth.js v5 route handler.
// ⚠️ `src/auth.ts`-dən (Node runtime) import edir — `auth.config.ts`-dən YOX.
// Credentials provider bcrypt və Prisma işlədir, yəni bu route Node-da qalmalıdır.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
