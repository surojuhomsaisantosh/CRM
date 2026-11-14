# Universal CRM — Master Project Requirements & Changelog

This document tracks all project requirements, architectural directives, design goals, and progress checkpoints for building and adapting the Universal CRM software.

---

## 1. Core Directives & Client Requirements

### R-001: Independent Company White-labeling
- **Requirement:** Take the CRM software originally used for Bhuwanta and repurpose it for another company.
- **Specification:**
  - Remove all hardcoded company names (`Bhuwanta`, `BhuwantaCRM`, `bhuwanta.com`, `bhuwanta9@gmail.com`).
  - Implement a centralized branding and configuration system (`siteConfig` / environment variables) for company name, logo, accent colors, domain, and notification targets.

### R-002: Technology Stack & Database Strategy
- **Frontend / Framework:** Next.js (App Router, React 19 / 18, TypeScript).
- **Styling & UI:** Tailwind CSS, Lucide React icons, Sonner toast notifications, Recharts.
- **Backend / Database:** PostgreSQL hosted on **Supabase**.
- **Database Schema Deliverable:** A dedicated SQL schema file (`requirement/supabase_schema.sql`) providing all necessary database tables, constraints, indexes, RLS policies, and seed data.

### R-003: Authentication & Security
- **Requirement:** Add a dedicated CRM Login page (`/crm/login` or `/login`).
- **Specification:**
  - Supabase Auth integration (Email + Password).
  - Session protection via Next.js middleware and server-side authentication guards.
  - Role-Based Access Control (RBAC): Super Admin, Admin, Telecaller, plus custom-created roles.
  - Per-role and per-user permission matrix for each CRM module (`dashboard`, `leads`, `whatsapp`, `projects`, `reports`, `modules`, `users`, `settings`).

### R-004: Requirement Documentation Protocol
- **Requirement:** Maintain a dedicated `requirement/` folder that stores every specification, schema, and architectural analysis requested.
- **Specification:**
  - `requirement/PROJECT_REQUIREMENTS.md`: Living requirements tracker.
  - `requirement/CRM_ARCHITECTURE_ANALYSIS.md`: In-depth system analysis and gap assessment.
  - `requirement/supabase_schema.sql`: Complete PostgreSQL schema ready for execution in the Supabase SQL editor.

### R-005: Safe Execution Gate
- **Requirement:** "Do not make any changes now itself. I need in-depth analysis of our CRM which we are building."
- **Specification:** Conduct a full code audit, architectural review, gap analysis, and provide a clear execution roadmap before modifying any code.

---

## 2. Requirements Ledger & Status Tracker

| Req ID | Description | Status | Target Phase |
| :--- | :--- | :--- | :--- |
| **REQ-01** | Create `requirement/` folder with complete requirements and analysis documentation | **Completed** | Phase 1 |
| **REQ-02** | Create complete Supabase PostgreSQL schema file (`supabase_schema.sql`) | **Completed** | Phase 1 |
| **REQ-03** | In-depth architectural analysis of the CRM software | **Completed** | Phase 1 |
| **REQ-04** | Scaffold Next.js root application (package.json, tsconfig, tailwind, root layout) | Pending Approval | Phase 2 |
| **REQ-05** | Implement missing core libraries (`@/lib/supabase/*`, `@/lib/auth/*`, `@/components/dashboard/Sidebar`, etc.) | Pending Approval | Phase 2 |
| **REQ-06** | Implement CRM Login Page (`/crm/login`) & Auth Middleware | Pending Approval | Phase 2 |
| **REQ-07** | Company Rebranding & White-label Config (Remove Bhuwanta references) | Pending Approval | Phase 3 |
| **REQ-08** | Verify End-to-End Execution (Dev Server running locally on localhost:3000) | Pending Approval | Phase 3 |
