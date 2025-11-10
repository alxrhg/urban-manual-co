"use client";

import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [manage, setManage] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("um-consent");
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("um-consent", "accepted");
    setVisible(false);
  };

  return (
    visible && (
      <div className="fixed bottom-6 right-6 z-50 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-neutral-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed flex-1">
              We use minimal cookies to maintain your session and saved places. No tracking or marketing.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={accept}
              className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition"
            >
              Accept
            </button>

            <button
              onClick={() => setManage(!manage)}
              className="text-neutral-400 hover:text-neutral-100 transition"
            >
              Manage
            </button>
          </div>

          {manage && (
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <label className="flex items-center justify-between text-neutral-400">
                Required cookies
                <input type="checkbox" checked readOnly className="opacity-60" />
              </label>
              <label className="flex items-center justify-between text-neutral-400">
                Analytics
                <input type="checkbox" />
              </label>
              <button
                onClick={accept}
                className="w-full text-left text-neutral-300 hover:text-neutral-100 transition pt-2"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    )
  );
}
