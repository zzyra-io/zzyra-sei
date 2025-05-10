-- Production Migration File for Workflow Automation System
-- This migration ensures all necessary database objects are created and configured properly

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- Create or update workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create or update workflow_executions table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'canceled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    triggered_by UUID,
    result JSONB,
    logs JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE
);

-- Create or update execution_logs table
CREATE TABLE IF NOT EXISTS public.execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL,
    node_id TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
    message TEXT NOT NULL,
    data JSONB,
    timestamp TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (execution_id) REFERENCES public.workflow_executions(id) ON DELETE CASCADE
);

-- Create profiles table for user data and subscription information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'inactive',
    subscription_expires_at TIMESTAMPTZ,
    monthly_execution_quota INTEGER DEFAULT 100,
    monthly_execution_count INTEGER DEFAULT 0,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create teams table for team collaboration
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create team_members table for team membership
CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create custom_blocks table for user-defined workflow blocks
CREATE TABLE IF NOT EXISTS public.custom_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    code TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create workflow_templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_public ON public.workflows(is_public);
CREATE INDEX IF NOT EXISTS idx_workflows_tags ON public.workflows USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_triggered_by ON public.workflow_executions(triggered_by);
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON public.execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_level ON public.execution_logs(level);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_updated_at ON public.%I;
            CREATE TRIGGER update_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Safely insert profile id; ignore any errors
    BEGIN
        INSERT INTO public.profiles (id)
        VALUES (NEW.id)
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- ignore failures to prevent auth signup errors
        NULL;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Create function to reset monthly execution count
CREATE OR REPLACE FUNCTION reset_monthly_execution_count()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET monthly_execution_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Create Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for workflows
CREATE POLICY workflows_select_own ON public.workflows 
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY workflows_insert_own ON public.workflows 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY workflows_update_own ON public.workflows 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY workflows_delete_own ON public.workflows 
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for workflow_executions
CREATE POLICY workflow_executions_select_own ON public.workflow_executions 
    FOR SELECT USING (
        auth.uid() = triggered_by OR 
        auth.uid() IN (
            SELECT user_id FROM public.workflows WHERE id = workflow_id
        )
    );
CREATE POLICY workflow_executions_insert_own ON public.workflow_executions 
    FOR INSERT WITH CHECK (
        auth.uid() = triggered_by OR 
        auth.uid() IN (
            SELECT user_id FROM public.workflows WHERE id = workflow_id
        )
    );

-- Create policies for execution_logs
CREATE POLICY execution_logs_select_own ON public.execution_logs 
    FOR SELECT USING (
        execution_id IN (
            SELECT id FROM public.workflow_executions 
            WHERE triggered_by = auth.uid() OR 
            workflow_id IN (
                SELECT id FROM public.workflows WHERE user_id = auth.uid()
            )
        )
    );

-- Create policies for profiles
CREATE POLICY profiles_select_own ON public.profiles 
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

-- Create policies for teams
CREATE POLICY teams_select_member ON public.teams 
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        ) OR created_by = auth.uid()
    );
CREATE POLICY teams_insert_own ON public.teams 
    FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY teams_update_admin ON public.teams 
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        auth.uid() IN (
            SELECT user_id FROM public.team_members 
            WHERE team_id = id AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY teams_delete_owner ON public.teams 
    FOR DELETE USING (
        created_by = auth.uid() OR 
        auth.uid() IN (
            SELECT user_id FROM public.team_members 
            WHERE team_id = id AND role = 'owner'
        )
    );

-- Create policies for team_members
CREATE POLICY team_members_select_member ON public.team_members 
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        ) OR team_id IN (
            SELECT id FROM public.teams WHERE created_by = auth.uid()
        )
    );
CREATE POLICY team_members_insert_admin ON public.team_members 
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT id FROM public.teams WHERE created_by = auth.uid()
        ) OR team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
