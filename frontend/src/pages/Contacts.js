import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Search, Mail, Phone, Globe, MapPin, Star, Ban, ExternalLink, CheckCircle2, Send, Zap, Share2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('is_blocked', false);

      // Status Filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Email Status Filter
      if (emailStatusFilter !== 'all') {
        if (emailStatusFilter === 'sent') {
          query = query.or('status.eq.Contacted,email_sent.eq.true');
        } else {
          query = query.not('status', 'eq', 'Contacted').eq('email_sent', false);
        }
      }

      // Date Filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();

        if (dateFilter === 'today') {
          query = query.gte('collected_at', today);
        } else if (dateFilter === 'yesterday') {
          query = query.gte('collected_at', yesterday).lt('collected_at', today);
        } else if (dateFilter === 'past') {
          query = query.lt('collected_at', yesterday);
        }
      }

      // Search (Name, Email, Phone)
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query.order('collected_at', { ascending: false });

      if (error) throw error;

      // Map snake_case from DB to camelCase for UI
      const mappedData = (data || []).map(c => ({
        ...c,
        realWebsite: c.real_website,
        isSocialOnly: c.is_social_only,
        needsWebsite: c.needs_website,
        needsSaaS: c.needs_saas,
        collectedAt: c.collected_at,
        emailSent: c.email_sent,
        lastContactedAt: c.last_contacted_at,
        lostReason: c.lost_reason
      }));

      setContacts(mappedData);
    } catch (error) {
      console.error('Error fetching contacts from Supabase:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter, emailStatusFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts, statusFilter, dateFilter, emailStatusFilter]);

  const handleSearch = () => {
    fetchContacts();
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          status: newStatus,
          lost_reason: newStatus === 'Lost' ? lostReason : (selectedContact.lostReason || null)
        })
        .eq('id', selectedContact.id);

      if (error) throw error;

      toast.success('Status updated successfully!');
      setSelectedContact(null);
      setNewStatus('');
      setLostReason('');
      fetchContacts();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const handleBlock = async (contactId) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_blocked: true })
        .eq('id', contactId);

      if (error) throw error;
      toast.success('Contact blocked');
      fetchContacts();
    } catch (error) {
      toast.error('Failed to block contact');
      console.error(error);
    }
  };

  const handleSendIndividualEmail = async (contact) => {
    if (!contact?.email) {
      toast.error('No email address for this contact');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate Message with Gemini
      const service_type = contact.needsWebsite === 'YES' ? "professional website development" : "SaaS development";

      const genResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `You are a professional email copywriter for a web & SaaS development agency.
Write a very short, personalized cold email (max 100 words) to ${contact.name} offering our ${service_type} services. Personalize it based on their profile (Rating: ${contact.rating}, Reviews: ${contact.reviews}). Do not include subject line, just body.`
            }]
          }]
        }
      );

      const message = genResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "Hello, I noticed your business and would love to help you with your digital presence.";

      // 2. Send via Cloud Function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: [contact.email],
          subject: `Partnership Opportunity for ${contact.name}`,
          html: message
        }
      });

      if (emailError) throw emailError;

      // 3. Update Status and Log in Supabase
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ status: 'Contacted', email_sent: true, last_contacted_at: new Date().toISOString() })
        .eq('id', contact.id);

      if (updateError) throw updateError;

      await supabase.from('outreach_logs').insert({
        contact_id: contact.id,
        subject: `Partnership Opportunity for ${contact.name}`,
        message: message,
        status: 'Sent'
      });

      toast.success('Email sent successfully!');
      setSelectedContact(null);
      fetchContacts();
    } catch (error) {
      toast.error('Failed to send email');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToSheets = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-contacts');

      if (error) throw error;

      if (data.status === 'success') {
        toast.success(`Sync complete! Added: ${data.added}, Skipped: ${data.skipped}`);
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync with Google Sheets');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-700';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700';
      case 'Interested': return 'bg-purple-100 text-purple-700';
      case 'Customer': return 'bg-emerald-100 text-emerald-700';
      case 'Lost': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return <div className="text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Contacts</h1>
          <p className="text-base leading-relaxed text-slate-600 mt-2">Manage your business contacts</p>
        </div>
        <Button
          onClick={handleSyncToSheets}
          disabled={syncing}
          variant="outline"
          className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <Share2 className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync to Sheets'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
              data-testid="input-search-contacts"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pipeline</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Interested">Interested</SelectItem>
              <SelectItem value="Customer">Customer</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-email-filter">
              <SelectValue placeholder="Email Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Email</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="not_sent">Not Sent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-date-filter">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="past">Past Leads</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} data-testid="btn-search" className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700">
            Search
          </Button>
        </div>
      </div>

      {/* Contacts Grid */}
      {contacts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No contacts found. Use the Action menu to find businesses.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="contact-card"
              onClick={() => setSelectedContact(contact)}
              data-testid={`contact-card-${contact.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg">{contact.name}</h3>
                  <Badge className={`mt-2 ${getStatusColor(contact.status)}`}>
                    {contact.status}
                  </Badge>
                  {(contact.status === 'Contacted' || contact.emailSent) ? (
                    <Badge variant="outline" className="mt-2 ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Email Sent
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-2 ml-2 bg-slate-50 text-slate-400 border-slate-100 italic">
                      No Email Yet
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBlock(contact.id);
                  }}
                  data-testid={`btn-block-${contact.id}`}
                >
                  <Ban className="w-4 h-4 text-slate-400 hover:text-red-500" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.website && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe className="w-4 h-4" />
                    <span className="truncate">{contact.website}</span>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-2">{contact.address}</span>
                  </div>
                )}
                {contact.rating && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{contact.rating} ({contact.reviews} reviews)</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {contact.needsWebsite === 'YES' ? 'Needs Website' : 'Has Website'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {contact.needsSaaS === 'YES' ? 'Needs SaaS' : 'No SaaS'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Detail Dialog */}
      {selectedContact && (
        <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
          <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6" data-testid="dialog-contact-detail">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                {selectedContact.name}
                <Badge className={getStatusColor(selectedContact.status)}>
                  {selectedContact.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 mt-4">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Information</h4>
                  <div className="space-y-3">
                    {selectedContact.address && (
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                        <p className="text-sm">{selectedContact.address}</p>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        <p className="text-sm">{selectedContact.phone}</p>
                      </div>
                    )}
                    {selectedContact.website && (
                      <div className="pt-2">
                        <a
                          href={selectedContact.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          <span className="text-sm truncate font-medium">{selectedContact.website}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {selectedContact.rating && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Social Proof</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-lg font-bold text-slate-900">{selectedContact.rating}</span>
                      </div>
                      <span className="text-sm text-slate-500">based on {selectedContact.reviews} reviews</span>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categorization</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={selectedContact.needsWebsite === 'YES' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                      {selectedContact.needsWebsite === 'YES' ? 'Needs Website' : 'Website Lead'}
                    </Badge>
                    <Badge variant="secondary" className={selectedContact.needsSaaS === 'YES' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}>
                      {selectedContact.needsSaaS === 'YES' ? 'Needs SaaS' : 'SaaS Active'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Manage Lead Status
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newStatus" className="text-xs text-slate-500 ml-1">Update Pipeline Stage</Label>
                      <Select value={newStatus || selectedContact.status} onValueChange={setNewStatus}>
                        <SelectTrigger className="bg-white border-slate-200" data-testid="select-new-status">
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="New">New Lead</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Interested">Interested</SelectItem>
                          <SelectItem value="Customer">Converted Customer</SelectItem>
                          <SelectItem value="Lost">Closed (Lost)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newStatus === 'Lost' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label htmlFor="lostReason" className="text-xs text-slate-500 ml-1">Reason for Loss</Label>
                        <Input
                          id="lostReason"
                          value={lostReason}
                          onChange={(e) => setLostReason(e.target.value)}
                          placeholder="e.g., Budget, Competition..."
                          className="bg-white border-slate-200"
                          data-testid="input-lost-reason"
                        />
                      </div>
                    )}

                    <Button
                      onClick={handleUpdateStatus}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-[0.98]"
                      data-testid="btn-update-status"
                      disabled={newStatus === selectedContact.status || !newStatus}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] text-slate-400 italic">
                    Lead collected on {new Date(selectedContact.collectedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {!(selectedContact.status === 'Contacted' || selectedContact.emailSent) && (
              <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-indigo-100 shadow-sm">
                    <Zap className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Direct AI Outreach</h5>
                    <p className="text-xs text-slate-500">Generate a personalized message and send instantly.</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleSendIndividualEmail(selectedContact)}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send Email Now'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Contacts;