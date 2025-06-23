"use client";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  badge?: string;
  variant?: "default" | "highlighted";
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  badge,
  variant = "default",
}: FeatureCardProps) {
  const CardWrapper = href ? "a" : "div";

  return (
    <CardWrapper
      href={href}
      className={`card-feature group ${href ? "cursor-pointer" : ""}`}
      {...(href && { rel: "noopener noreferrer" })}>
      {badge && (
        <div className='mb-4'>
          <span className='badge-primary'>{badge}</span>
        </div>
      )}

      <div
        className={`${variant === "highlighted" ? "icon-container-purple" : "icon-container"} mb-6`}>
        <Icon className='w-6 h-6' />
      </div>

      <h3 className='text-xl font-semibold text-text-primary mb-4'>{title}</h3>

      <p className='text-text-secondary mb-6 leading-relaxed'>{description}</p>

      {href && (
        <div className='flex items-center gap-2 text-sm text-accent-primary group-hover:text-accent-secondary transition-colors'>
          <span>Learn more</span>
          <ArrowRight className='w-4 h-4 transition-transform group-hover:translate-x-1' />
        </div>
      )}
    </CardWrapper>
  );
}

export default FeatureCard;
