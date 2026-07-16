"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchPlaces, type PlaceSuggestion } from "@/lib/geocode";
import type { LatLng } from "@/types";

interface LocationSearchFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (location: LatLng, label: string) => void;
  active?: boolean;
  onFocusField?: () => void;
  dotColorClassName: string;
  showUseCurrentLocation?: boolean;
  onUseCurrentLocation?: () => void;
  locating?: boolean;
  /** Lets a parent (e.g. after switching tabs) imperatively focus this field. */
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * A "From"/"To" field that searches live as the rider types (debounced
 * Nominatim lookups) and shows a dropdown of matching places to pick from —
 * the same interaction pattern as Uber and Rapido's ride-request panel.
 */
export function LocationSearchField({
  label,
  placeholder,
  value,
  onValueChange,
  onSelect,
  active,
  onFocusField,
  dotColorClassName,
  showUseCurrentLocation,
  onUseCurrentLocation,
  locating,
  inputRef,
}: LocationSearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedValue = useDebouncedValue(value, 350);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const trimmed = debouncedValue.trim();

    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    searchPlaces(trimmed, controller.signal)
      .then((results) => setSuggestions(results))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") setError("Couldn't search right now");
      })
      .finally(() => setIsSearching(false));

    return () => controller.abort();
  }, [debouncedValue, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(suggestion: PlaceSuggestion) {
    onSelect(suggestion.location, suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-muted/60 px-3 py-2.5 transition-colors",
          active ? "border-foreground bg-background ring-2 ring-foreground/10" : "border-transparent"
        )}
      >
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotColorClassName)} />
        <div className="flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <input
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            onFocus={() => {
              onFocusField?.();
              setIsOpen(true);
            }}
            onChange={(e) => {
              onValueChange(e.target.value);
              setIsOpen(true);
            }}
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none"
          />
        </div>
        {value && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              onValueChange("");
              setSuggestions([]);
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (value.trim().length > 0 || showUseCurrentLocation) && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[1000] max-h-72 overflow-y-auto rounded-xl border bg-popover shadow-lg">
          {showUseCurrentLocation && (
            <button
              type="button"
              onClick={() => {
                onUseCurrentLocation?.();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm font-medium hover:bg-accent"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <Navigation className="h-4 w-4 shrink-0 text-primary" />
              )}
              Use current location
            </button>
          )}

          {isSearching && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </div>
          )}

          {!isSearching && error && <p className="px-4 py-3 text-sm text-destructive">{error}</p>}

          {!isSearching &&
            !error &&
            suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{suggestion.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{suggestion.sublabel}</span>
                </span>
              </button>
            ))}

          {!isSearching && !error && value.trim().length >= 3 && suggestions.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
