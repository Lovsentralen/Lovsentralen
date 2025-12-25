-- Supabase Database Schema for Lovsentralen
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  faktum_text TEXT NOT NULL,
  category TEXT CHECK (category IN ('forbrukerkjop', 'husleie', 'arbeidsrett', 'personvern', 'kontrakt', 'erstatning')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'clarifying', 'analyzing', 'completed', 'error')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Clarifications table
CREATE TABLE IF NOT EXISTS clarifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  user_answer TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Results table
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL UNIQUE,
  qa_json JSONB NOT NULL DEFAULT '[]',
  checklist_json JSONB NOT NULL DEFAULT '[]',
  documentation_json JSONB NOT NULL DEFAULT '[]',
  sources_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Evidence table
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  source_name TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  section_hint TEXT,
  source_priority INTEGER CHECK (source_priority BETWEEN 1 AND 4) NOT NULL,
  retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_clarifications_case_id ON clarifications(case_id);
CREATE INDEX IF NOT EXISTS idx_results_case_id ON results(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cases policies
CREATE POLICY "Users can view own cases" ON cases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases" ON cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases" ON cases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases" ON cases
  FOR DELETE USING (auth.uid() = user_id);

-- Clarifications policies
CREATE POLICY "Users can view clarifications for own cases" ON clarifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = clarifications.case_id AND cases.user_id = auth.uid())
  );

CREATE POLICY "Users can insert clarifications for own cases" ON clarifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = clarifications.case_id AND cases.user_id = auth.uid())
  );

CREATE POLICY "Users can update clarifications for own cases" ON clarifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = clarifications.case_id AND cases.user_id = auth.uid())
  );

-- Results policies
CREATE POLICY "Users can view results for own cases" ON results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = results.case_id AND cases.user_id = auth.uid())
  );

CREATE POLICY "Users can insert results for own cases" ON results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = results.case_id AND cases.user_id = auth.uid())
  );

-- Evidence policies
CREATE POLICY "Users can view evidence for own cases" ON evidence
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = evidence.case_id AND cases.user_id = auth.uid())
  );

CREATE POLICY "Users can insert evidence for own cases" ON evidence
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = evidence.case_id AND cases.user_id = auth.uid())
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on cases
DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

