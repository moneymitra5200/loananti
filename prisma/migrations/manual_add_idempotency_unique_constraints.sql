-- ============================================================
-- Migration: add_idempotency_unique_constraints
-- Date: 2026-05-20
-- 
-- Purpose: Add unique constraints on referenceId fields to
-- prevent double-accounting at the database level (idempotency).
--
-- These constraints work alongside application-level checks in:
--   src/lib/db-utils.ts (isCashBookEntryDuplicate, isBankTransactionDuplicate)
--   src/lib/simple-accounting.ts (findFirst before create)
--
-- MySQL: NULL values are treated as distinct, so two NULLs are
-- NOT considered duplicates. Only non-null referenceIds are unique.
--
-- Run this on production (Hostinger) via SSH or Hostinger MySQL panel:
--   mysql -u u889282535_loanmoney -p u889282535_loanmoney < this_file.sql
-- ============================================================

-- CashBookEntry: prevent duplicate cash accounting entries
CREATE UNIQUE INDEX IF NOT EXISTS `CashBookEntry_referenceId_key`
  ON `CashBookEntry` (`referenceId`);

-- BankTransaction: prevent duplicate bank accounting entries  
CREATE UNIQUE INDEX IF NOT EXISTS `BankTransaction_referenceId_key`
  ON `BankTransaction` (`referenceId`);
