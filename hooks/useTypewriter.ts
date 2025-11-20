import { useEffect, useMemo, useRef, useState } from "react";

const randomInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

interface UseTypewriterOptions {
  prompts: string[];
  isActive: boolean;
  typingRange?: [number, number];
  deletingRange?: [number, number];
  pauseDuration?: [number, number];
}

export const useTypewriter = ({
  prompts,
  isActive,
  typingRange = [50, 150],
  deletingRange = [30, 90],
  pauseDuration = [2000, 3000],
}: UseTypewriterOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentText, setCurrentText] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const promptsMemo = useMemo(() => prompts.filter(Boolean), [prompts]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const reset = () => {
    clearTimer();
    setCurrentText("");
    setPromptIndex(0);
    setIsDeleting(false);
    setIsTyping(false);
  };

  useEffect(() => {
    if (!isActive || promptsMemo.length === 0) {
      setIsTyping(false);
      return () => undefined;
    }

    const currentPrompt = promptsMemo[promptIndex % promptsMemo.length];

    const schedule = (callback: () => void, range: [number, number]) => {
      const delay = randomInRange(range[0], range[1]);
      timeoutRef.current = setTimeout(callback, delay);
    };

    if (!isDeleting) {
      if (currentText.length < currentPrompt.length) {
        setIsTyping(true);
        schedule(() => {
          setCurrentText(currentPrompt.slice(0, currentText.length + 1));
        }, typingRange);
      } else {
        setIsTyping(false);
        schedule(() => {
          setIsDeleting(true);
          setIsTyping(true);
        }, pauseDuration);
      }
    } else {
      if (currentText.length > 0) {
        setIsTyping(true);
        schedule(() => {
          setCurrentText(currentText.slice(0, -1));
        }, deletingRange);
      } else {
        setIsDeleting(false);
        setIsTyping(true);
        setPromptIndex((index) => (index + 1) % promptsMemo.length);
      }
    }

    return () => clearTimer();
  }, [currentText, deletingRange, isActive, isDeleting, pauseDuration, promptIndex, promptsMemo, typingRange]);

  useEffect(() => () => clearTimer(), []);

  return {
    currentText,
    isTyping,
    reset,
  };
};
