import type React from "react";
import { useMDXComponents as getNextraComponents } from "nextra/mdx-components";
import { FeatureCard } from "./components/FeatureCard";
import { InteractiveCodeBlock } from "./components/InteractiveCodeBlock";
import { APIEndpoint } from "./components/APIEndpoint";
import { Breadcrumb } from "./components/Breadcrumb";
import {
  Bot,
  Workflow,
  Shield,
  Code,
  Database,
  Globe,
  Zap,
  BookOpen,
  Lightbulb,
  Target,
  Rocket,
  Lock,
  Sparkles,
} from "lucide-react";

const defaultComponents = getNextraComponents({
  wrapper({ children, toc }) {
    return (
      <div className='relative'>
        <div className='flex-grow'>{children}</div>
        {toc && toc.length > 0 && (
          <div className='hidden xl:block fixed top-24 right-4 w-64 max-h-96 overflow-y-auto z-10'>
            <div className='card-elevated'>
              <h3 className='text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider'>
                On This Page
              </h3>
              <nav className='space-y-2'>
                {toc.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block text-sm transition-colors hover:text-accent-primary ${
                      heading.depth === 2
                        ? "text-text-secondary pl-0"
                        : heading.depth === 3
                          ? "text-text-tertiary pl-4"
                          : "text-text-tertiary pl-6"
                    }`}
                    style={{ paddingLeft: `${(heading.depth - 2) * 1}rem` }}>
                    {heading.value}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    );
  },
});

export const useMDXComponents = (components?: any) => ({
  ...defaultComponents,
  ...components,

  // Enhanced MDX Components
  FeatureGrid: ({ children }: { children: React.ReactNode }) => (
    <div className='grid-responsive my-12'>{children}</div>
  ),

  FeatureCard: ({ icon, title, description, href, badge, variant }: any) => {
    const iconMap: { [key: string]: any } = {
      bot: Bot,
      workflow: Workflow,
      shield: Shield,
      code: Code,
      database: Database,
      globe: Globe,
      zap: Zap,
      "book-open": BookOpen,
      lightbulb: Lightbulb,
      target: Target,
      rocket: Rocket,
      lock: Lock,
      sparkles: Sparkles,
    };

    const IconComponent = iconMap[icon] || Bot;

    return (
      <FeatureCard
        icon={IconComponent}
        title={title}
        description={description}
        href={href}
        badge={badge}
        variant={variant}
      />
    );
  },

  InteractiveCodeBlock: (props: any) => <InteractiveCodeBlock {...props} />,

  APIEndpoint: (props: any) => <APIEndpoint {...props} />,

  Breadcrumb: (props: any) => <Breadcrumb {...props} />,

  // Enhanced basic components
  h1: ({ children, ...props }: any) => (
    <h1
      className='text-4xl md:text-5xl font-bold text-text-primary mb-6 leading-tight'
      {...props}>
      {children}
    </h1>
  ),

  h2: ({ children, ...props }: any) => (
    <h2
      className='text-3xl md:text-4xl font-bold text-text-primary mb-6 mt-12 leading-tight'
      {...props}>
      {children}
    </h2>
  ),

  h3: ({ children, ...props }: any) => (
    <h3
      className='text-2xl md:text-3xl font-semibold text-text-primary mb-4 mt-8 leading-tight'
      {...props}>
      {children}
    </h3>
  ),

  p: ({ children, ...props }: any) => (
    <p className='text-text-secondary leading-relaxed mb-6' {...props}>
      {children}
    </p>
  ),

  a: ({ children, href, ...props }: any) => (
    <a
      href={href}
      className='text-accent-primary hover:text-accent-secondary transition-colors underline decoration-accent-primary/30 hover:decoration-accent-secondary/50 underline-offset-2'
      {...props}>
      {children}
    </a>
  ),

  ul: ({ children, ...props }: any) => (
    <ul className='list-none space-y-3 mb-6' {...props}>
      {children}
    </ul>
  ),

  li: ({ children, ...props }: any) => (
    <li className='flex items-start gap-3 text-text-secondary' {...props}>
      <div className='w-2 h-2 bg-accent-primary rounded-full mt-2 flex-shrink-0' />
      <span>{children}</span>
    </li>
  ),

  blockquote: ({ children, ...props }: any) => (
    <blockquote
      className='border-l-4 border-accent-primary bg-accent-primary/5 p-6 my-6 rounded-r-lg'
      {...props}>
      <div className='text-text-secondary italic'>{children}</div>
    </blockquote>
  ),

  table: ({ children, ...props }: any) => (
    <div className='overflow-x-auto my-6'>
      <table
        className='w-full border-collapse border border-border-primary rounded-lg overflow-hidden'
        {...props}>
        {children}
      </table>
    </div>
  ),

  th: ({ children, ...props }: any) => (
    <th
      className='bg-background-tertiary text-text-primary font-semibold p-3 text-left border-b border-border-primary'
      {...props}>
      {children}
    </th>
  ),

  td: ({ children, ...props }: any) => (
    <td
      className='p-3 text-text-secondary border-b border-border-primary/50'
      {...props}>
      {children}
    </td>
  ),
});
