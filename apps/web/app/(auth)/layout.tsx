import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between items-center p-4 sm:p-8">
      {children}
      <footer className="text-center text-xs text-muted-foreground tracking-widest uppercase mt-8">
        &copy; 2026 <span className="text-primary font-semibold">JAAGO HUB</span> ECOSYSTEM
      </footer>
    </div>
  );
}