CREATE POLICY team_members_delete_admin ON public.team_members 
    FOR DELETE USING (
        team_id IN (
            SELECT id FROM public.teams WHERE created_by = auth.uid()
        ) OR team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Create policies for custom_blocks
CREATE POLICY custom_blocks_select_own ON public.custom_blocks 
    FOR SELECT USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY custom_blocks_insert_own ON public.custom_blocks 
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY custom_blocks_update_own ON public.custom_blocks 
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY custom_blocks_delete_own ON public.custom_blocks 
    FOR DELETE USING (user_id = auth.uid());

-- Create policies for notifications
CREATE POLICY notifications_select_own ON public.notifications 
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON public.notifications 
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notifications_delete_own ON public.notifications 
    FOR DELETE USING (user_id = auth.uid());

-- Create sample workflow templates
INSERT INTO public.workflow_templates (name, description, category, nodes, edges)
VALUES 
(
    'Price Alert Workflow', 
    'Monitors crypto price and sends email notification', 
    'finance',
    '[
        {
            "id": "node-1",
            "type": "price-monitor",
            "position": {"x": 100, "y": 100},
            "data": {
                "nodeType": "trigger",
                "config": {
                    "asset": "ETH",
                    "targetPrice": "2000",
                    "condition": "above"
                }
            }
        },
        {
            "id": "node-2",
            "type": "email",
            "position": {"x": 400, "y": 100},
            "data": {
                "nodeType": "action",
                "config": {
                    "subject": "ETH Price Alert",
                    "body": "ETH price is now {{currentPrice}} USD, which is {{condition}} your target of {{targetPrice}} USD."
                }
            }
        }
    ]'::jsonb,
    '[
        {
            "id": "edge-1",
            "source": "node-1",
            "target": "node-2",
            "type": "custom"
        }
    ]'::jsonb
),
(
    'Scheduled Database Backup', 
    'Runs a database backup on schedule and sends notification', 
    'database',
    '[
        {
            "id": "node-1",
            "type": "schedule",
            "position": {"x": 100, "y": 100},
            "data": {
                "nodeType": "trigger",
                "config": {
                    "cronExpression": "0 0 * * *",
                    "timezone": "UTC"
                }
            }
        },
        {
            "id": "node-2",
            "type": "database",
            "position": {"x": 400, "y": 100},
            "data": {
                "nodeType": "action",
                "config": {
                    "operation": "backup",
                    "database": "{{env.DATABASE_URL}}"
                }
            }
        },
        {
            "id": "node-3",
            "type": "notification",
            "position": {"x": 700, "y": 100},
            "data": {
                "nodeType": "action",
                "config": {
                    "title": "Database Backup",
                    "message": "Database backup completed successfully",
                    "type": "success"
                }
            }
        }
    ]'::jsonb,
    '[
        {
            "id": "edge-1",
            "source": "node-1",
            "target": "node-2",
            "type": "custom"
        },
        {
            "id": "edge-2",
            "source": "node-2",
            "target": "node-3",
            "type": "custom"
        }
    ]'::jsonb
),
(
    'Webhook to Email', 
    'Receives webhook data and sends email notification', 
    'integration',
    '[
        {
            "id": "node-1",
            "type": "webhook",
            "position": {"x": 100, "y": 100},
            "data": {
                "nodeType": "trigger",
                "config": {
                    "path": "/webhook/{{workflowId}}",
                    "method": "POST"
                }
            }
        },
        {
            "id": "node-2",
            "type": "transform",
            "position": {"x": 400, "y": 100},
            "data": {
                "nodeType": "action",
                "config": {
                    "template": "Received data: {{JSON.stringify(data, null, 2)}}"
                }
            }
        },
        {
            "id": "node-3",
            "type": "email",
            "position": {"x": 700, "y": 100},
            "data": {
                "nodeType": "action",
                "config": {
                    "subject": "Webhook Received",
                    "body": "{{transformedData}}"
                }
            }
        }
    ]'::jsonb,
    '[
        {
            "id": "edge-1",
            "source": "node-1",
            "target": "node-2",
            "type": "custom"
        },
        {
            "id": "edge-2",
            "source": "node-2",
            "target": "node-3",
            "type": "custom"
        }
    ]'::jsonb
);

-- Ensure new profile columns are nullable
ALTER TABLE public.profiles
  ALTER COLUMN subscription_expires_at DROP NOT NULL,
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- Create scheduled job for monthly quota reset (if pg_cron extension is available)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        PERFORM cron.schedule('0 0 1 * *', 'SELECT reset_monthly_execution_count()');
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- pg_cron extension not available, skip this step
        RAISE NOTICE 'pg_cron extension not available, skipping scheduled job creation';
END $$;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant necessary permissions to anon users (for public workflows)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.workflows TO anon;
GRANT SELECT ON public.workflow_templates TO anon;
GRANT SELECT ON public.custom_blocks TO anon;

-- Create function for workflow execution rate limiting
CREATE OR REPLACE FUNCTION check_workflow_execution_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_quota INTEGER;
    user_count INTEGER;
BEGIN
    -- Get user's quota and current count
    SELECT monthly_execution_quota, monthly_execution_count 
    INTO user_quota, user_count
    FROM public.profiles
    WHERE id = NEW.triggered_by;
    
    -- Check if user is over quota
    IF user_count >= user_quota THEN
        RAISE EXCEPTION 'Monthly workflow execution quota exceeded';
    END IF;
    
    -- Increment execution count
    UPDATE public.profiles
    SET monthly_execution_count = monthly_execution_count + 1
    WHERE id = NEW.triggered_by;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workflow execution rate limiting
DROP TRIGGER IF EXISTS check_execution_limit ON public.workflow_executions;
CREATE TRIGGER check_execution_limit
BEFORE INSERT ON public.workflow_executions
FOR EACH ROW
EXECUTE FUNCTION check_workflow_execution_limit();