-- Database Schema for Movement Vote
-- Run this script to set up the database

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  discriminator VARCHAR(10),
  avatar TEXT,
  has_required_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on discord_id for faster lookups
CREATE INDEX idx_users_discord_id ON users(discord_id);

-- Periods table
CREATE TABLE periods (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  current_phase VARCHAR(20) NOT NULL CHECK (current_phase IN ('submission', 'voting', 'winner')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(month)
);

-- Create index on month for faster period lookups
CREATE INDEX idx_periods_month ON periods(month);

-- Submissions table
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  contract_address VARCHAR(255) NOT NULL,
  submitter_id VARCHAR(255) NOT NULL,
  period_id INTEGER NOT NULL,
  name VARCHAR(255),
  thumbnail TEXT,
  description TEXT,
  floor_price DECIMAL(20, 8),
  volume_24h DECIMAL(20, 8),
  total_items INTEGER,
  vote_count INTEGER DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submitter_id) REFERENCES users(discord_id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  UNIQUE(contract_address, period_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_submissions_period_id ON submissions(period_id);
CREATE INDEX idx_submissions_submitter_id ON submissions(submitter_id);
CREATE INDEX idx_submissions_vote_count ON submissions(vote_count DESC);

-- Votes table
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  submission_id INTEGER NOT NULL,
  period_id INTEGER NOT NULL,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(discord_id) ON DELETE CASCADE,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  UNIQUE(user_id, submission_id, period_id)
);

-- Create indexes for faster vote queries
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_submission_id ON votes(submission_id);
CREATE INDEX idx_votes_period_id ON votes(period_id);

-- Winners table
CREATE TABLE winners (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL,
  period_id INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  final_vote_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
  UNIQUE(submission_id, period_id)
);

-- Create indexes for winner queries
CREATE INDEX idx_winners_period_id ON winners(period_id);
CREATE INDEX idx_winners_rank ON winners(rank);

-- Login records table (for admin export)
CREATE TABLE login_records (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  logged_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

-- Create index on user_id and timestamp
CREATE INDEX idx_login_records_user_id ON login_records(user_id);
CREATE INDEX idx_login_records_logged_in_at ON login_records(logged_in_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to get user vote count for a period
CREATE OR REPLACE FUNCTION get_user_vote_count(
  p_user_id VARCHAR(255),
  p_period_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  vote_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO vote_count
  FROM votes
  WHERE user_id = p_user_id AND period_id = p_period_id;
  
  RETURN vote_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and store winners
CREATE OR REPLACE FUNCTION calculate_winners(p_period_id INTEGER)
RETURNS TABLE (
  submission_id INTEGER,
  rank INTEGER,
  final_vote_count INTEGER
) AS $$
BEGIN
  -- Delete existing winners for this period
  DELETE FROM winners WHERE period_id = p_period_id;
  
  -- Insert top 15 submissions as winners
  INSERT INTO winners (submission_id, period_id, rank, final_vote_count)
  SELECT 
    s.id,
    p_period_id,
    ROW_NUMBER() OVER (ORDER BY s.vote_count DESC) as rank,
    s.vote_count
  FROM submissions s
  WHERE s.period_id = p_period_id
  ORDER BY s.vote_count DESC
  LIMIT 15;
  
  -- Return the winners
  RETURN QUERY
  SELECT w.submission_id, w.rank, w.final_vote_count
  FROM winners w
  WHERE w.period_id = p_period_id
  ORDER BY w.rank;
END;
$$ LANGUAGE plpgsql;

-- Insert initial period
INSERT INTO periods (month, current_phase, started_at)
VALUES (
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  'submission',
  CURRENT_TIMESTAMP
);

-- Sample admin user (replace with actual admin Discord IDs)
INSERT INTO users (discord_id, username, discriminator, has_required_role)
VALUES 
  ('admin_id_1', 'Admin1', '0001', TRUE),
  ('admin_id_2', 'Admin2', '0002', TRUE)
ON CONFLICT (discord_id) DO NOTHING;
