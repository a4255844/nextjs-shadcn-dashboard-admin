"use client";

import { useState, useMemo } from "react";
import { FileText, Search as SearchIcon } from 'lucide-react';
import { useTranslations } from "next-intl";
import SidebarContent, { ChildItem } from "../../vertical/sidebar/sidebaritems";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";

interface SearchResult {
  key: string;
  label: string;
  url: string;
  external?: boolean;
}

function Search() {
  const [query, setQuery] = useState("");
  const t = useTranslations("sidebar");
  const tHeader = useTranslations("header.search");

  // Flatten all leaf items that have a URL; resolve i18n keys to translated labels
  const allPages = useMemo<SearchResult[]>(() => {
    const pages: SearchResult[] = [];

    const walk = (items: ChildItem[]) => {
      items.forEach((item) => {
        if (item.items?.length) {
          walk(item.items);
        } else if (item.url) {
          pages.push({
            key: item.name,
            label: t(`menu.${item.name}`),
            url: item.url,
            external: item.external,
          });
        }
      });
    };

    SidebarContent.forEach((section) => {
      if (section.items) walk(section.items);
    });

    return pages;
    // t depends on the active locale; rebuilding when it changes
  }, [t]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allPages.filter((page) => page.label.toLowerCase().includes(q));
  }, [query, allPages]);

  return (
    <div className="relative w-full">
      <div className="relative w-48 sm:w-56 lg:w-72">
        <SearchIcon size={16}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          placeholder={tHeader("placeholder")}
          className="rounded-lg ps-10!"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.trim() && (
        <div className="absolute w-full min-w-64 bg-card rounded-lg top-11 z-50 start-0 shadow-md border border-border p-2">
          {results.length ? (
            <ul className="flex flex-col">
              {results.map((page) => (
                <li key={page.key}>
                  {page.external ? (
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setQuery("")}
                      className="px-2 py-1.5 flex items-center gap-2 text-sm font-medium rounded-md hover:bg-primary/5 hover:text-primary"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      {page.label}
                    </a>
                  ) : (
                    <Link
                      href={page.url}
                      onClick={() => setQuery("")}
                      className="px-2 py-1.5 flex items-center gap-2 text-sm font-medium rounded-md hover:bg-primary/5 hover:text-primary"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      {page.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {tHeader("noResults")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Search;
