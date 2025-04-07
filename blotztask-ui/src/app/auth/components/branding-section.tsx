import React from "react";

export default function BrandingSection() {
  return (
    <div className="flex-[2] relative hidden h-full flex-col p-10 text-white dark:border-r lg:flex before:absolute before:inset-0 before:bg-zinc-900 before:z-0">
      <div className="relative z-10 flex items-center text-lg font-medium">
        Blotz Task App
      </div>
    </div>
  );
}
