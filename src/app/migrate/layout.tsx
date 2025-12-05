"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Cloud,
  Radar,
  ClipboardCheck,
  Server,
  Rocket,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

// CloudMigrate sub-navigation
const migrationSteps = [
  {
    id: "overview",
    label: "Overview",
    href: "/migrate",
    icon: Cloud,
    description: "Migration dashboard",
  },
  {
    id: "discover",
    label: "Discover",
    href: "/migrate/discover",
    icon: Radar,
    description: "Scan your infrastructure",
  },
  {
    id: "assess",
    label: "Assess",
    href: "/migrate/assess",
    icon: ClipboardCheck,
    description: "Analyze & plan migration",
  },
  {
    id: "workloads",
    label: "Workloads",
    href: "/migrate/workloads",
    icon: Server,
    description: "Manage migration workloads",
  },
  {
    id: "execute",
    label: "Execute",
    href: "/migrate/execute",
    icon: Rocket,
    description: "Run migrations",
  },
  {
    id: "validate",
    label: "Validate",
    href: "/migrate/validate",
    icon: CheckCircle2,
    description: "Verify & report",
  },
];

export default function MigrateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
          <span className="text-terminal-green font-mono text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Determine active step
  const getActiveStep = () => {
    if (pathname === "/migrate") return "overview";
    const segment = pathname.split("/")[2];
    return segment || "overview";
  };

  const activeStep = getActiveStep();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="w-52 shrink-0" />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Service Header */}
        <header className="shrink-0 border-b border-border/50 bg-card/30">
          <div className="px-6 py-4">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-terminal-green/10 rounded-lg">
                  <Cloud className="w-5 h-5 text-terminal-green" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">CloudMigrate</h1>
                  <p className="text-xs text-muted-foreground">
                    Full infrastructure migration to AWS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-lg">
                  <span className="text-sm text-foreground">{session.user.tenantName}</span>
                </div>
              </div>
            </div>

            {/* Step Navigation */}
            <nav className="flex items-center gap-1">
              {migrationSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;
                const isPast = migrationSteps.findIndex(s => s.id === activeStep) > index;

                return (
                  <div key={step.id} className="flex items-center">
                    <Link
                      href={step.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-terminal-green/10 text-terminal-green"
                          : isPast
                          ? "text-terminal-green/60 hover:text-terminal-green hover:bg-terminal-green/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden lg:inline">{step.label}</span>
                    </Link>
                    {index < migrationSteps.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 mx-1" />
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
