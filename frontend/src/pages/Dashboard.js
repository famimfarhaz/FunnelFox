import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Users, Target, Mail, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const [recentLeads, setRecentLeads] = useState([]);
  const [hasLocalData, setHasLocalData] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    fetchStats();
    checkLocalData();
  }, []);

  const checkLocalData = () => {
    const contacts = JSON.parse(localStorage.getItem('funnelfox_contacts') || '[]');
    const campaigns = JSON.parse(localStorage.getItem('funnelfox_campaigns') || '[]');
    setHasLocalData(contacts.length > 0 || campaigns.length > 0);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats from Supabase
      const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('status')
        .eq('is_blocked', false);

      if (contactError) throw contactError;

      const { count: emailsSent, error: emailError } = await supabase
        .from('outreach_logs')
        .select('*', { count: 'exact', head: true });

      if (emailError) throw emailError;

      const newStats = {
        totalContacts: contacts.length,
        customers: contacts.filter(c => c.status === 'Customer').length,
        contacted: contacts.filter(c => c.status === 'Contacted').length,
        interested: contacts.filter(c => c.status === 'Interested').length,
        emailsSent: emailsSent || 0
      };

      setStats(newStats);

      // 2. Fetch Recent Leads
      const { data: recent, error: recentError } = await supabase
        .from('contacts')
        .select('*')
        .order('collected_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;
      setRecentLeads(recent || []);

    } catch (error) {
      console.error('Error fetching stats from Supabase:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateData = async () => {
    setMigrating(true);
    try {
      const localContacts = JSON.parse(localStorage.getItem('funnelfox_contacts') || '[]');
      const localCampaigns = JSON.parse(localStorage.getItem('funnelfox_campaigns') || '[]');

      if (localContacts.length > 0) {
        const contactsToInsert = localContacts.map(c => ({
          name: c.name,
          address: c.address,
          phone: c.phone,
          email: c.email,
          website: c.website,
          real_website: c.realWebsite || c.website,
          is_social_only: c.isSocialOnly || false,
          location: c.location,
          business_type: c.businessType,
          rating: c.rating,
          reviews: c.reviews,
          needs_website: c.needsWebsite || 'NO',
          needs_saas: c.needsSaaS || 'NO',
          status: c.status || 'New',
          lost_reason: c.lostReason,
          is_blocked: c.isBlocked || false,
          email_sent: c.emailSent || false,
          collected_at: c.collectedAt || new Date().toISOString()
        }));

        const { error } = await supabase.from('contacts').upsert(contactsToInsert, { onConflict: 'name, website' });
        if (error) console.error('Error migrating contacts:', error);
      }

      if (localCampaigns.length > 0) {
        const campaignsToInsert = localCampaigns.map(c => ({
          name: c.name,
          template: c.template,
          usage_count: c.usageCount || 0,
          expires_at: c.expiresAt,
          created_at: c.createdAt || new Date().toISOString()
        }));

        const { error } = await supabase.from('campaigns').upsert(campaignsToInsert, { onConflict: 'name' });
        if (error) console.error('Error migrating campaigns:', error);
      }

      // Optional: Clear local storage after successful migration
      // localStorage.removeItem('funnelfox_contacts');
      // localStorage.removeItem('funnelfox_campaigns');

      toast.success('Data migrated successfully to Supabase!');
      setHasLocalData(false);
      fetchStats();
    } catch (error) {
      toast.error('Migration failed');
      console.error(error);
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return <div className="text-slate-600">Loading...</div>;
  }

  const statCards = [
    { title: 'Total Contacts', value: stats?.totalContacts || 0, icon: Users, color: 'text-indigo-500' },
    { title: 'Customers', value: stats?.customers || 0, icon: Target, color: 'text-emerald-500' },
    { title: 'Contacted', value: stats?.contacted || 0, icon: Mail, color: 'text-blue-500' },
    { title: 'Emails Sent', value: stats?.emailsSent || 0, icon: TrendingUp, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-base leading-relaxed text-slate-600 mt-2">Overview of your lead generation performance</p>
      </div>

      {hasLocalData && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900">Found Offline Data</h3>
                <p className="text-sm text-amber-700">You have contacts or campaigns saved in your browser. Move them to your cloud database.</p>
              </div>
            </div>
            <Button
              onClick={handleMigrateData}
              disabled={migrating}
              className="bg-amber-600 hover:bg-amber-700 text-white min-w-[200px]"
            >
              {migrating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                'Move to Supabase'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="stat-card" data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tracking-tight text-slate-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Stats Chart/Funnel Placeholder would go here */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Recent Discoveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeads.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.location}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {contact.status}
                  </Badge>
                </div>
              ))}
              {recentLeads.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No recent activity found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href="/action"
              className="block p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group"
              data-testid="quick-action-find-businesses"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Find New Businesses</h3>
              <p className="text-sm text-slate-600 mt-1">Search for potential leads using Serper API</p>
            </a>
            <a
              href="/campaigns"
              className="block p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group"
              data-testid="quick-action-campaigns"
            >
              <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Manage Campaigns</h3>
              <p className="text-sm text-slate-600 mt-1">Create and track email campaigns</p>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;