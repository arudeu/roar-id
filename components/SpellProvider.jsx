"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import SpellModal from "@/components/SpellSettings";
import { useLocalStorage } from "@/lib/hooks";
import { loadDictionary } from "@/lib/spell-dictionary";
import { parseIgnoreList } from "@/lib/spellcheck";

const SpellContext = createContext(null);

export function useSpell() {
  const ctx = useContext(SpellContext);
  if (!ctx) throw new Error("useSpell must be used inside <SpellProvider>");
  return ctx;
}

/**
 * Holds everything about spell checking (settings, ignore list, dictionary) so the
 * navbar button, the modal and the checker all share it. Settings are remembered
 * in this browser.
 */
export default function SpellProvider({ children }) {
  const [enabled, setEnabled] = useLocalStorage("roarid.spell.on", true);
  const [skipNames, setSkipNames] = useLocalStorage("roarid.spell.skipNames", true);
  const [ignoreText, setIgnoreText] = useLocalStorage("roarid.spell.ignore", "");
  const [open, setOpen] = useState(false);

  const [dict, setDict] = useState(null);
  const [dictError, setDictError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || dict) return;
    let live = true;
    setDictError(false);
    loadDictionary().then(
      (d) => live && setDict(d),
      () => live && setDictError(true),
    );
    return () => {
      live = false;
    };
  }, [enabled, dict, attempt]);

  const ignoreTerms = useMemo(() => parseIgnoreList(ignoreText), [ignoreText]);

  const spell = useMemo(
    () => (enabled && dict ? { dict, ignore: ignoreTerms, skipNames } : null),
    [enabled, dict, ignoreTerms, skipNames],
  );
  const status = !enabled ? "off" : dictError ? "error" : dict ? "ready" : "loading";

  const ignoreWord = useCallback(
    (word) => {
      if (ignoreTerms.some((t) => t.toLowerCase() === word.toLowerCase())) return;
      const before = ignoreText;
      setIgnoreText((t) => (t.trim() ? `${t.replace(/\s+$/, "")}\n${word}` : word));
      toast.success(`Added “${word}” to the ignore list`, {
        id: "spell-ignore",
        duration: 5000,
        action: { label: "Undo", onClick: () => setIgnoreText(before) },
      });
    },
    [ignoreTerms, ignoreText, setIgnoreText],
  );

  const value = useMemo(
    () => ({ spell, enabled, status, ignoreWord, openSettings: () => setOpen(true) }),
    [spell, enabled, status, ignoreWord],
  );

  return (
    <SpellContext.Provider value={value}>
      {children}
      {open && (
        <SpellModal
          onClose={() => setOpen(false)}
          enabled={enabled}
          onEnabled={setEnabled}
          skipNames={skipNames}
          onSkipNames={setSkipNames}
          ignoreText={ignoreText}
          onIgnoreText={setIgnoreText}
          status={status}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      )}
    </SpellContext.Provider>
  );
}
