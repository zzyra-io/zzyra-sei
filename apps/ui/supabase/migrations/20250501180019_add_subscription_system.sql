-- Create pricing tiers table
create table public.pricing_tiers (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    price_monthly decimal not null,
    price_yearly decimal not null,
    workflow_limit int not null,
    execution_limit int not null,
    features jsonb not null default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create subscriptions table
create table public.subscriptions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    tier_id uuid references public.pricing_tiers(id) on delete restrict not null,
    status text not null check (status in ('active', 'canceled', 'past_due', 'incomplete')),
    stripe_subscription_id text unique,
    stripe_customer_id text,
    current_period_start timestamp with time zone not null,
    current_period_end timestamp with time zone not null,
    cancel_at timestamp with time zone,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create subscription_invoices table
create table public.subscription_invoices (
    id uuid primary key default uuid_generate_v4(),
    subscription_id uuid references public.subscriptions(id) on delete cascade not null,
    stripe_invoice_id text unique,
    amount decimal not null,
    status text not null check (status in ('draft', 'open', 'paid', 'uncollectible', 'void')),
    billing_reason text not null,
    invoice_pdf text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create usage_logs table
create table public.usage_logs (
    id uuid primary key default uuid_generate_v4(),
    subscription_id uuid references public.subscriptions(id) on delete cascade not null,
    resource_type text not null check (resource_type in ('workflow_execution', 'storage', 'api_calls')),
    quantity int not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.pricing_tiers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_invoices enable row level security;
alter table public.usage_logs enable row level security;

-- Pricing tiers visible to all authenticated users
create policy "Pricing tiers visible to all users"
    on public.pricing_tiers for select
    to authenticated
    using (true);

-- Users can only view their own subscriptions
create policy "Users can view own subscriptions"
    on public.subscriptions for select
    to authenticated
    using (auth.uid() = user_id);

-- Users can only view their own invoices
create policy "Users can view own invoices"
    on public.subscription_invoices for select
    to authenticated
    using (
        auth.uid() in (
            select user_id
            from public.subscriptions
            where id = subscription_id
        )
    );

-- Users can only view their own usage logs
create policy "Users can view own usage logs"
    on public.usage_logs for select
    to authenticated
    using (
        auth.uid() in (
            select user_id
            from public.subscriptions
            where id = subscription_id
        )
    );

-- Function to check if user is within limits
create or replace function public.check_subscription_limits(
    p_user_id uuid,
    p_resource_type text,
    p_quantity int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tier_limit int;
    v_current_usage int;
begin
    -- Get the limit from user's active subscription tier
    select
        case
            when p_resource_type = 'workflow_execution' then t.execution_limit
            else t.workflow_limit
        end into v_tier_limit
    from public.subscriptions s
    join public.pricing_tiers t on t.id = s.tier_id
    where s.user_id = p_user_id
    and s.status = 'active'
    and current_timestamp between s.current_period_start and s.current_period_end
    limit 1;

    -- Get current usage in this period
    select coalesce(sum(quantity), 0) into v_current_usage
    from public.usage_logs l
    join public.subscriptions s on s.id = l.subscription_id
    where s.user_id = p_user_id
    and l.resource_type = p_resource_type
    and l.created_at >= s.current_period_start
    and l.created_at < s.current_period_end;

    -- Check if adding new quantity would exceed limit
    return (v_current_usage + p_quantity) <= v_tier_limit;
end;
$$;

-- Add updated_at triggers
create trigger set_timestamp
    before update on public.pricing_tiers
    for each row
    execute procedure public.set_updated_at();

create trigger set_timestamp
    before update on public.subscriptions
    for each row
    execute procedure public.set_updated_at();

create trigger set_timestamp
    before update on public.subscription_invoices
    for each row
    execute procedure public.set_updated_at();