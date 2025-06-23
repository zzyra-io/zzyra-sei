"use client";

import { Fragment } from "react";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
  return (
    <nav
      className='flex items-center space-x-2 text-sm mb-6'
      aria-label='Breadcrumb'>
      {showHome && (
        <Fragment>
          <a
            href='/'
            className='text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-1'
            aria-label='Home'>
            <Home className='w-4 h-4' />
            <span className='sr-only'>Home</span>
          </a>
          <ChevronRight className='w-4 h-4 text-text-tertiary' />
        </Fragment>
      )}

      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <ChevronRight className='w-4 h-4 text-text-tertiary' />}
          {item.href && index < items.length - 1 ? (
            <a
              href={item.href}
              className='text-text-tertiary hover:text-text-primary transition-colors'>
              {item.label}
            </a>
          ) : (
            <span
              className={
                index === items.length - 1
                  ? "text-accent-primary font-medium"
                  : "text-text-tertiary"
              }
              aria-current={index === items.length - 1 ? "page" : undefined}>
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumb;
