import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "icon";
}

export function Logo({ className, variant = "full" }: LogoProps) {
  if (variant === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img src='/zyra-icon.svg' alt='Zzyra Icon' className='h-full w-full' />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img src='/zyra-logo.svg' alt='Zzyra Logo' className='h-full w-full' />
    </div>
  );
}
