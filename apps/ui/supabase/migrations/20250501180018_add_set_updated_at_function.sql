-- Create function to automatically set updated_at timestamp
create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;