"use client";

import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { TypewriterPlaceholder } from "./TypewriterPlaceholder";
import { useTypewriter } from "@/hooks/useTypewriter";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "Where do architects eat in Tokyo?",
  "Quiet museums in London for rainy days...",
  "Natural wine bars with outdoor seating...",
  "Design hotels under $200 in Paris...",
  "Late night jazz hideaways in New York...",
  "Minimalist coffee shops in Copenhagen...",
  "Sunrise rooftops in Mexico City...",
];

interface LivingSearchBarProps {
  prompts?: string[];
  ariaLabel?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const LivingSearchBar = ({
  prompts = PROMPTS,
  ariaLabel = "Search destinations",
  onChange,
  className,
}: LivingSearchBarProps) => {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const isPlaceholderActive = useMemo(
    () => !isFocused && value.length === 0,
    [isFocused, value.length],
  );

  const { currentText, isTyping, reset } = useTypewriter({
    prompts,
    isActive: isPlaceholderActive,
  });

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    reset();
  }, [reset]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setValue(nextValue);
      onChange?.(nextValue);
    },
    [onChange],
  );

  return (
    <div className={cn("relative w-full", className)}>
      <AnimatePresence initial={false}>
        {isPlaceholderActive && (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TypewriterPlaceholder text={currentText} isActive={isTyping} />
          </motion.div>
        )}
      </AnimatePresence>

      <input
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        aria-label={ariaLabel}
        className={cn(
          "relative z-10 w-full bg-transparent text-xl uppercase tracking-tight text-neutral-900 placeholder-transparent outline-none md:text-2xl",
          "border-b border-neutral-200 pb-3 pt-2 focus:border-neutral-800",
        )}
        placeholder=""
        autoComplete="off"
      />
    </div>
  );
};
