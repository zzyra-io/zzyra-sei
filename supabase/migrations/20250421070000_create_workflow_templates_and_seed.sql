-- Create workflow_templates table and seed default entries

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  category TEXT,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default templates
INSERT INTO workflow_templates (name, description, tags, category, nodes, edges)
VALUES
  ('Empty Workflow', 'A blank workflow to start from scratch.', ARRAY[]::TEXT[], 'general', '[]'::JSONB, '[]'::JSONB),
  ('Hello World', 'Logs Hello World via a JavaScript transform block.', ARRAY['example']::TEXT[], 'examples',
    '[{"id":"node1","type":"TRANSFORM","position":{"x":100,"y":100},"data":{"transformType":"javascript","code":"console.log(\"Hello World\"); return { message: \"Hello World\" };"}}]'::JSONB,
    '[]'::JSONB),
  ('Scheduled Email', 'Sends a daily email notification.', ARRAY['email','schedule']::TEXT[], 'automation',
    '[
      {"id":"node1","type":"SCHEDULE","position":{"x":100,"y":100},"data":{"interval":"daily","time":"09:00"}},
      {"id":"node2","type":"NOTIFICATION","position":{"x":300,"y":100},"data":{"type":"info","title":"Daily Reminder","message":"Time for your daily check-in!"}}
    ]'::JSONB,
    '[{"source":"node1","target":"node2"}]'::JSONB);
