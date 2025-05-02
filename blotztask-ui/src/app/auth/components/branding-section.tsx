import React from 'react';
import Image from 'next/image';

export default function BrandingSection() {
  return (
    <div className="flex-[2] relative hidden h-full flex-col items-center justify-center p-10 lg:flex">
      <Image 
        src="/assets/images/logo.png" 
        alt="Blotz Logo"
        width={600}
        height={80}
        priority
        className="h-auto mb-6"
      />
    </div>
  );
}
