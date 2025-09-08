-- Aster Health App Database Schema
-- Generated from Supabase database structure
-- Date: 2025-09-08

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USER AND PROFILE TABLES
-- =============================================================================

-- User profiles table - extends Supabase auth.users
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    birthdate DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PERIOD TRACKING TABLES
-- =============================================================================

-- Main periods tracking table
CREATE TABLE periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    flow_level INTEGER CHECK (flow_level >= 1 AND flow_level <= 5),
    symptoms TEXT[],
    notes TEXT,
    mood TEXT,
    energy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flow intensity logs for detailed tracking
CREATE TABLE flow_intensity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily logs for comprehensive health tracking
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    flow_level INTEGER CHECK (flow_level >= 1 AND flow_level <= 5),
    symptoms TEXT[],
    mood TEXT,
    energy TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- =============================================================================
-- CYCLE PREDICTION TABLES
-- =============================================================================

-- ML-generated cycle predictions
CREATE TABLE cycle_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    predicted_period_date DATE NOT NULL,
    predicted_ovulation_date DATE,
    predicted_cycle_length INTEGER DEFAULT 28,
    confidence_score NUMERIC(3,2),
    prediction_method TEXT DEFAULT 'average',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- FOOD LOGGING TABLES
-- =============================================================================

-- Daily meal logs summary
CREATE TABLE meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    total_calories INTEGER DEFAULT 0,
    total_protein FLOAT8 DEFAULT 0,
    total_carbs FLOAT8 DEFAULT 0,
    total_fat FLOAT8 DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

-- Individual meals within a day
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES meal_logs(id) ON DELETE CASCADE,
    meal_type TEXT CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
    calories INTEGER,
    protein FLOAT8,
    carbs FLOAT8,
    fat FLOAT8,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Individual food items within meals
CREATE TABLE meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
    item_name TEXT,
    calories INTEGER,
    protein FLOAT8,
    carbs FLOAT8,
    fat FLOAT8
);

-- Water intake tracking
CREATE TABLE water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    amount_oz FLOAT8 DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

-- =============================================================================
-- NOTIFICATION AND SETTINGS TABLES
-- =============================================================================

-- User reminder settings
CREATE TABLE reminder_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    reminder_days INTEGER[] DEFAULT '{}',
    checkin_enabled BOOLEAN DEFAULT TRUE,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================================================
-- SYMPTOM TRACKING TABLES
-- =============================================================================

-- Available symptom categories
CREATE TABLE symptom_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    emoji TEXT,
    category TEXT NOT NULL,
    severity_scale BOOLEAN DEFAULT FALSE,
    common_during_phase TEXT[],
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User profile indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Period tracking indexes
CREATE INDEX idx_periods_user_id ON periods(user_id);
CREATE INDEX idx_periods_start_date ON periods(start_date);
CREATE INDEX idx_periods_user_date ON periods(user_id, start_date);

-- Cycle prediction indexes
CREATE INDEX idx_cycle_predictions_user_id ON cycle_predictions(user_id);
CREATE INDEX idx_cycle_predictions_active ON cycle_predictions(user_id, is_active);

-- Meal logging indexes
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, log_date);
CREATE INDEX idx_meals_log_id ON meals(log_id);
CREATE INDEX idx_meal_items_meal_id ON meal_items(meal_id);
CREATE INDEX idx_water_logs_user_date ON water_logs(user_id, log_date);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_intensity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

-- User can only access their own data policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own periods" ON periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own periods" ON periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own periods" ON periods FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own flow logs" ON flow_intensity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flow logs" ON flow_intensity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own daily logs" ON daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily logs" ON daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily logs" ON daily_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own predictions" ON cycle_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON cycle_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON cycle_predictions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meal logs" ON meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal logs" ON meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal logs" ON meal_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own water logs" ON water_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own water logs" ON water_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own water logs" ON water_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reminder settings" ON reminder_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminder settings" ON reminder_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminder settings" ON reminder_settings FOR UPDATE USING (auth.uid() = user_id);

-- Symptom categories are public (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view symptom categories" ON symptom_categories FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- SAMPLE DATA (OPTIONAL)
-- =============================================================================

-- Insert sample symptom categories
INSERT INTO symptom_categories (name, emoji, category, severity_scale, description) VALUES
('Cramps', '😣', 'Physical', true, 'Menstrual cramps and abdominal pain'),
('Bloating', '🎈', 'Physical', true, 'Abdominal bloating and water retention'),
('Mood Swings', '😭', 'Emotional', true, 'Emotional fluctuations and mood changes'),
('Fatigue', '😴', 'Physical', true, 'Tiredness and low energy levels'),
('Headache', '🤕', 'Physical', true, 'Head pain and tension'),
('Acne', '🔴', 'Physical', false, 'Skin breakouts and blemishes'),
('Breast Tenderness', '💗', 'Physical', true, 'Breast sensitivity and soreness'),
('Food Cravings', '🍫', 'Behavioral', false, 'Strong desires for specific foods'),
('Insomnia', '🌙', 'Physical', true, 'Difficulty sleeping'),
('Anxiety', '😰', 'Emotional', true, 'Feelings of worry and nervousness');

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reminder_settings updated_at
CREATE TRIGGER update_reminder_settings_updated_at 
    BEFORE UPDATE ON reminder_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE user_profiles IS 'Extended user profile information beyond Supabase auth';
COMMENT ON TABLE periods IS 'Main menstrual period tracking entries';
COMMENT ON TABLE flow_intensity_logs IS 'Detailed daily flow intensity tracking';
COMMENT ON TABLE daily_logs IS 'Comprehensive daily health and symptom logs';
COMMENT ON TABLE cycle_predictions IS 'ML-generated menstrual cycle predictions';
COMMENT ON TABLE meal_logs IS 'Daily nutrition summary logs';
COMMENT ON TABLE meals IS 'Individual meals within daily logs';
COMMENT ON TABLE meal_items IS 'Individual food items within meals';
COMMENT ON TABLE water_logs IS 'Daily water intake tracking';
COMMENT ON TABLE reminder_settings IS 'User notification and reminder preferences';
COMMENT ON TABLE symptom_categories IS 'Available symptoms for tracking';