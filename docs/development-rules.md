# Zzyra Development Rules & Standards

## 1. Project Overview

Zzyra is an AI-driven, blockchain-focused workflow automation platform. It enables users to build, execute, and monitor complex workflows, integrating AI and blockchain capabilities.

## 2. Monorepo Structure

- All code is organized in a monorepo with `apps/` (frontend, backend) and `packages/` (shared logic, types, database).
- Shared types and logic must be placed in `packages/` and imported via workspace protocol.
- Use workspace protocol (`workspace:*`) for internal dependencies in `package.json`.

## 3. Shared Packages Usage

- All shared types must be defined in `packages/types` and imported via `@zzyra/types`.
- Do not define new types in `apps/ui` or `apps/zzyra-worker` unless strictly local and not shared.
- Confirm type existence before adding new ones.
- All database access, repositories, authentication, and policy logic must be used from `@zzyra/database`.
- Do not access the database directly or define new repositories outside this package.
- Confirm DB logic existence before adding new ones.
- Any new type or DB logic required by UI or worker must be proposed and added to the relevant shared package before use.

## 4. Worker (Execution Engine) Guidelines

- The worker (`apps/zzyra-worker`) acts solely as the execution engine for workflows and blocks.
- It must use types from `@zzyra/types` and DB logic from `@zzyra/database`.
- Do not add business logic, type definitions, or DB access outside of the shared packages.
- All execution, logging, and workflow logic must be modular, self-contained, and use shared types.

## 5. UI Guidelines

- The UI (`apps/ui`) must use types from `@zzyra/types` and DB logic from `@zzyra/database`.
- Do not duplicate or redefine types or DB logic in the UI.
- All API routes and server-side logic must use the shared packages for type safety and consistency.

## 6. Integration & Sync

- Any new feature or change must be checked for impact on both UI and worker.
- Both must remain in sync and fully integrated; do not implement a feature in one without considering the other.

## 7. Change Management

- Before adding new types or DB logic, confirm if it already exists in the shared packages.
- If not, propose and add it to the relevant package, then use it in the apps.

## 8. Testing Standards

- **Unit Tests:**

  - Colocate unit tests with the code they test (e.g., `Component.test.tsx` next to `Component.tsx`).
  - Use Jest and React Testing Library for frontend tests.
  - Use Jest for backend tests.
  - Maintain minimum 80% code coverage.

- **Integration Tests:**

  - Place in `__tests__/integration/` directories.
  - Test interactions between components and services.
  - Include API route testing.

- **E2E Tests:**
  - Use Playwright for E2E testing.
  - Test critical user flows.
  - Run in CI before deployment.

## 9. Documentation

- **Code Documentation:**

  - Use JSDoc for all public APIs and shared functions.
  - Document complex business logic with inline comments.
  - Keep README files up to date.

- **Architecture Documentation:**
  - Document major architectural decisions in `docs/architecture/`.
  - Update system architecture diagrams when making significant changes.
  - Keep API documentation current.

## 10. CI/CD & Automation

- **Pre-commit Hooks:**

  - Run linting and type checking.
  - Format code with Prettier.
  - Run unit tests.

- **CI Pipeline:**

  - Run all tests (unit, integration, E2E).
  - Build the application.
  - Check for security vulnerabilities.
  - Deploy to staging on main branch.

- **Deployment:**
  - Use Netlify for frontend deployments.
  - Use Docker for worker deployments.
  - Implement blue-green deployment for zero downtime.

## 11. Security

- **Secrets Management:**

  - Use `.env.example` for template.
  - Never commit real secrets.
  - Use environment variables for all sensitive data.

- **Dependency Management:**

  - Regular security audits with `npm audit`.
  - Automated dependency updates with Dependabot.
  - Pin dependency versions in `package.json`.

- **Code Security:**
  - Regular security reviews.
  - Follow OWASP guidelines.
  - Implement rate limiting and input validation.

## 12. Performance

- **Frontend:**

  - Use Next.js image optimization.
  - Implement code splitting.
  - Lazy load large components.
  - Monitor Core Web Vitals.

- **Backend:**
  - Optimize database queries.
  - Use connection pooling.
  - Implement caching where appropriate.
  - Monitor response times.

## 13. Accessibility & UX

- **Accessibility:**

  - Meet WCAG AA standards.
  - Use semantic HTML.
  - Implement keyboard navigation.
  - Test with screen readers.

- **UX Consistency:**
  - Use Shadcn UI components.
  - Follow design system guidelines.
  - Maintain consistent spacing and typography.
  - Implement responsive design.

## 14. Error Handling

- **Frontend:**

  - Use error boundaries.
  - Implement graceful fallbacks.
  - Show user-friendly error messages.
  - Log errors to monitoring service.

- **Backend:**
  - Use try-catch blocks.
  - Implement proper error logging.
  - Return appropriate HTTP status codes.
  - Handle edge cases gracefully.

## 15. Monitoring & Logging

- **Application Monitoring:**

  - Use PostHog for analytics.
  - Implement error tracking.
  - Monitor performance metrics.
  - Set up alerts for critical issues.

- **Logging:**
  - Use structured logging.
  - Include request IDs for tracing.
  - Log appropriate levels (error, warn, info).
  - Implement log rotation.

## 16. Development Workflow

- **Git Workflow:**

  - Use feature branches.
  - Require PR reviews.
  - Squash commits before merging.
  - Keep commit messages clear and descriptive.

- **Code Review:**
  - Review for functionality.
  - Check for security issues.
  - Verify test coverage.
  - Ensure documentation is updated.

## 17. Getting Started

- Run DB migrations: `pnpm run db:push` from the `ui` folder (for Prisma).
- Start frontend: `pnpm run dev` in `apps/ui`.
- Start worker: `pnpm run start:dev` in `apps/zzyra-worker`.
- Deploy: Use Netlify or your configured deployment pipeline.

## 18. General Guidelines

- Always check both UI and worker for integration and sync when adding or updating features.
- If unsure, check the `docs/`, `apps/ui/`, or `apps/zzyra-worker/` folders for reference.
- Do not create unnecessary files; keep the codebase clean and maintainable.
- Each file should be self-contained, easy to maintain, and understand.
- All new files must be under 300 lines; split larger features into multiple, self-contained, loosely coupled files.
