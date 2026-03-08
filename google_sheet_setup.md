# Full Setup Guide: Google Sheets CRM Sync

This guide will walk you through setting up the Google Sheets integration from scratch.

## Step 1: Create & Configure Google Sheet

1.  **Create a New Sheet**: Go to [sheets.new](https://sheets.new).
2.  **Open Apps Script**: Click on **Extensions** -> **Apps Script**.
3.  **Paste the Code**: Delete any code inside `Code.gs` and paste the content from [google_apps_script.md](file:///C:/Users/mdfar/.gemini/antigravity/brain/b206175d-0264-4b08-bb93-7acc04ea5b94/google_apps_script.md).
4.  **Deploy**:
    *   Click **Deploy** (top right) -> **New deployment**.
    *   **Select type**: Web App.
    *   **Description**: "FunnelFox CRM Sync".
    *   **Execute as**: Me.
    *   **Who has access**: Anyone.
    *   Click **Deploy**.
5.  **Copy URL**: Copy the **Web App URL** provided at the end. You will need this for the next step.

---

## Step 2: Configure Supabase Secrets

Supabase Edge Functions need to know where to send the data. You must set the `GSHEET_SYNC_URL` secret.

### Method A: Via Command Line (Recommended)
Open your terminal in the project root and run:
```bash
npx supabase secrets set GSHEET_SYNC_URL="YOUR_COPIED_URL_HERE"
```
*Note: Using `npx` ensures the command works even if you haven't installed Supabase globally.*

### Method B: Via Supabase Dashboard
1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard/projects).
2.  Select your project.
3.  Go to **Settings** (gear icon) -> **Edge Functions**.
4.  Click **Add New Secret**.
5.  **Name**: `GSHEET_SYNC_URL`
6.  **Value**: Paste your Google Web App URL.

---

## Step 3: Deploy the Edge Function

You need to push the code I wrote to your Supabase cloud project.

Run this command in your terminal:
```bash
npx supabase functions deploy sync-contacts
```

*Note: If you haven't logged in to Supabase CLI yet, run `npx supabase login` first.*

---

## Step 4: Verify Environment Variables

Your [.env](file:///D:/Under%20Development%20Projects/FunnelFox/frontend/.env) file in the `frontend` folder is already set up with your project keys. However, for **Edge Functions**, the following are automatically managed by Supabase:
*   `SUPABASE_URL`
*   `SUPABASE_SERVICE_ROLE_KEY` (Used for admin access to fetch contacts)

> [!IMPORTANT]
> Never share your `SUPABASE_SERVICE_ROLE_KEY` publicly or commit it to GitHub. It has full bypass access to your database.

---

## Step 5: Test the Sync

1.  Open your FunnelFox app.
2.  Go to the **Contacts** page.
3.  Click the **Sync to Sheets** button in the top right.
4.  Wait for the success message: "Sync complete! Added: X, Skipped: Y".
5.  Check your Google Sheet!

## Troubleshooting
*   **"Sync failed" error**: Make sure you set the `GSHEET_SYNC_URL` correctly in Supabase Secrets.
*   **Nothing appears in Sheet**: Check the **Executions** tab in Google Apps Script to see if there were any errors in the script.
*   **Access Denied**: Ensure "Who has access" was set to "Anyone" when deploying the Google Web App.
