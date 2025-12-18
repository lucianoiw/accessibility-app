"use client";

import { Link } from "@/i18n/navigation";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/utils";

export function MainNav() {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.id as string | undefined;
  const t = useTranslations('Navigation')

  // Menu global (fora do contexto de projeto)
  const globalNavItems = [{ title: t('projects'), href: "/projects" }];

  // Menu de projeto (dentro de /projects/[id])
  const projectNavItems = [
    { title: t('dashboard'), href: "" },
    { title: t('audits'), href: "/audits" },
    { title: t('settings'), href: "/settings" },
  ];

  // Se estamos dentro de um projeto, usa menu de projeto
  // Remover prefixo de locale do pathname para comparação
  const cleanPathname = pathname.replace(/^\/(pt-BR|en|es)/, '') || '/';
  const isInProject =
    projectId && cleanPathname.startsWith(`/projects/${projectId}`);

  if (isInProject) {
    const basePath = `/projects/${projectId}`;

    return (
      <nav className="hidden md:flex items-center md:gap-5">
        {projectNavItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive =
            item.href === ""
              ? cleanPathname === basePath
              : cleanPathname.startsWith(href);

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "relative flex items-center gap-1.5 h-[50px] text-[13px] font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.title}
              {isActive && (
                <span className="absolute w-full bottom-0 left-0 right-5 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Menu global
  return (
    <nav className="hidden md:flex items-center md:gap-5">
      {globalNavItems.map((item) => {
        const isActive =
          cleanPathname === item.href ||
          (item.href !== "/" && cleanPathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-1.5 h-[50px] text-[13px] font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.title}
            {isActive && (
              <span className="absolute bottom-0 left-0 w-full right-5 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
