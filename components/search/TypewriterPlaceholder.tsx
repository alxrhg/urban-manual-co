import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TypewriterPlaceholderProps {
  text: string;
  isActive: boolean;
  className?: string;
}

export const TypewriterPlaceholder = ({
  text,
  isActive,
  className,
}: TypewriterPlaceholderProps) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 left-0 flex items-center text-neutral-500",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center gap-1 font-medium uppercase tracking-[0.08em]">
        <span>{text}</span>
        {isActive && (
          <motion.span
            className="block h-6 w-[2px] bg-neutral-500"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          />
        )}
      </div>
    </div>
  );
};
