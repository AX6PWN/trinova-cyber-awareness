-- ============================================================
-- CYBERSAFE 360° — B2B SAAS POSTGRESQL SCHEMA (NEON)
-- Project: bold-surf-20847857 (Branch: production)
-- ============================================================

-- 1. Organizations (B2B Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'enterprise',
    industry VARCHAR(100) DEFAULT 'Technology & Finance',
    security_score INTEGER DEFAULT 82,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Employees & Administrators)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee', -- 'admin', 'compliance_officer', 'employee'
    department VARCHAR(100) DEFAULT 'Operations',
    avatar VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Topic Progress
CREATE TABLE IF NOT EXISTS training_progress (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    org_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    topic_id VARCHAR(100) NOT NULL,
    topic_title VARCHAR(255),
    completed BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic_id)
);

-- 4. Quiz Attempts & Knowledge Assessments
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    org_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    score VARCHAR(50) NOT NULL,
    percentage INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Pass', 'Fail'
    breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Certificates of Cybersecurity Compliance
CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(64) PRIMARY KEY,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    org_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    org_name VARCHAR(255) NOT NULL,
    issue_date VARCHAR(100) NOT NULL,
    expiry_date VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL,
    verification_hash VARCHAR(255),
    status VARCHAR(50) DEFAULT 'verified'
);

-- 6. B2B Security Campaigns / Compliance Drills
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline VARCHAR(100),
    target_department VARCHAR(100) DEFAULT 'All Departments',
    status VARCHAR(50) DEFAULT 'active',
    mandatory BOOLEAN DEFAULT TRUE,
    completion_rate INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Enterprise Security Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(64),
    user_email VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    severity VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'critical'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial B2B Seed Data
INSERT INTO organizations (id, name, domain, plan, industry, security_score)
VALUES 
    ('org-acme', 'Acme CyberDefense Corp', 'acmesec.com', 'enterprise', 'Defense & Aerospace', 88),
    ('org-fintech', 'FinTech Global Trust', 'fintechtrust.io', 'enterprise', 'Banking & Payments', 76)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, org_id, email, password_hash, full_name, role, department, avatar)
VALUES
    ('usr-admin-1', 'org-acme', 'ciso@acmesec.com', 'scrypt_demo_hash', 'Elena Rostova, CISO', 'admin', 'Security Operations', '🛡️'),
    ('usr-emp-1', 'org-acme', 'alex.turner@acmesec.com', 'scrypt_demo_hash', 'Alex Turner', 'employee', 'Finance', '👤'),
    ('usr-emp-2', 'org-acme', 'sarah.chen@acmesec.com', 'scrypt_demo_hash', 'Sarah Chen', 'employee', 'Engineering', '👩‍💻'),
    ('usr-emp-3', 'org-acme', 'david.kim@acmesec.com', 'scrypt_demo_hash', 'David Kim', 'employee', 'Human Resources', '👨‍💼')
ON CONFLICT (id) DO NOTHING;
