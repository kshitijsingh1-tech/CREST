"use client";

import { useEffect, useRef } from "react";
import { Languages } from "lucide-react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: {
          new (
            options: {
              pageLanguage: string;
              includedLanguages: string;
              layout: number;
              autoDisplay: boolean;
            },
            id: string
          ): void;
          InlineLayout: { SIMPLE: number };
        };
      };
    };
  }
}

export default function GoogleTranslate() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Define the init callback Google's script will call
    window.googleTranslateElementInit = () => {
      new window.google!.translate.TranslateElement(
        {
          pageLanguage: "en",
          // All major Indian languages + common global ones
          includedLanguages:
            "en,hi,ta,te,bn,mr,gu,kn,ml,pa,ur,or,as,ne,si,fr,de,es,ar,zh-CN",
          layout:
            window.google!.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "crest-google-translate"
      );
    };

    // Inject Google's script once
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.head.appendChild(script);
    }

    // Inject overrides to hide Google's ugly top-bar banner and fix styling
    if (!document.getElementById("gt-style-overrides")) {
      const style = document.createElement("style");
      style.id = "gt-style-overrides";
      style.textContent = `
        /* Hide the obnoxious Google bar at the top */
        .goog-te-banner-frame, #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
        body { top: 0 !important; }

        /* Hide "Powered by Google" text inside the dropdown */
        .goog-logo-link, .goog-te-gadget span { display: none !important; }

        /* Style the select dropdown to be invisible — our custom button triggers it */
        .goog-te-gadget select {
          position: absolute !important;
          opacity: 0 !important;
          pointer-events: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        /* Style the combo box that Google renders */
        .goog-te-combo {
          font-family: inherit !important;
          background: transparent !important;
          border: none !important;
          color: inherit !important;
          cursor: pointer !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
          outline: none !important;
          padding: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="flex items-center gap-2 group">
      {/* Globe icon */}
      <Languages className="w-3.5 h-3.5 flex-shrink-0
        dark:text-blue-400 text-gray-500
        group-hover:text-blue-600 dark:group-hover:text-blue-300
        transition-colors duration-300" />

      {/* Google Translate mount point — the widget renders its native <select> here */}
      <div
        id="crest-google-translate"
        className="text-[11px] font-bold uppercase tracking-widest
          dark:text-blue-400 text-gray-600
          group-hover:text-blue-600 dark:group-hover:text-blue-300
          transition-colors duration-300 [&_.goog-te-gadget]:!font-inherit
          [&_.goog-te-combo]:!bg-transparent [&_.goog-te-combo]:!border-none
          [&_.goog-te-combo]:!text-inherit [&_.goog-te-combo]:!text-[11px]
          [&_.goog-te-combo]:!font-bold [&_.goog-te-combo]:cursor-pointer"
      />
    </div>
  );
}
