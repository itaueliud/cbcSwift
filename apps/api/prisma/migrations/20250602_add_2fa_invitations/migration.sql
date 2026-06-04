-- Two Factor Auth tables
CREATE TABLE IF NOT EXISTS "two_factor_setups" (
    "two_fa_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT UNIQUE,
    "platform_user_id" TEXT UNIQUE,
    "secret" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "setup_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "two_factor_recovery_codes" (
    "code_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "platform_user_id" TEXT,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "trusted_devices" (
    "device_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "platform_user_id" TEXT,
    "device_token" TEXT NOT NULL UNIQUE,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invitations table
CREATE TABLE IF NOT EXISTS "invitations" (
    "invitation_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL UNIQUE,
    "is_used" BOOLEAN NOT NULL DEFAULT FALSE,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),
    "additional_data" JSONB,
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id"),
    FOREIGN KEY ("created_by") REFERENCES "users"("user_id")
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bot conversations
CREATE TABLE IF NOT EXISTS "bot_conversations" (
    "conversation_id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
