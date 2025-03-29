-- SQL script to create the necessary tables in Supabase

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    whatsapp_id TEXT UNIQUE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create presentations table
CREATE TABLE IF NOT EXISTS presentations (
    id SERIAL PRIMARY KEY,
    whatsapp_id TEXT NOT NULL,
    title TEXT NOT NULL,
    topics TEXT[] NOT NULL,
    presentation_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (whatsapp_id) REFERENCES users(whatsapp_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_id ON users(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_presentations_whatsapp_id ON presentations(whatsapp_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at field
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();