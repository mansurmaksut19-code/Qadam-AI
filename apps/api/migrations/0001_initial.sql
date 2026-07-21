CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  status VARCHAR(32) NOT NULL,
  language VARCHAR(16) NOT NULL,
  access_token_hash CHAR(64) NOT NULL,
  report_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_analyses_status ON analyses(status);

CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  analysis_id UUID NOT NULL UNIQUE REFERENCES analyses(id) ON DELETE CASCADE,
  checksum_sha256 CHAR(64) NOT NULL
);

CREATE TABLE clauses (
  id UUID PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  clause_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL
);
CREATE INDEX ix_clauses_analysis_id ON clauses(analysis_id);

CREATE TABLE legal_chunks (
  id VARCHAR(160) PRIMARY KEY,
  act_title TEXT NOT NULL,
  article_ref VARCHAR(160) NOT NULL,
  canonical_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  embedding vector
);

CREATE TABLE findings (
  id UUID PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  severity VARCHAR(32) NOT NULL,
  category VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL
);
CREATE INDEX ix_findings_analysis_id ON findings(analysis_id);

CREATE TABLE retrieval_logs (
  id BIGSERIAL PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  result_ids JSONB NOT NULL
);
CREATE INDEX ix_retrieval_logs_analysis_id ON retrieval_logs(analysis_id);

CREATE TABLE questions (
  id UUID PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  supported BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_questions_analysis_id ON questions(analysis_id);

CREATE TABLE feedback (
  id UUID PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_feedback_analysis_id ON feedback(analysis_id);
