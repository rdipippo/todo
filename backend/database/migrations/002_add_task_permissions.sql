-- Migration 002: Add per-member task permissions
-- Run this against an existing database that has already run schema.sql

ALTER TABLE users
  ADD COLUMN perm_create_tasks BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN perm_edit_tasks   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN perm_delete_tasks BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN perm_assign_tasks BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE invitations
  ADD COLUMN perm_create_tasks BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN perm_edit_tasks   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN perm_delete_tasks BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN perm_assign_tasks BOOLEAN NOT NULL DEFAULT TRUE;
