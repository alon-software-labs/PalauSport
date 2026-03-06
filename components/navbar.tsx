import * as React from 'react';

export function Navbar({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground md:hidden tracking-tight">
          PalauSport
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {/* Empty for now as user info is in sidebar */}
      </div>
    </div>
  );
}
