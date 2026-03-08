import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, Circle, ExternalLink, Phone, MapPin, Star, Globe, Info, Target, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';

const SERPER_API_KEY = process.env.REACT_APP_SERPER_API_KEY;
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const RESEND_API_KEY = process.env.REACT_APP_RESEND_API_KEY;
const SENDER_EMAIL = process.env.REACT_APP_SENDER_EMAIL;

const serviceMapping = {
  // Food & Hospitality
  'restaurant': 'restaurant',
  'cafe': 'café',
  'bakery': 'bakery',
  'food truck': 'food truck',
  'catering': 'catering service',
  'bar': 'bar',
  'hotel': 'accommodation',
  'guesthouse': 'accommodation',

  // Health & Wellness
  'gym': 'gym & fitness classes',
  'fitness studio': 'gym & fitness classes',
  'yoga studio': 'yoga & pilates classes',
  'pilates studio': 'yoga & pilates classes',
  'personal trainer': 'personal training',
  'physiotherapy': 'physiotherapy',
  'massage': 'massage & spa treatments',
  'spa': 'massage & spa treatments',
  'nutritionist': 'nutrition consulting',

  // Home Services
  'plumber': 'plumbing services',
  'electrician': 'electrical services',
  'cleaning service': 'cleaning services',
  'interior designer': 'interior design',
  'landscaping': 'landscaping & gardening',
  'moving company': 'moving & relocation',
  'hvac': 'AC & heating repair',
  'ac repair': 'AC & heating repair',

  // Real Estate & Legal
  'real estate agency': 'real estate',
  'property management': 'property management',
  'law firm': 'legal services',
  'accountant': 'accounting & tax services',
  'mortgage broker': 'mortgage & loans',

  // Beauty & Personal Care
  'hair salon': 'hair styling & cuts',
  'barbershop': 'haircuts & grooming',
  'nail salon': 'nail care',
  'tattoo studio': 'tattoo & piercing',
  'makeup artist': 'makeup & beauty',
  'skincare clinic': 'skincare treatments',

  // Education & Coaching
  'tutoring center': 'tutoring & academic support',
  'driving school': 'driving lessons',
  'language school': 'language courses',
  'life coach': 'coaching & consulting',
  'business coach': 'coaching & consulting',
  'daycare': 'childcare',
  'nursery': 'childcare',

  // Automotive
  'auto repair': 'car repair & maintenance',
  'car wash': 'car wash & detailing',
  'tire shop': 'tire fitting & repair',
  'car rental': 'car rental',

  // Medical & Healthcare
  'dental clinic': 'dental care',
  'optician': 'eye care & optometry',
  'veterinary clinic': 'veterinary care',
  'private doctor': 'medical consultations',
  'pharmacy': 'pharmacy & medications',

  // Creative & Events
  'photographer': 'photography & videography',
  'event planner': 'event planning',
  'wedding venue': 'wedding services',
  'print shop': 'printing & design',
  'recording studio': 'music recording',

  // Retail & Local Shops
  'boutique': 'clothing & fashion',
  'florist': 'flowers & arrangements',
  'bookshop': 'books & stationery',
  'electronics repair': 'electronics repair',
  'gift shop': 'gifts & souvenirs'
};

