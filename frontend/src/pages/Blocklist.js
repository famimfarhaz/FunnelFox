import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Mail, Phone, MapPin, Unlock } from 'lucide-react';

const Blocklist = () => {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlocklist();
  }, []);

  const fetchBlocklist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('is_blocked', true);

      if (error) throw error;
      setBlocked(data || []);
    } catch (error) {
      console.error('Error fetching blocklist from Supabase:', error);
      toast.error('Failed to load blocklist');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (id) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_blocked: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Contact unblocked');
      fetchBlocklist();
    } catch (error) {
      toast.error('Failed to unblock contact');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Blocklist</h1>
        <p className="text-base leading-relaxed text-slate-600 mt-2">Manage blocked businesses</p>
      </div>

      {blocked.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No blocked contacts</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blocked.map((contact) => (
            <Card key={contact.id} data-testid={`blocked-card-${contact.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-lg">{contact.name}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUnblock(contact.id)}
                    data-testid={`btn-unblock-${contact.id}`}
                  >
                    <Unlock className="w-4 h-4 text-emerald-500" />
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
                  {contact.address && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-2">{contact.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blocklist;