# Frontend Rules for Zyra

## Next.js Architecture

### App Router Structure

- Use App Router for all new pages
- Follow the directory structure:
  ```
  app/
  ├── (auth)/
  │   ├── login/
  │   └── register/
  ├── (dashboard)/
  │   ├── workflows/
  │   └── settings/
  ├── api/
  └── layout.tsx
  ```
- Use route groups for organization
- Keep layouts minimal and reusable

### Server vs Client Components

- Use Server Components by default
- Add 'use client' only when needed
- Keep client components small
- Pass server data to client components

```typescript
// Server Component
export default async function WorkflowList() {
  const workflows = await getWorkflows();
  return <WorkflowListClient workflows={workflows} />;
}

// Client Component
'use client';
export function WorkflowListClient({ workflows }: Props) {
  const [filter, setFilter] = useState('');
  return (
    <div>
      <FilterInput value={filter} onChange={setFilter} />
      <WorkflowGrid workflows={workflows} filter={filter} />
    </div>
  );
}
```

## Component Structure

### Component Organization

- One component per file
- Colocate styles and types
- Use proper file naming
- Follow atomic design

```typescript
// components/atoms/Button.tsx
export function Button({ children, ...props }: ButtonProps) {
  return <button className={styles.button} {...props}>{children}</button>;
}

// components/molecules/WorkflowCard.tsx
export function WorkflowCard({ workflow }: WorkflowCardProps) {
  return (
    <Card>
      <WorkflowHeader workflow={workflow} />
      <WorkflowStatus status={workflow.status} />
      <WorkflowActions workflow={workflow} />
    </Card>
  );
}
```

### Component Props

- Use TypeScript for props
- Document required props
- Use proper prop types
- Handle optional props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}
```

## State Management

### Local State

- Use useState for simple state
- Use zustand for complex state
- Keep state close to usage
- Use proper state types

```typescript
interface WorkflowState {
  workflows: Workflow[];
  filter: string;
  sortBy: "name" | "date";
  isLoading: boolean;
  error: Error | null;
}

function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction
): WorkflowState {
  switch (action.type) {
    case "SET_WORKFLOWS":
      return { ...state, workflows: action.payload };
    case "SET_FILTER":
      return { ...state, filter: action.payload };
    // ...
  }
}
```

### Global State

- Use TanStack Query for server state
- Use Zustand for client state
- Keep global state minimal
- Use proper state selectors

```typescript
interface WorkflowStore {
  selectedWorkflow: string | null;
  setSelectedWorkflow: (id: string | null) => void;
  filters: WorkflowFilters;
  setFilters: (filters: WorkflowFilters) => void;
}

const useWorkflowStore = create<WorkflowStore>((set) => ({
  selectedWorkflow: null,
  setSelectedWorkflow: (id) => set({ selectedWorkflow: id }),
  filters: {},
  setFilters: (filters) => set({ filters }),
}));
```

## Data Fetching

### TanStack Query

- Use proper query keys
- Handle loading states
- Handle error states
- Use proper cache invalidation

```typescript
function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.getWorkflows(),
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });
}

function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflow", id],
    queryFn: () => api.getWorkflow(id),
    enabled: !!id,
  });
}
```

### Mutations

- Use proper mutation keys
- Handle optimistic updates
- Handle error states
- Use proper rollback

```typescript
function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowDTO) => api.createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error) => {
      toast.error("Failed to create workflow");
    },
  });
}
```

## Forms

### React Hook Form

- Use proper validation
- Handle form state
- Use proper field types
- Handle form submission

```typescript
function WorkflowForm() {
  const form = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: '',
      description: '',
      steps: []
    }
  });

  const onSubmit = async (data: WorkflowFormData) => {
    try {
      await createWorkflow(data);
      toast.success('Workflow created');
    } catch (error) {
      toast.error('Failed to create workflow');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </form>
  );
}
```

## Styling

### Tailwind CSS

- Use proper class organization
- Use proper color tokens
- Use proper spacing tokens
- Use proper typography tokens

```typescript
function Card({ children }: CardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {children}
    </div>
  );
}
```

### Component Styling

- Use proper component variants
- Use proper component states
- Use proper component sizes
- Use proper component themes

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## Testing

### Component Testing

- Test component rendering
- Test component interactions
- Test component states
- Test component props

```typescript
describe('WorkflowCard', () => {
  it('renders workflow name', () => {
    const workflow = { id: '1', name: 'Test Workflow' };
    render(<WorkflowCard workflow={workflow} />);
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onSelect = jest.fn();
    const workflow = { id: '1', name: 'Test Workflow' };
    render(<WorkflowCard workflow={workflow} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Test Workflow'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

### Integration Testing

- Test component integration
- Test data flow
- Test user interactions
- Test error states

```typescript
describe('WorkflowList', () => {
  it('loads and displays workflows', async () => {
    render(<WorkflowList />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    });
  });

  it('handles errors', async () => {
    server.use(
      rest.get('/api/workflows', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    render(<WorkflowList />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load workflows')).toBeInTheDocument();
    });
  });
});
```

## Performance

### Code Splitting

- Use dynamic imports
- Use proper chunking
- Use proper preloading
- Use proper prefetching

```typescript
const WorkflowEditor = dynamic(() => import('./WorkflowEditor'), {
  loading: () => <WorkflowEditorSkeleton />,
  ssr: false
});
```

### Optimization

- Use proper memoization
- Use proper virtualization
- Use proper lazy loading
- Use proper image optimization

```typescript
const MemoizedWorkflowCard = memo(WorkflowCard, (prev, next) => {
  return prev.workflow.id === next.workflow.id;
});

function WorkflowList({ workflows }: Props) {
  return (
    <VirtualizedList
      data={workflows}
      renderItem={({ item }) => (
        <MemoizedWorkflowCard workflow={item} />
      )}
    />
  );
}
```

## Accessibility

### WCAG Compliance

- Use proper ARIA attributes
- Use proper semantic HTML
- Use proper keyboard navigation
- Use proper focus management

```typescript
function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workflow Details</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
```

### Screen Reader Support

- Use proper alt text
- Use proper aria labels
- Use proper roles
- Use proper landmarks

```typescript
function WorkflowStatus({ status }: Props) {
  return (
    <div
      role="status"
      aria-label={`Workflow status: ${status}`}
    >
      <StatusIcon status={status} />
      <span>{status}</span>
    </div>
  );
}
```
