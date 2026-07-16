"use client";

import { useCallback, useMemo } from "react";
import en from "./en.json";
import hi from "./hi.json";
import { useSessionStore } from "@/store/useSessionStore";

export type Locale = "en" | "hi";

export const SUPPORTED_LOCALES: { code: Locale; nativeLabel: string; englishLabel: string }[] = [
  { code: "en", nativeLabel: "English (United States)", englishLabel: "English (United States)" },
  { code: "hi", nativeLabel: "हिन्दी (भारत)", englishLabel: "Hindi (India)" },
];

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, hi };

type Interpolations = Record<string, string | number>;

function interpolate(template: string, values?: Interpolations): string {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * Minimal in-house i18n hook — deliberately dependency-free (no i18next/
 * next-intl) since neither is present in package.json and the project rule
 * is to avoid introducing imports that aren't already part of the stack.
 * Reads/writes the active locale from the session store so the choice
 * persists the same way auth session data does.
 */
export function useTranslation() {
  const locale = useSessionStore((s) => s.locale);
  const setLocale = useSessionStore((s) => s.setLocale);

  const dictionary = useMemo(() => DICTIONARIES[locale] ?? DICTIONARIES.en, [locale]);

  const t = useCallback(
    (key: string, values?: Interpolations): string => {
      const template = dictionary[key] ?? DICTIONARIES.en[key] ?? key;
      return interpolate(template, values);
    },
    [dictionary]
  );

  return { t, locale, setLocale };
}
