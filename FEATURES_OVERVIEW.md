# FunnelFox Features & Architecture Overview

This document serves as a comprehensive walk‑through of the FunnelFox codebase.  It explains the major features, user flows, and supporting backend systems.  The goal is to give a reader a complete understanding of how the tool works from A‑Z.

---

## Table of Contents

1. [Overall Architecture](#overall-architecture)
2. [Database Schema](#database-schema)
3. [Action Center ("Client Hunt" Flow)](#action-center-client-hunt-flow)
   1. [Step 1 – Find Businesses](#step-1--find-businesses)
   2. [Step 2 – Generate Message](#step-2--generate-message)
   3. [Step 3 – Choose Message / Templates](#step-3--choose-message--templates)
   4. [Step 4 – Send Emails](#step-4--send-emails)
   5. [Test Mode](#test-mode)
   6. [Service Filtering & Deduplication](#service-filtering--deduplication)
4. [Campaigns](#campaigns)
   1. [Create / Edit / Delete](#create--edit--delete)
   2. [Preview & Usage Tracking](#preview--usage-tracking)
   3. [Expiration](#expiration)
5. [Contacts](#contacts)
   1. [Filtering & Search](#filtering--search)
   2. [Status Management & Pipeline](#status-management--pipeline)
   3. [Individual Email Sending](#individual-email-sending)
   4. [Block / Unblock](#block--unblock)
   5. [Google Sheets Sync](#google-sheets-sync)
6. [Blocklist](#blocklist)
7. [Reports & Insights](#reports--insights)
   1. [Lead Funnel Chart](#lead-funnel-chart)
   2. [Campaign Performance](#campaign-performance)
   3. [Lost Reason Analysis](#lost-reason-analysis)
8. [Dashboard](#dashboard)
   1. [Stats & Recent Leads](#stats--recent-leads)
   2. [Offline Data Migration](#offline-data-migration)
   3. [Quick Actions](#quick-actions)
9. [Supabase Functions (Cloud Logic)](#supabase-functions-cloud-logic)
   1. [`find-businesses`](#find-businesses)
   2. [`send-email`](#send-email)
   3. [`sync-contacts`](#sync-contacts)
10. [Supporting Utilities](#supporting-utilities)
11. [Tips & Notes](#tips--notes)

---

## Overall Architecture

- **Frontend:** React application under `frontend/` using Tailwind / Radix UI components.  Pages include `Action`, `Contacts`, `Campaigns`, `Blocklist`, `Reports`, `Dashboard`.
- **Backend:** Supabase is used for data storage (PostgreSQL) and serverless edge functions written in Deno.
- **Third‑party APIs:**
  - Serper (Google Places alternative) for business discovery.
  - Google Gemini (LLM) for message generation.
  - Resend.com for SMTP‑style email sending.
  - Optional Google Sheets integration via a Apps Script URL.
- **State & Persistence:** Contacts/campaigns cached in localStorage when offline; migrated to Supabase by the dashboard.


## Database Schema

Located at `Supabase/schema.sql`.  Key tables:

- `contacts` – stores discovered businesses / leads.  Fields include name, address, website, phone, rating, status, `needs_website` / `needs_saas`, `is_blocked`, `email_sent`, timestamps, etc.
- `campaigns` – email templates with name, text, usage_count, expiration.
- `outreach_logs` – history of sent emails tied to contacts.
- `search_history` – records of past business searches (location, type, count).

Row‑level security policies are permissive (single‑user); indices exist for filtering.


## Action Center ("Client Hunt" Flow)

The `/action` page is the core lead‑generation workflow.  It guides the user through four steps:

1. **Find Businesses** – query Serper via Supabase function.
2. **Generate Message** – use Gemini LLM, or choose a saved campaign template.
3. **Choose Message** – optionally edit per‑lead.
4. **Send Emails** – dispatch via `send-email` function and update Supabase.

### Step 1 – Find Businesses

- User enters **Location**, **Business Type**, and number of results (max 50).
- The front end calls `supabase.functions.invoke('find-businesses', {location, businessType, count})`.
- The function posts to `https://google.serper.dev/places` using the `SERPER_API_KEY` environment variable.
- Results are sanitized in the client: social‑only websites are filtered out, duplicates are removed by comparing against existing `contacts` records (name, phone, website).  New leads are inserted; duplicates trigger an informational toast.
- After insertion, `search_history` logs the query.
- The resulting list of businesses is shown, and all IDs are selected by default.

### Step 2 – Generate Message

- When the user clicks *Generate Message*, the selected lead is used to craft a prompt for Gemini.
- Service type mapping (e.g. "restaurant" ➜ "restaurant") is defined in `serviceMapping` at the top of `Action.js`.
- The LLM returns a short cold‑email body; this is stored in state.
- If the user prefers templates, they can skip ahead to step 3 and load campaigns instead.

### Step 3 – Choose Message / Templates

- Two modes: **useGenerated** (default) or **campaign templates**.
- When templates are displayed, the user can pick one and the message is previewed per contact.
- The `personalize()` helper substitutes placeholders such as `{Business_Name}`, `{Location}`, `{Website}`, `{Service}` using the contact data.
- The user can also manually edit each lead’s message; edits are stored in `editedMessages`.

### Step 4 – Send Emails

- Clicking *Send Emails* will iterate over all selected businesses.
- For each one:
  - The subject line is personalized using the same `personalize()` function.
  - If a template body begins with `Subject:`, that first line is extracted as the subject.
  - Front end calls `supabase.functions.invoke('send-email', {to, subject, html})`.
  - Upon success, the contact record is updated (`status: 'Contacted', email_sent: true, last_contacted_at`).
  - An entry is inserted into `outreach_logs`.
- If templates were used, the associated campaign’s `usage_count` is incremented.
- The UI resets to step 1 after completion.

### Test Mode

- Toggleable via a button in step 1.  When enabled, a fake business object with `testEmail` is created and the flow starts at step 2.  Useful for debugging the message generation/email logic without performing lookups or writes.

### Service Filtering & Deduplication

- `serviceMapping` is a large object mapping user‑entered business types to human‑friendly service descriptions used in emails.
- During the search result normalization, the code:
  - Determines whether a result is social‑media only by checking common domains.
  - Sets `needsWebsite` / `needsSaaS` heuristics based on whether a real website exists.
- The deduplication step queries existing contacts and removes any with matching name/phone/website before insertion.


## Campaigns

Manage reusable email templates used in step 3 of the Action Center.

### Create / Edit / Delete

- Campaign records are stored in the `campaigns` table.
- The UI offers a modal form; fields include name, template text, optional expiration datetime.

### Preview & Usage Tracking

- Each campaign card shows a preview of the first few lines of the template.
- A small usage counter displays how many times the template has been used (incremented when used in `/action`).
- Clicking the eye icon opens a full preview.

### Expiration

- If `expires_at` is set, the card displays the expiry date and frontend logic could filter expired templates (not currently enforced).


## Contacts

Central repository of leads.

### Filtering & Search

- Filters: pipeline status (New/Contacted/Interested/Customer/Lost), email status (sent/not sent), timeframe (today, yesterday, past), and full‑text search on name/email/phone.
- The front end builds a Supabase query with `.eq()`, `.or()`, `.gte()`, `.lt()` etc. based on selected filters.

### Status Management & Pipeline

- Clicking a contact opens a dialog to change its `status` (with optional lost reason).  The update is sent to Supabase and the list refreshed.
- Blocking a contact sets `is_blocked = true`.

### Individual Email Sending

- The card view includes a send button (`handleSendIndividualEmail`).
- Workflow similar to the bulk send: Gemini generates a very short personalized message, then `send-email` is invoked.
- Success updates the contact and adds an outreach log entry.

### Block / Unblock

- Clicking the ban icon blocks a contact (moves it to Blocklist).
- Blocklist page shows blocked contacts and allows unblocking.

### Google Sheets Sync

- Triggered by the *Sync to Sheets* button.
- Calls the `sync-contacts` Supabase function.
- The function fetches all non‑blocked contacts using a service‑role key and posts them to a Google Apps Script URL configured via `GSHEET_SYNC_URL` environment variable.
- The response indicates how many records were added/skipped.


## Blocklist

Very simple page listing all `contacts` where `is_blocked = true`.  Each card shows basic info and an *Unblock* button that sets the flag to `false`.


## Reports & Insights

Presents charts built with `recharts`.

### Lead Funnel Chart

- Counts contacts by status (New, Contacted, Interested, Customer, Lost).  The `Contacted` bucket also includes any record with `email_sent = true`.

### Campaign Performance

- Currently stubbed: it retrieves all campaigns plus the total number of outreach logs and shows them side‑by‑side.  The logs are not yet tied to campaigns, so sent/opened/clicked counts are placeholders.

### Lost Reason Analysis

- Pie chart breaking down the `lost_reason` values collected from contacts marked `Lost`.


## Dashboard

"Home" page with high‑level metrics and quick links.

### Stats & Recent Leads

- Queries contacts and outreach_logs to compute total contacts, customers, contacted, interested, and emails sent.
- Displays the five most recent leads.

### Offline Data Migration

- If the user has data stored in `localStorage` under `funnelfox_contacts` or `funnelfox_campaigns`, a yellow alert card appears.
- Clicking "Move to Supabase" takes the JSON arrays, maps them to DB columns, and upserts them using Supabase's `onConflict` feature.

### Quick Actions

- Links pointing to `/action` and `/campaigns` for fast navigation.


## Supabase Functions (Cloud Logic)

Serverless functions written in Deno under `Supabase/functions`.

### `find-businesses`

- Receives `location`, `businessType`, and optional `count` via POST JSON.
- Calls Serper Places API with the query `"${businessType} in ${location}"`.
- Returns the JSON unmodified to the frontend.  CORS headers allow cross‑origin requests.

### `send-email`

- Expects `to` (string or array), `subject`, and `html` fields.
- Sends an email via the Resend API using `RESEND_API_KEY` and `SENDER_EMAIL` env vars.
- Returns the API response.

### `sync-contacts`

- Uses a Supabase service‑role key (stored securely) to fetch all non‑blocked contacts.
- Posts them to a Google Sheets sync endpoint (`GSHEET_SYNC_URL`).
- Returns whatever the script returns.


## Supporting Utilities

- `frontend/src/lib/supabase.js` exports a pre‑configured Supabase client (not shown earlier but assumed).
- `serviceMapping` in `Action.js` converts raw business types to email‑friendly phrases.
- Helper functions like `personalize()`, `getFinalMessage()`, etc., handle template interpolation.


## Tips & Notes

- **Environment Variables:**  See `.env` conventions used in frontend and secrets in Supabase.
- **Local Storage:**  The app can run purely offline by saving contacts/campaigns locally.  Migration is manual via dashboard.
- **Rate Limits:**  Serper, Gemini and Resend may have quotas; the UI shows toasts on failures.
- **Extensibility:**  New pages follow the same pattern of fetching from Supabase, mapping snake_case columns, and reacting to state changes.


---

This file should provide a solid reference for any developer or user trying to understand FunnelFox end‑to‑end.  Adjust or extend as the codebase evolves.