const Action = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Business Finding
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [count, setCount] = useState(10);
  const [foundBusinesses, setFoundBusinesses] = useState([]);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState([]);
  const [isTestMode, setIsTestMode] = useState(false);
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Step 2 & 3: Message
  const [useGenerated, setUseGenerated] = useState(true);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null); // 'website' | 'saas' | null
  const [previewLeadIdx, setPreviewLeadIdx] = useState(0);
  const [editedMessages, setEditedMessages] = useState({});

  useEffect(() => {
    // Reset edited messages when template or generated message changes
    setEditedMessages({});
  }, [selectedTemplate, generatedMessage]);

  const personalize = (template, business) => {
    if (!template || !business) return template;

    const serviceName = business.businessType ?
      (serviceMapping[business.businessType.toLowerCase()] || business.businessType.toLowerCase()) :
      "your services";

    return template
      .replace(/{Business_Name}/g, business.name || "your business")
      .replace(/\[Company Name\]/g, business.name || "your business")
      .replace(/{Location}/g, business.location || business.address || "your area")
      .replace(/{Website}/g, business.website || "your website")
      .replace(/{Phone}/g, business.phone || "your phone number")
      .replace(/{Service}/g, serviceName);
  };

  const getFinalMessage = (template, business) => {
    if (business && editedMessages[business.id]) {
      return editedMessages[business.id];
    }
    let body = personalize(template, business);
    if (body && body.toLowerCase().startsWith('subject:')) {
      const lines = body.split('\n');
      body = lines.slice(1).join('\n').trim();
    }
    return body;
  };

  const handleEditMessage = (businessId, newContent) => {
    setEditedMessages(prev => ({
      ...prev,
      [businessId]: newContent
    }));
  };

  const handleStartTestMode = () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid test email address');
      return;
    }

    const mockBusiness = {
      id: `test-${Date.now()}`,
      name: "Test Business Name",
      address: "Test Location, City",
      location: "Test Location, City",
      website: "https://example.com",
      phone: "+1 234 567 8900",
      email: testEmail,
      rating: 4.5,
      reviews: 120,
      needsWebsite: 'YES',
      realWebsite: true,
      businessType: 'restaurant' // Default for testing mapping
    };

    setFoundBusinesses([mockBusiness]);
    setSelectedBusinessIds([mockBusiness.id]);
    setStep(2);
    toast.success('Test mode active! Proceeding with mock lead.');
  };



  const handleFindBusinesses = async () => {
    if (!location || !businessType) {
      toast.error('Please enter location and business type');
      return;
    }

    setLoading(true);
    try {
      // 1. Find via Cloud Function
      const { data: cloudResults, error: cloudError } = await supabase.functions.invoke('find-businesses', {
        body: { location, businessType, count: parseInt(count) }
      });

      if (cloudError) throw cloudError;

      const places = cloudResults.places?.slice(0, parseInt(count)) || [];
      const socialDomains = ['facebook.com', 'instagram.com', 'youtube.com', 'linkedin.com', 'twitter.com', 'x.com', 'pinterest.com', 'tiktok.com'];

      const mappedBusinesses = places.map(place => {
        const website = place.website || "";
        const isSocial = socialDomains.some(domain => website.toLowerCase().includes(domain));
        const effectiveWebsite = isSocial ? "" : website;
        const hasRealWebsite = !!effectiveWebsite;

        return {
          id: crypto.randomUUID(),
          name: place.title || "",
          address: place.address || "",
          phone: place.phoneNumber || "",
          email: place.email || "", // Added email from Serper
          website: website, // Keep the original for the link
          realWebsite: effectiveWebsite, // Filtered version
          isSocialOnly: isSocial,
          location: location,
          businessType: businessType,
          rating: place.rating,
          reviews: place.reviews,
          needsWebsite: hasRealWebsite ? "NO" : "YES",
          needsSaaS: hasRealWebsite ? "YES" : "NO",
          status: "New",
          collectedAt: new Date().toISOString()
        };
      });

      // 1. Check for duplicates in Supabase
      const { data: existingContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('name, website, phone');

      if (fetchError) throw fetchError;

      const uniqueMappedBusinesses = [];
      const duplicates = [];

      mappedBusinesses.forEach(business => {
        // If "Only Email" mode is enabled, skip businesses without emails
        if (onlyEmail && !business.email) {
          return;
        }

        const isDuplicate = (existingContacts || []).some(contact => {
          const nameMatch = contact.name.toLowerCase() === business.name.toLowerCase();
          const phoneMatch = business.phone && contact.phone === business.phone;
          const websiteMatch = business.website && contact.website === business.website;
          return nameMatch || phoneMatch || websiteMatch;
        });

        if (isDuplicate) {
          duplicates.push(business);
        } else {
          uniqueMappedBusinesses.push(business);
        }
      });

      if (uniqueMappedBusinesses.length === 0 && places.length > 0) {
        const message = onlyEmail
          ? 'No new businesses with email addresses found in your database.'
          : 'All businesses found are already in your database.';
        toast.info(message);
        setFoundBusinesses([]);
        setLoading(false);
        return;
      }

      // 2. Save only unique businesses to Supabase
      const businessesToInsert = uniqueMappedBusinesses.map(b => ({
        name: b.name,
        address: b.address,
        phone: b.phone,
        email: b.email, // Added email
        website: b.website,
        real_website: b.realWebsite,
        is_social_only: b.isSocialOnly,
        location: b.location,
        business_type: b.businessType,
        rating: b.rating,
        reviews: b.reviews,
        needs_website: b.needsWebsite,
        needs_saas: b.needsSaaS,
        status: b.status,
        collected_at: b.collectedAt
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('contacts')
        .insert(businessesToInsert)
        .select();

      if (insertError) throw insertError;

      // 3. Log search history
      await supabase.from('search_history').insert({
        location,
        business_type: businessType,
        count_requested: parseInt(count),
        leads_found: uniqueMappedBusinesses.length,
        only_email_mode: onlyEmail
      });

      // Use the IDs returned by Supabase (with safety check for dummy/failed inserts)
      const finalBusinesses = uniqueMappedBusinesses.map((b, idx) => ({
        ...b,
        id: (insertedData && insertedData[idx]) ? insertedData[idx].id : b.id
      }));

      setFoundBusinesses(finalBusinesses);
      setSelectedBusinessIds(finalBusinesses.map(b => b.id));
      setSelectedCategory(null);

      if (duplicates.length > 0) {
        toast.success(`Found ${uniqueMappedBusinesses.length} new leads. (${duplicates.length} duplicates filtered)`);
      } else {
        toast.success(`Found ${uniqueMappedBusinesses.length} new businesses!`);
      }
    } catch (error) {
      toast.error('Failed to find businesses via proxy');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (foundBusinesses.length === 0) {
      toast.error('Please find businesses first');
      return;
    }
    setSelectedCategory(null);
    setStep(2);
  };

  const handleGenerateMessage = async () => {
    if (selectedBusinessIds.length === 0) {
      toast.error('No businesses selected');
      return;
    }

    setLoading(true);
    try {
      const business = foundBusinesses.find(b => b.id === selectedBusinessIds[0]);
      const service_type = business.website ? "SaaS development" : "professional website development";

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `Write a very short cold email (max 100 words) to ${business.name} about ${service_type}.

Rules:
- Write like a real person, NOT a marketer. Casual, friendly tone.
- No buzzwords like "transform", "solutions", "leverage", "unlock", "boost".
- No exclamation marks.
- Start with something specific about their business.
- End with a simple yes/no question.
- Sign off as "Famim Farhaz".
- Do not include subject line, just the email body.
- Do not use any HTML formatting, write in plain text only.`
            }]
          }]
        }
      );

      const message = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate message content.";
      setGeneratedMessage(message);
      toast.success('Message generated successfully!');
      setStep(3);
    } catch (error) {
      toast.error('Failed to generate message');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipToTemplates = async () => {
    try {
      const { data: localCampaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(localCampaigns || []);
      setUseGenerated(false);
      setStep(3);
    } catch (error) {
      toast.error('Failed to load campaigns');
      console.error(error);
    }
  };

  const handleSendEmails = async () => {
    const message = useGenerated ? generatedMessage : (selectedTemplate || campaigns[0]?.template || '');

    if (!message) {
      toast.error('Please select or generate a message');
      return;
    }

    setLoading(true);
    try {
      const businessesToSend = foundBusinesses.filter(b => selectedBusinessIds.includes(b.id));
      const campaignSubject = `Quick question about {Business_Name}`;

      // 5. Send individually to support personalization
      let sentCount = 0;
      let failedCount = 0;

      for (const business of businessesToSend) {
        let finalSubject = personalize(campaignSubject, business);
        let finalBody = getFinalMessage(message, business);

        // Extract subject if present in template
        if (finalBody.toLowerCase().startsWith('subject:')) {
          const lines = finalBody.split('\n');
          const firstLine = lines[0];
          finalSubject = personalize(firstLine.replace(/subject:\s*/i, '').trim(), business);
          finalBody = lines.slice(1).join('\n').trim();
        }

        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: business.email || 'placeholder@example.com',
            subject: finalSubject,
            text: finalBody
          }
        });

        if (emailError || emailData?.error || emailData?.statusCode >= 400) {
          console.error(`Failed to send email to ${business.name}:`, emailError || emailData?.error || emailData);
          failedCount++;
        } else {
          sentCount++;
        }
      }

      // Skip Supabase updates for test mode (non-UUID IDs)
      if (!isTestMode) {
        // 1. Update Lead Status in Supabase
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ status: 'Contacted', email_sent: true, last_contacted_at: new Date().toISOString() })
          .in('id', selectedBusinessIds);

        if (updateError) throw updateError;

        // 2. Log Outreach Entry
        const outreachEntries = businessesToSend.map(b => ({
          contact_id: b.id,
        subject: `Quick question about ${b.name}`,
          message: message,
          status: 'Sent'
        }));

        await supabase.from('outreach_logs').insert(outreachEntries);
      }

      // 3. Update UI state
      const updatedFound = foundBusinesses.map(b => {
        if (selectedBusinessIds.includes(b.id)) {
          return { ...b, status: 'Contacted', emailSent: true };
        }
        return b;
      });
      setFoundBusinesses(updatedFound);

      // 4. Update Campaign usage if template was used
      if (!useGenerated && selectedTemplate) {
        const campaign = campaigns.find(c => c.template === selectedTemplate);
        if (campaign) {
          await supabase
            .from('campaigns')
            .update({ usage_count: (campaign.usage_count || 0) + sentCount })
            .eq('id', campaign.id);
        }
      }

      toast.success(`Email process completed via proxy! Sent: ${sentCount}, Failed: ${failedCount}`);

      // Reset for next wave
      setStep(1);
      setSelectedBusinessIds([]);
      setGeneratedMessage('');
      setSelectedTemplate('');
      setSelectedCategory(null);
    } catch (error) {
      toast.error('Failed to send emails via proxy');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Find Businesses', active: step >= 1 },
    { number: 2, title: 'Generate Message', active: step >= 2 },
    { number: 3, title: 'Choose Message', active: step >= 3 },
    { number: 4, title: 'Send Emails', active: step >= 4 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Action Center</h1>
        <p className="text-base leading-relaxed text-slate-600 mt-2">Find businesses and send personalized emails</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-3xl">
        {steps.map((s, idx) => (
          <div key={s.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`wizard-step ${s.active ? 'active' : ''} flex items-center justify-center w-10 h-10 rounded-full border-2 ${s.active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'
                }`}>
                {s.active ? (
                  <CheckCircle2 className="w-6 h-6 text-indigo-500" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <span className={`text-xs mt-2 font-medium ${s.active ? 'text-indigo-600' : 'text-slate-400'
                }`}>{s.title}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${s.active ? 'bg-indigo-500' : 'bg-slate-300'
                }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Find Businesses */}
      {step === 1 && (
        <Card data-testid="step-find-businesses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Step 1: Find Businesses</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={onlyEmail ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyEmail(!onlyEmail)}
                className="text-xs"
              >
                {onlyEmail ? "All Businesses" : "Only Email"}
              </Button>
              <Button
                variant={isTestMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsTestMode(!isTestMode)}
                className="text-xs"
              >
                {isTestMode ? "Switch to Search" : "Enable Test Mode"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isTestMode ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Test Recipient Email</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="your-email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-[10px] text-slate-500 italic">This email will be used as the business owner's email for all testing steps.</p>
                </div>
                <Button
                  onClick={handleStartTestMode}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Start Test Session
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., New York, NY"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      data-testid="input-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Input
                      id="businessType"
                      placeholder="e.g., restaurants, coffee shops"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      data-testid="input-business-type"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="count">Number of Businesses to Find</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="count"
                      type="number"
                      min="1"
                      max="50"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      className="w-24"
                      data-testid="input-count"
                    />
                    <span className="text-sm text-slate-500">Max 50 per search</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleFindBusinesses}
                    disabled={loading}
                    className="flex-1 h-12 sm:h-auto"
                    data-testid="btn-find-businesses"
                  >
                    {loading ? 'Searching...' : 'Find Businesses'}
                  </Button>
                  {foundBusinesses.length > 0 && (
                    <Button
                      onClick={handleNextStep}
                      variant="outline"
                      className="flex-1 h-12 sm:h-auto border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                      data-testid="btn-next-step"
                    >
                      Next Step: Generate Message
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Found Businesses Display */}
            {foundBusinesses.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Results: {foundBusinesses.length} / {count} Found
                  </h3>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Scroll to view</span>
                </div>
                <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                  {foundBusinesses.map((business, idx) => (
                    <div
                      key={business.id}
                      className="p-4 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 group hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedBusiness(business)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <h4 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{business.name}</h4>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-slate-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="text-xs truncate max-w-[200px]">{business.address}</span>
                          </div>
                          {business.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span className="text-xs">{business.phone}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3 mt-3">
                          {business.realWebsite ? (
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none text-[10px]">
                              <Globe className="w-3 h-3 mr-1" />
                              Website
                            </Badge>
                          ) : business.isSocialOnly ? (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none text-[10px]">
                              <Globe className="w-3 h-3 mr-1" />
                              Social Media Only
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px]">
                              No Website
                            </Badge>
                          )}
                          {business.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-medium text-slate-600">{business.rating}</span>
                              <span className="text-[10px] text-slate-400">({business.reviews})</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${business.needsWebsite === 'YES' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                          {business.needsWebsite === 'YES' ? 'High Potential' : 'SaaS Lead'}
                        </span>
                        <Info className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Business Details Dialog */}
      <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              {selectedBusiness?.name}
              <Badge className={selectedBusiness?.needsWebsite === 'YES' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                {selectedBusiness?.needsWebsite === 'YES' ? 'Website Lead' : 'SaaS Lead'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedBusiness && (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Location Information</h4>
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                    <p className="text-sm">{selectedBusiness.address}</p>
                  </div>
                </div>

                {selectedBusiness.phone && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact</h4>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4" />
                      <p className="text-sm">{selectedBusiness.phone}</p>
                    </div>
                  </div>
                )}

                {selectedBusiness.rating && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Social Proof</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-lg font-bold text-slate-900">{selectedBusiness.rating}</span>
                      </div>
                      <span className="text-sm text-slate-500">based on {selectedBusiness.reviews} reviews</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Online Presence</h4>
                  {selectedBusiness.realWebsite ? (
                    <div className="space-y-3">
                      <a
                        href={selectedBusiness.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        <span className="text-sm truncate font-medium">{selectedBusiness.website}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                        "The website appears to be already established, but may need modernization or conversion optimization."
                      </p>
                    </div>
                  ) : selectedBusiness.isSocialOnly ? (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                        <p className="text-sm text-amber-800 font-medium truncate">Social Media Only</p>
                        <a
                          href={selectedBusiness.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-amber-700 hover:text-amber-800 mt-2 text-xs font-medium"
                        >
                          <Globe className="w-4 h-4" />
                          <span>Visit Social Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-xs text-amber-600 mt-2 italic">No official website found. This is a high-potential lead for a real website.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <p className="text-sm text-slate-600 font-medium">No online presence found.</p>
                      <p className="text-xs text-slate-400 mt-1 italic">High potential lead for website and SEO services.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Search Context</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="capitalize">{selectedBusiness.businessType}</Badge>
                    <Badge variant="secondary" className="capitalize">{selectedBusiness.location}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Step 2: Strategy & Generation */}
      {step === 2 && (
        <Card data-testid="step-generate-message">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Step 2: Choose Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                variant={selectedCategory === 'website' ? 'default' : 'outline'}
                className={`h-auto py-6 flex flex-col gap-2 ${selectedCategory === 'website' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : ''}`}
                onClick={() => {
                  setSelectedCategory('website');
                  setSelectedBusinessIds(foundBusinesses.filter(b => b.needsWebsite === 'YES').map(b => b.id));
                }}
              >
                <Globe className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-bold">Target Website Leads</div>
                  <div className="text-xs opacity-70">{foundBusinesses.filter(b => b.needsWebsite === 'YES').length} Businesses found</div>
                </div>
              </Button>
              <Button
                variant={selectedCategory === 'saas' ? 'default' : 'outline'}
                className={`h-auto py-6 flex flex-col gap-2 ${selectedCategory === 'saas' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : ''}`}
                onClick={() => {
                  setSelectedCategory('saas');
                  setSelectedBusinessIds(foundBusinesses.filter(b => b.needsWebsite === 'NO').map(b => b.id));
                }}
              >
                <Target className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-bold">Target SaaS Leads</div>
                  <div className="text-xs opacity-70">{foundBusinesses.filter(b => b.needsWebsite === 'NO').length} Businesses found</div>
                </div>
              </Button>
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              {selectedCategory && (
                <>
                  <Button
                    onClick={handleGenerateMessage}
                    disabled={loading || selectedBusinessIds.length === 0}
                    className="flex-1"
                    data-testid="btn-generate-message"
                  >
                    {loading ? 'Generating...' : 'Generate AI Message for Category'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkipToTemplates}
                    disabled={loading || selectedBusinessIds.length === 0}
                    className="flex-1"
                    data-testid="btn-skip-to-templates"
                  >
                    Use Templates
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Choose Message */}
      {step === 3 && (
        <Card data-testid="step-choose-message">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Step 3: Choose Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {useGenerated && generatedMessage ? (
              <div>
                <Label>Generated Message</Label>
                <Textarea
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  rows={8}
                  data-testid="textarea-generated-message"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Select a Template</Label>
                {campaigns.length === 0 && (
                  <p className="text-sm text-slate-500 italic">No campaigns found. Please create one in the Campaigns page.</p>
                )}
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedTemplate === campaign.template
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    onClick={() => setSelectedTemplate(campaign.template)}
                    data-testid={`campaign-${campaign.id}`}
                  >
                    <h4 className="font-semibold text-slate-900">{campaign.name}</h4>
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{campaign.template}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="flex-1"
                data-testid="btn-proceed-to-send"
              >
                Proceed to Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )
      }

      {/* Step 4: Send Emails */}
      {step === 4 && (
        <Card data-testid="step-send-emails">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">Step 4: Send Emails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-900">Previewing Email for:</h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewLeadIdx(prev => Math.max(0, prev - 1))}
                  disabled={previewLeadIdx === 0}
                >
                  Previous
                </Button>
                <span className="text-xs font-medium text-slate-500">
                  {previewLeadIdx + 1} of {selectedBusinessIds.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewLeadIdx(prev => Math.min(selectedBusinessIds.length - 1, prev + 1))}
                  disabled={previewLeadIdx === selectedBusinessIds.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="mb-4 pb-4 border-b border-slate-200">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Recipient:</p>
                <p className="text-sm text-slate-900 font-medium">
                  {foundBusinesses.find(b => b.id === selectedBusinessIds[previewLeadIdx])?.name}
                  ({foundBusinesses.find(b => b.id === selectedBusinessIds[previewLeadIdx])?.email || 'No email found'})
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Message Body (Editable):</p>
                <Textarea
                  value={getFinalMessage(
                    useGenerated ? generatedMessage : (selectedTemplate || campaigns[0]?.template || ''),
                    foundBusinesses.find(b => b.id === selectedBusinessIds[previewLeadIdx])
                  )}
                  onChange={(e) => handleEditMessage(selectedBusinessIds[previewLeadIdx], e.target.value)}
                  className="text-sm text-slate-600 bg-white p-4 rounded border border-slate-100 shadow-sm min-h-[200px]"
                />
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-500 mt-0.5" />
              <div className="text-xs text-indigo-700 leading-relaxed">
                <p>Tip: Placeholders like <strong>{`{Business_Name}`}</strong> will be automatically replaced unless you edit the message above.</p>
                <p className="mt-1 font-semibold text-indigo-800">You can manually edit the text above for this specific lead!</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={loading}
                className="flex-1"
                data-testid="btn-send-emails"
              >
                {loading ? 'Sending...' : 'Send Emails'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Action;