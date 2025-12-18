import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { MainNav } from "./main-nav";
import { TeamSwitcher } from "./team-switcher";
import { UserNav } from "./user-nav";
import { MobileNav } from "./mobile-nav";
import { LanguageSwitcher } from "./language-switcher";
import {
  Search,
  Bell,
  MessageSquare,
  EyeIcon,
  HandIcon,
  EarIcon,
} from "lucide-react";
import type { PlanType } from "@/types/database";

export interface ProjectForSwitcher {
  id: string;
  name: string;
  base_url: string;
}

interface AppHeaderProps {
  user: {
    email: string;
    name?: string | null;
    avatar_url?: string | null;
    plan?: PlanType;
  };
  projects: ProjectForSwitcher[];
}

export async function AppHeader({ user, projects }: AppHeaderProps) {
  const t = await getTranslations('Navigation');

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b">
      {/* Row 1: Logo + Team + Icons + Avatar */}
      <div className="border-b">
        <div className="container mx-auto px-6 flex h-[70px] items-center gap-4">
          {/* Mobile menu */}
          <MobileNav projects={projects} />

          {/* Logo */}
          <Link href="/" className="flex items-center [&>svg]:size-5 gap-1.5">
            <EyeIcon className="text-cyan-500" />
            <HandIcon className="text-orange-500" />
            <EarIcon className="text-pink-500" />
          </Link>

          {/* Team Switcher - styled like Metronic */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-muted-foreground text-[15px]">
              Acessibilidade
            </span>
            <span className="text-muted-foreground/50 text-lg">/</span>
            <TeamSwitcher projects={projects} />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side icons */}
          <div className="flex items-center gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Search className="h-[18px] w-[18px]" />
            </button>
            <LanguageSwitcher />
            <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <MessageSquare className="h-[18px] w-[18px]" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Bell className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* User navigation */}
          <UserNav user={user} />
        </div>
      </div>

      {/* Row 2: Main Navigation */}
      <div className="container mx-auto px-6">
        <div className="flex h-[50px] items-center justify-between">
          {/* Main nav - left */}
          <MainNav />

          {/* Secondary links - right */}
          <div className="hidden lg:flex items-center gap-8">
            <Link
              href="/docs"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('help')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
