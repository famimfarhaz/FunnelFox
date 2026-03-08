# ☁️ FunnelFox Cloud Management Guide

This guide is designed for **you** to manage your project with **zero technical knowledge**. 

Since we moved everything to the cloud, you no longer need the Python backend. You only need to know how to swap your API keys when you hit your free limits on Serper or Resend.

---

### 🗝️ How to Swap API Keys (When Limits are Reached)

If you hit your limit and get a new API key from **Serper** or **Resend**, you can update it directly on the Supabase website:

Final Step: Set Your Secrets
Run these three commands in your terminal one by one. Replace the text after the = with your actual keys (you can copy them from your .env file):

For Lead Discovery:

npx supabase secrets set SERPER_API_KEY=cbdfc87fa264d53bfbc85afdd353a970a3278147

For Email Sending:

npx supabase secrets set RESEND_API_KEY=re_doVsmp3E_5vVth8vrbUJrJFASXbQUrmaP

For your "From" address:

npx supabase secrets set SENDER_EMAIL=onboarding@resend.dev

1.  **Open your Supabase Dashboard**: Go to [supabase.com](https://supabase.com/dashboard).
2.  **Select your project**: Click on "FunnelFox".
3.  **Go to Settings**:
    - Click the **Gear icon (Settings)** at the bottom of the left sidebar.
    - Click on **API** in the sub-menu.
4.  **Find "Edge Function Secrets"**: Scroll down to the **Edge Function Secrets** section.
5.  **Update the Key**:
    - Find `SERPER_API_KEY` or `RESEND_API_KEY`.
    - Click **Edit** or delete the old one and click **Add New Secret**.
    - Enter the **Name** (must be exactly `SERPER_API_KEY` or `RESEND_API_KEY`) and paste your **New Key**.
6.  **Done!** The cloud will immediately use the new key.

---

### 🚀 How to Deploy Your Cloud Functions (First Time Setup)

Since global installation is tricky on Windows, we will use **`npx`**. This runs the tool without needing to install it permanently.

#### 1. Log In to Supabase
Run this in your terminal:
```bash
npx supabase login
```
*A browser window will pop up. Just click "Authorize".*

#### 2. Link Your Project
Go to your Supabase project URL and copy the "Project Ref" (the random letters/numbers at the end of the URL).
```bash
npx supabase link --project-ref YOUR_PROJECT_REF_HERE
```

#### 3. Upload the Functions
```bash
npx supabase functions deploy find-businesses
npx supabase functions deploy send-email
```

---

### 🛠️ Daily Use: How to Start Your App
1. Open your terminal in the `frontend` folder.
2. Type: `npm start`
3. That's it! Lead discovery and emailing now happen independently in the cloud.

---

### 💡 Pro Tips
- **Limits**: Serper's free plan gives you 2,500 searches. Resend's free plan gives you 3,000 emails per month (100 per day).
- **Restarting**: If you change your `.env` file, you must stop the terminal (Ctrl+C) and run `npm start` again.
