import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  alertCheckerStarted?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Auto-start alert checker on server boot (only once)
if (!globalForPrisma.alertCheckerStarted && typeof window === "undefined") {
  globalForPrisma.alertCheckerStarted = true;
  
  // Dynamic import to avoid circular dependencies
  import("./jobs/alert-checker").then(({ startAlertChecker }) => {
    startAlertChecker(60000); // Check every 60 seconds
    console.log("[DB] Alert checker auto-started");
  }).catch((err) => {
    console.error("[DB] Failed to start alert checker:", err);
  });
}

export default prisma;
