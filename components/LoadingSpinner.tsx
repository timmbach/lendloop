"use client";

import Image from "next/image";

interface LoadingSpinnerProps {
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  message?: string;
}

export default function LoadingSpinner({
  alt = "Loading...",
  width = 64,
  height = 64,
  className,
  message,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col h-full items-center justify-center gap-3 ${className ?? ""}`}
    >
      <div className="animate-spin">
        <Image
          src={"/lendloop_logo.png"}
          alt={alt}
          width={width}
          height={height}
        />
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
