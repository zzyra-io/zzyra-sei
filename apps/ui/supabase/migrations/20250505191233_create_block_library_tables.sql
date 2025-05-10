-- Create block_library table
CREATE TABLE IF NOT EXISTS public.block_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    block_type TEXT NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}',
    execution_code TEXT,
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating DECIMAL(3, 2) DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    version TEXT DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.block_library ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own blocks and public blocks
CREATE POLICY "Users can view their own blocks" 
    ON public.block_library
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR is_public = TRUE 
        OR is_verified = TRUE
    );

-- Policy to allow users to insert their own blocks
CREATE POLICY "Users can insert their own blocks" 
    ON public.block_library
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own blocks
CREATE POLICY "Users can update their own blocks" 
    ON public.block_library
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own blocks
CREATE POLICY "Users can delete their own blocks" 
    ON public.block_library
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create block_library_ratings table for user ratings
CREATE TABLE IF NOT EXISTS public.block_library_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.block_library(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (block_id, user_id)
);

-- Add RLS policies for ratings
ALTER TABLE public.block_library_ratings ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view all ratings
CREATE POLICY "Users can view all ratings" 
    ON public.block_library_ratings
    FOR SELECT
    USING (TRUE);

-- Policy to allow users to insert their own ratings
CREATE POLICY "Users can insert their own ratings" 
    ON public.block_library_ratings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own ratings
CREATE POLICY "Users can update their own ratings" 
    ON public.block_library_ratings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own ratings
CREATE POLICY "Users can delete their own ratings" 
    ON public.block_library_ratings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update average rating when ratings change
CREATE OR REPLACE FUNCTION update_block_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.block_library
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.block_library_ratings
        WHERE block_id = NEW.block_id
    )
    WHERE id = NEW.block_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update block rating when ratings change
CREATE TRIGGER update_block_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.block_library_ratings
FOR EACH ROW
EXECUTE FUNCTION update_block_rating();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_block_usage_count(block_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.block_library
    SET usage_count = usage_count + 1
    WHERE id = block_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS block_library_user_id_idx ON public.block_library(user_id);
CREATE INDEX IF NOT EXISTS block_library_block_type_idx ON public.block_library(block_type);
CREATE INDEX IF NOT EXISTS block_library_rating_idx ON public.block_library(rating);
CREATE INDEX IF NOT EXISTS block_library_is_public_idx ON public.block_library(is_public);
CREATE INDEX IF NOT EXISTS block_library_is_verified_idx ON public.block_library(is_verified);
