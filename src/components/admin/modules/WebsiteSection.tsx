'use client';

import { memo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Phone, FileText, Globe, Info, BarChart3, Clock, Camera, Save, Loader2 } from 'lucide-react';

interface SettingsData {
  companyLogo: string;
  companyName: string;
  companyTagline: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  heroTitle: string;
  heroDescription: string;
  heroButtonText: string;
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  aboutTitle: string;
  aboutDescription: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  weekdayHours: string;
  saturdayHours: string;
  sundayClosed: boolean;
}

interface Props {
  settings: SettingsData;
  setSettings: (settings: SettingsData) => void;
  savingSettings: boolean;
  onSave: () => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingLogo: boolean;
}

function WebsiteSection({
  settings,
  setSettings,
  savingSettings,
  onSave,
  onLogoUpload,
  uploadingLogo
}: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* Website Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Website Management</h2>
          <p className="text-gray-500">Manage your public website content and appearance</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={onSave} disabled={savingSettings}>
          {savingSettings ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Branding Section */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Company Branding
          </CardTitle>
          <CardDescription>Update your company logo and brand identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {settings.companyLogo ? (
                  <img src={settings.companyLogo} alt="Company Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="h-12 w-12 text-gray-300" />
                )}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Company Logo</Label>
                <p className="text-sm text-gray-500 mb-2">Upload your company logo (PNG, JPG, max 2MB)</p>
                <input
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  onChange={onLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Logo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Company Name</Label>
              <Input
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <Label>Company Tagline</Label>
              <Input
                value={settings.companyTagline || ''}
                onChange={(e) => setSettings({ ...settings, companyTagline: e.target.value })}
                placeholder="Your tagline"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Contact Information
          </CardTitle>
          <CardDescription>Update contact details displayed on the website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={settings.companyEmail || ''}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={settings.companyPhone || ''}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                placeholder="+91 1800-123-4567"
              />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Textarea
              value={settings.companyAddress || ''}
              onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
              placeholder="Enter complete address"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hero Section */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Hero Section
          </CardTitle>
          <CardDescription>Customize the hero section of your landing page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Hero Title</Label>
            <Input
              value={settings.heroTitle || ''}
              onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
              placeholder="Your Dreams, Our Support"
            />
          </div>
          <div>
            <Label>Hero Description</Label>
            <Textarea
              value={settings.heroDescription || ''}
              onChange={(e) => setSettings({ ...settings, heroDescription: e.target.value })}
              placeholder="Describe your services in a compelling way"
              rows={3}
            />
          </div>
          <div>
            <Label>Hero Button Text</Label>
            <Input
              value={settings.heroButtonText || 'Apply Now'}
              onChange={(e) => setSettings({ ...settings, heroButtonText: e.target.value })}
              placeholder="Apply Now"
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-600" />
            Social Media Links
          </CardTitle>
          <CardDescription>Add your social media profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Facebook URL</Label>
              <Input value={settings.facebookUrl || ''} onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })} placeholder="https://facebook.com/yourpage" />
            </div>
            <div>
              <Label>Twitter URL</Label>
              <Input value={settings.twitterUrl || ''} onChange={(e) => setSettings({ ...settings, twitterUrl: e.target.value })} placeholder="https://twitter.com/yourhandle" />
            </div>
            <div>
              <Label>LinkedIn URL</Label>
              <Input value={settings.linkedinUrl || ''} onChange={(e) => setSettings({ ...settings, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/company/yourcompany" />
            </div>
            <div>
              <Label>Instagram URL</Label>
              <Input value={settings.instagramUrl || ''} onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })} placeholder="https://instagram.com/yourhandle" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-teal-600" />
            About Us Section
          </CardTitle>
          <CardDescription>Customize the about section content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>About Us Title</Label>
            <Input value={settings.aboutTitle || ''} onChange={(e) => setSettings({ ...settings, aboutTitle: e.target.value })} placeholder="Trusted by Thousands, Growing Together" />
          </div>
          <div>
            <Label>About Us Description</Label>
            <Textarea value={settings.aboutDescription || ''} onChange={(e) => setSettings({ ...settings, aboutDescription: e.target.value })} placeholder="Write a compelling description about your company" rows={5} />
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            SEO Settings
          </CardTitle>
          <CardDescription>Optimize your website for search engines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Meta Title</Label>
            <Input value={settings.metaTitle || ''} onChange={(e) => setSettings({ ...settings, metaTitle: e.target.value })} placeholder="Page title for SEO" />
          </div>
          <div>
            <Label>Meta Description</Label>
            <Textarea value={settings.metaDescription || ''} onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })} placeholder="Brief description for search results" rows={3} />
          </div>
          <div>
            <Label>Meta Keywords</Label>
            <Input value={settings.metaKeywords || ''} onChange={(e) => setSettings({ ...settings, metaKeywords: e.target.value })} placeholder="loans, finance, personal loan, business loan" />
            <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Working Hours
          </CardTitle>
          <CardDescription>Display your business hours on the website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Weekday Hours</Label>
              <Input value={settings.weekdayHours || '9:00 AM - 6:00 PM'} onChange={(e) => setSettings({ ...settings, weekdayHours: e.target.value })} placeholder="9:00 AM - 6:00 PM" />
            </div>
            <div>
              <Label>Saturday Hours</Label>
              <Input value={settings.saturdayHours || '9:00 AM - 2:00 PM'} onChange={(e) => setSettings({ ...settings, saturdayHours: e.target.value })} placeholder="9:00 AM - 2:00 PM" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sundayClosed" checked={settings.sundayClosed !== false} onChange={(e) => setSettings({ ...settings, sundayClosed: e.target.checked })} className="rounded border-gray-300" />
            <Label htmlFor="sundayClosed" className="font-normal">Sunday Closed</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(WebsiteSection);
