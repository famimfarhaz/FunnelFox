import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Calendar, Send, Eye } from 'lucide-react';
import { Badge } from '../components/ui/badge';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState('');
  const [template, setTemplate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [editId, setEditId] = useState(null);
  const [previewCampaign, setPreviewCampaign] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedData = (data || []).map(c => ({
        ...c,
        usageCount: c.usage_count,
        expiresAt: c.expires_at,
        createdAt: c.created_at
      }));

      setCampaigns(mappedData);
    } catch (error) {
      console.error('Error fetching campaigns from Supabase:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !template) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editId) {
        // Update existing
        const { error } = await supabase
          .from('campaigns')
          .update({
            name,
            template,
            expires_at: expiresAt || null
          })
          .eq('id', editId);
        if (error) throw error;
        toast.success('Campaign updated successfully!');
      } else {
        // Create new
        const { error } = await supabase
          .from('campaigns')
          .insert({
            name,
            template,
            expires_at: expiresAt || null
          });
        if (error) throw error;
        toast.success('Campaign created successfully!');
      }

      setOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      toast.error(editId ? 'Failed to update campaign' : 'Failed to create campaign');
      console.error(error);
    }
  };

  const resetForm = () => {
    setName('');
    setTemplate('');
    setExpiresAt('');
    setEditId(null);
  };

  const handleEdit = (campaign) => {
    setName(campaign.name);
    setTemplate(campaign.template);
    setExpiresAt(campaign.expiresAt ? new Date(campaign.expiresAt).toISOString().slice(0, 16) : '');
    setEditId(campaign.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to delete campaign');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Campaigns</h1>
          <p className="text-base leading-relaxed text-slate-600 mt-2">Manage your email campaigns</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="btn-create-campaign">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-campaign">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Spring Website Offer"
                  data-testid="input-campaign-name"
                />
              </div>
              <div>
                <Label htmlFor="template">Email Template</Label>
                <Textarea
                  id="template"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={8}
                  placeholder="Write your email template here..."
                  data-testid="textarea-campaign-template"
                />
              </div>
              <div>
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  data-testid="input-campaign-expires"
                />
              </div>

              <Button onClick={handleSave} className="w-full" data-testid="btn-save-campaign">
                {editId ? 'Update Campaign' : 'Create Campaign'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No campaigns yet. Create your first campaign to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              data-testid={`campaign-card-${campaign.id}`}
              className="group border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {campaign.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span className="text-[11px] font-medium uppercase tracking-wider">
                        {new Date(campaign.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-slate-50 hover:text-indigo-600"
                      onClick={() => {
                        setPreviewCampaign(campaign);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-indigo-50 hover:text-indigo-600"
                      onClick={() => handleEdit(campaign)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(campaign.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between space-y-4">
                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100/50">
                  <p className="text-sm text-slate-600 whitespace-pre-line line-clamp-3 leading-relaxed italic">
                    "{campaign.template}"
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100/80">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Send className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Usage</p>
                      <p className="text-sm font-bold text-slate-700">{campaign.usageCount || 0}</p>
                    </div>
                  </div>
                  {campaign.expiresAt && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50/30 text-amber-600 border-amber-200/50 font-bold px-2 py-0.5">
                      EXPIRES: {new Date(campaign.expiresAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-500" />
              Campaign Preview: {previewCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {previewCampaign?.template}
            </p>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Campaigns;