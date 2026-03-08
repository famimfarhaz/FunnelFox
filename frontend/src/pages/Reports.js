import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '../lib/supabase';

const Reports = () => {
  const [funnelData, setFunnelData] = useState([]);
  const [campaignPerformance, setCampaignPerformance] = useState([]);
  const [lostReasons, setLostReasons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // 1. Fetch Contacts for Funnel and Lost Reasons
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('is_blocked', false);

      if (contactsError) throw contactsError;

      // 2. Fetch Campaigns and Outreach Logs for Performance
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*');

      const { data: outreachLogs, error: outreachError } = await supabase
        .from('outreach_logs')
        .select('contact_id');

      if (campaignsError) throw campaignsError;
      if (outreachError) throw outreachError;

      // --- Process Funnel Data ---
      const statuses = ["New", "Contacted", "Interested", "Customer", "Lost"];
      const funnel = statuses.map(status => ({
        status,
        count: (contacts || []).filter(c => {
          // Map DB status to display status if needed, or use directly
          return (c.status === status) ||
            (status === "Contacted" && c.email_sent);
        }).length
      }));
      setFunnelData(funnel);

      // --- Process Campaign Performance ---
      // We'll count unique contact_ids in outreach_logs for each campaign if possible,
      // but outreach_logs doesn't currently store campaign_id. 
      // For now, we'll show global sent count or map to campaigns if added later.
      const performance = (campaigns || []).map(c => ({
        campaignId: c.id,
        name: c.name,
        sent: outreachLogs?.length || 0, // Placeholder until campaign-specific logs exist
        opened: 0,
        clicked: 0,
        openRate: 0,
        clickRate: 0
      }));
      setCampaignPerformance(performance);

      // --- Process Lost Reasons ---
      const lostContacts = (contacts || []).filter(c => c.status === 'Lost');
      const reasonCounts = {};
      lostContacts.forEach(lc => {
        const r = lc.lost_reason || 'Not specified';
        reasonCounts[r] = (reasonCounts[r] || 0) + 1;
      });
      const reasons = Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count }));
      setLostReasons(reasons);

    } catch (error) {
      console.error('Error fetching reports from Supabase:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (loading) {
    return <div className="text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Reports & Insights</h1>
        <p className="text-base leading-relaxed text-slate-600 mt-2">Analyze your lead generation performance</p>
      </div>

      {/* Lead Funnel */}
      <Card data-testid="card-funnel-report">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Lead Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem'
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      <Card data-testid="card-campaign-performance">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignPerformance.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No campaign data available yet</p>
          ) : (
            <div className="space-y-4">
              {campaignPerformance.map((campaign) => (
                <div key={campaign.campaignId} className="p-4 border border-slate-200 rounded-lg" data-testid={`campaign-performance-${campaign.campaignId}`}>
                  <h4 className="font-semibold text-slate-900 mb-3">{campaign.name}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Sent</p>
                      <p className="text-xl font-bold text-slate-900">{campaign.sent}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Opened</p>
                      <p className="text-xl font-bold text-slate-900">{campaign.opened}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Clicked</p>
                      <p className="text-xl font-bold text-slate-900">{campaign.clicked}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Open Rate</p>
                      <p className="text-xl font-bold text-indigo-600">{campaign.openRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Click Rate</p>
                      <p className="text-xl font-bold text-emerald-600">{campaign.clickRate}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lost Reasons */}
      <Card data-testid="card-lost-reasons">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Lost Reason Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {lostReasons.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No lost reason data available yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={lostReasons}
                  dataKey="count"
                  nameKey="reason"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.reason}: ${entry.count}`}
                >
                  {lostReasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;