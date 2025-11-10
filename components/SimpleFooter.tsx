'use client';

import { useRouter } from "next/navigation";

export function SimpleFooter() {
  const router = useRouter();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 dark:bg-gray-900 py-8 px-6 md:px-10">
      <div className="max-w-[1920px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} The Urban Manual. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-bold uppercase hover:opacity-60 transition-opacity dark:text-gray-300">About</a>
            <a href="#" className="text-xs font-bold uppercase hover:opacity-60 transition-opacity dark:text-gray-300">Contact</a>
            <button onClick={() => router.push("/privacy")} className="text-xs font-bold uppercase hover:opacity-60 transition-opacity dark:text-gray-300">Privacy</button>
            <a href="#" className="text-xs font-bold uppercase hover:opacity-60 transition-opacity dark:text-gray-300">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
