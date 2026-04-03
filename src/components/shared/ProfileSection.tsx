'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, Mail, Phone, MapPin, Calendar, Shield, Camera, 
  Key, Save, Loader2, Building, UserCircle, Briefcase
} from 'lucide-react';
import { format } from 'date-fns';

interface ProfileSectionProps {
  onClose?: () => void;
}

export default function ProfileSection({ onClose }: ProfileSectionProps) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Profile edit form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: (user as any)?.address || '',
    city: (user as any)?.city || '',
    state: (user as any)?.state || '',
    pincode: (user as any)?.pincode || ''
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'photo');
      formData.append('uploadedBy', user?.id || '');

      const res = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        // Update user profile picture
        const updateRes = await fetch('/api/user/details', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user?.id,
            profilePicture: data.url 
          })
        });

        if (updateRes.ok) {
          toast.success('Profile photo updated');
          refreshUser();
        } else {
          const errorData = await updateRes.json();
          toast.error(errorData.error || 'Failed to update profile photo');
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });

      if (res.ok) {
        toast.success('Profile updated successfully');
        refreshUser();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Password changed successfully');
        setShowPasswordDialog(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-500';
      case 'COMPANY': return 'bg-blue-500';
      case 'AGENT': return 'bg-green-500';
      case 'STAFF': return 'bg-orange-500';
      case 'CASHIER': return 'bg-teal-500';
      case 'ACCOUNTANT': return 'bg-indigo-500';
      case 'CUSTOMER': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header with Photo */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Profile Photo */}
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={user?.profilePicture} alt={user?.name || 'User'} />
                <AvatarFallback className="text-xl bg-emerald-500 text-white">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 bg-emerald-500 text-white p-2 rounded-full shadow-lg hover:bg-emerald-600 transition-colors"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{user?.name || 'User'}</h2>
              <p className="text-gray-500 flex items-center justify-center sm:justify-start gap-1 mt-1">
                <Mail className="h-4 w-4" />
                {user?.email}
              </p>
              {user?.phone && (
                <p className="text-gray-500 flex items-center justify-center sm:justify-start gap-1 mt-1">
                  <Phone className="h-4 w-4" />
                  {user.phone}
                </p>
              )}
              <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                <Badge className={getRoleBadgeColor(user?.role || 'CUSTOMER')}>
                  {user?.role?.replace('_', ' ')}
                </Badge>
                {user?.isActive ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500 text-sm">Full Name</Label>
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Phone</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="Enter phone"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-500 text-sm">Address</Label>
              <Input
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-500 text-sm">City</Label>
                <Input
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label className="text-gray-500 text-sm">State</Label>
                <Input
                  value={profileForm.state}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Pincode</Label>
                <Input
                  value={profileForm.pincode}
                  onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                  placeholder="Pincode"
                />
              </div>
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Account & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>
                <Badge variant="outline">Primary</Badge>
              </div>

              {user?.company && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="font-medium">{user.company.name}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{user.company.code}</Badge>
                </div>
              )}

              {user?.agent && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Agent</p>
                      <p className="font-medium">{user.agent.name}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{user.agent.agentCode}</Badge>
                </div>
              )}

              {user?.agentCode && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Agent Code</p>
                      <p className="font-medium">{user.agentCode}</p>
                    </div>
                  </div>
                </div>
              )}

              {(user as any)?.accountantCode && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Accountant Code</p>
                      <p className="font-medium">{(user as any).accountantCode}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Change Password */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowPasswordDialog(true)}
            >
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Additional Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(user as any)?.panNumber && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">PAN Number</p>
                <p className="font-medium">{(user as any).panNumber}</p>
              </div>
            )}
            {(user as any)?.aadhaarNumber && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Aadhaar Number</p>
                <p className="font-medium">XXXX-XXXX-{(user as any).aadhaarNumber.slice(-4)}</p>
              </div>
            )}
            {(user as any)?.dateOfBirth && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">{format(new Date((user as any).dateOfBirth), 'dd MMM yyyy')}</p>
              </div>
            )}
            {(user as any)?.lastLoginAt && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Last Login</p>
                <p className="font-medium">{format(new Date((user as any).lastLoginAt), 'dd MMM yyyy HH:mm')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
