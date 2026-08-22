import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full relative flex flex-col justify-center items-center overflow-x-hidden">
      {children}
    </div>
  );
}
