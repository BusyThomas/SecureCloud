-- Assignment 2 schema sketch.
-- Each section belongs to one service. IDs are supplied by the owning service.
-- Cross-service references are values, not database foreign keys.

CREATE SCHEMA identity_service;
CREATE SCHEMA file_service;
CREATE SCHEMA sharing_service;

CREATE TABLE identity_service.users (
    user_id UUID PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('member', 'admin')),
    account_status VARCHAR(20) NOT NULL CHECK (account_status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE file_service.folders (
    folder_id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    parent_folder_id UUID,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (folder_id, owner_user_id),
    FOREIGN KEY (parent_folder_id, owner_user_id)
        REFERENCES file_service.folders(folder_id, owner_user_id)
);

CREATE TABLE file_service.files (
    file_id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    folder_id UUID,
    original_name VARCHAR(255) NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    content_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    checksum_sha256 CHAR(64) NOT NULL,
    file_status VARCHAR(20) NOT NULL CHECK (file_status IN ('active', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id, owner_user_id)
        REFERENCES file_service.folders(folder_id, owner_user_id)
);

CREATE TABLE file_service.file_versions (
    version_id UUID PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES file_service.files(file_id),
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    object_key TEXT NOT NULL UNIQUE,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    checksum_sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (file_id, version_number)
);

CREATE TABLE sharing_service.shares (
    share_id UUID PRIMARY KEY,
    file_id UUID NOT NULL,
    owner_user_id UUID NOT NULL,
    recipient_user_id UUID NOT NULL,
    permission VARCHAR(10) NOT NULL CHECK (permission IN ('view', 'edit')),
    share_status VARCHAR(20) NOT NULL CHECK (share_status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX files_owner_folder_idx
    ON file_service.files (owner_user_id, folder_id);

CREATE UNIQUE INDEX folders_root_name_idx
    ON file_service.folders (owner_user_id, name)
    WHERE parent_folder_id IS NULL;

CREATE UNIQUE INDEX folders_child_name_idx
    ON file_service.folders (owner_user_id, parent_folder_id, name)
    WHERE parent_folder_id IS NOT NULL;

CREATE INDEX shares_file_recipient_idx
    ON sharing_service.shares (file_id, recipient_user_id);
