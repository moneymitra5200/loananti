'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  MapPin, Users, Clock, Search, RefreshCw, Loader2, 
  Smartphone, Monitor, Tablet, Globe, ExternalLink,
  Calendar, Filter, AlertCircle, ArrowLeft, User, ChevronRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationRecord {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  action: string;
  loanApplicationId: string | null;
  paymentId: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
  };
}

interface UserWithLocations {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
  };
  locationCount: number;
  lastLocation: LocationRecord;
}

const ACTION_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  APP_OPEN: { label: 'App Opened', className: 'bg-blue-100 text-blue-700', icon: Smartphone },
  LOAN_APPLY: { label: 'Loan Applied', className: 'bg-emerald-100 text-emerald-700', icon: AlertCircle },
  EMI_PAY: { label: 'EMI Paid', className: 'bg-amber-100 text-amber-700', icon: Clock },
  SESSION_CONFIRM: { label: 'Sanction Confirmed', className: 'bg-purple-100 text-purple-700', icon: AlertCircle },
  LOGIN: { label: 'Logged In', className: 'bg-cyan-100 text-cyan-700', icon: Users },
};

export default function LocationHistoryViewer() {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [totalRecords, setTotalRecords] = useState(0);
  
  // User detail view state
  const [selectedUser, setSelectedUser] = useState<UserWithLocations | null>(null);
  const [userLocations, setUserLocations] = useState<LocationRecord[]>([]);
  const [loadingUserLocations, setLoadingUserLocations] = useState(false);
  const [showUserSheet, setShowUserSheet] = useState(false);

  const fetchLocations = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch('/api/location/track?all=true&limit=1000');
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations || []);
        setTotalRecords(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      if (!isRefresh) {
        toast({
          title: 'Error',
          description: 'Failed to fetch location history',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Group locations by user
  const usersWithLocations: UserWithLocations[] = useMemo(() => {
    const userMap = new Map<string, UserWithLocations>();
    
    locations.forEach(loc => {
      const existing = userMap.get(loc.userId);
      if (existing) {
        existing.locationCount++;
        // Keep the most recent location
        if (new Date(loc.createdAt) > new Date(existing.lastLocation.createdAt)) {
          existing.lastLocation = loc;
        }
      } else {
        userMap.set(loc.userId, {
          userId: loc.userId,
          user: loc.user,
          locationCount: 1,
          lastLocation: loc
        });
      }
    });
    
    return Array.from(userMap.values()).sort((a, b) => 
      new Date(b.lastLocation.createdAt).getTime() - new Date(a.lastLocation.createdAt).getTime()
    );
  }, [locations]);

  const filteredUsers = usersWithLocations.filter(u => {
    const matchesSearch = 
      u.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user?.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Fetch user's detailed locations (last 1000)
  const fetchUserLocations = async (userId: string) => {
    setLoadingUserLocations(true);
    try {
      const response = await fetch(`/api/location/track?userId=${userId}&limit=1000`);
      const data = await response.json();
      if (data.success) {
        setUserLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching user locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user location history',
        variant: 'destructive'
      });
    } finally {
      setLoadingUserLocations(false);
    }
  };

  const handleUserClick = (userWithLoc: UserWithLocations) => {
    setSelectedUser(userWithLoc);
    setShowUserSheet(true);
    fetchUserLocations(userWithLoc.userId);
  };

  const filteredUserLocations = userLocations.filter(loc => {
    return filterAction === 'all' || loc.action === filterAction;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'smartphone':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
      case 'computer':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Location Records</p>
                <p className="text-2xl font-bold">{totalRecords}</p>
                <p className="text-xs text-blue-200 mt-1">Last 1000 records</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <MapPin className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Unique Users Tracked</p>
                <p className="text-2xl font-bold">{usersWithLocations.length}</p>
                <p className="text-xs text-emerald-200 mt-1">Click user to see details</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Today's Activity</p>
                <p className="text-2xl font-bold">
                  {locations.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
                </p>
                <p className="text-xs text-purple-200 mt-1">Location events today</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                User Location History
              </CardTitle>
              <CardDescription>
                Click on a user to view their last 1000 location records
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-56"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => fetchLocations(true)} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No users found</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
                {filteredUsers.map((userWithLoc, index) => {
                  const lastActionConfig = ACTION_CONFIG[userWithLoc.lastLocation.action] || { 
                    label: userWithLoc.lastLocation.action, 
                    className: 'bg-gray-100 text-gray-700', 
                    icon: MapPin 
                  };
                  const ActionIcon = lastActionConfig.icon;
                  
                  return (
                    <motion.div
                      key={userWithLoc.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="p-4 border border-gray-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all bg-white cursor-pointer"
                      onClick={() => handleUserClick(userWithLoc)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-teal-500">
                            <AvatarFallback className="bg-transparent text-white font-semibold">
                              {userWithLoc.user?.name?.charAt(0) || userWithLoc.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-gray-900">{userWithLoc.user?.name || 'Unknown'}</h4>
                            <p className="text-xs text-gray-500">{userWithLoc.user?.email}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {userWithLoc.locationCount} records
                          </Badge>
                          <Badge className={lastActionConfig.className}>
                            <ActionIcon className="h-3 w-3 mr-1" />
                            {lastActionConfig.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(userWithLoc.lastLocation.createdAt)}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span className="font-mono truncate">
                          {userWithLoc.lastLocation.latitude.toFixed(4)}, {userWithLoc.lastLocation.longitude.toFixed(4)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <Sheet open={showUserSheet} onOpenChange={setShowUserSheet}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowUserSheet(false)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-teal-500">
                  <AvatarFallback className="bg-transparent text-white font-semibold">
                    {selectedUser?.user?.name?.charAt(0) || selectedUser?.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>{selectedUser?.user?.name || 'Unknown'}</SheetTitle>
                  <SheetDescription>{selectedUser?.user?.email}</SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* User Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-2xl font-bold">{userLocations.length}</p>
                      <p className="text-xs text-gray-500">Location Records</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{new Set(userLocations.map(l => l.action)).size}</p>
                      <p className="text-xs text-gray-500">Activity Types</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="APP_OPEN">App Opened</SelectItem>
                  <SelectItem value="LOAN_APPLY">Loan Applied</SelectItem>
                  <SelectItem value="EMI_PAY">EMI Paid</SelectItem>
                  <SelectItem value="SESSION_CONFIRM">Sanction Confirmed</SelectItem>
                  <SelectItem value="LOGIN">Logged In</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">
                Showing {filteredUserLocations.length} records
              </span>
            </div>
            
            {/* Location List */}
            {loadingUserLocations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredUserLocations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No location records found</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {filteredUserLocations.map((loc, index) => {
                    const actionConfig = ACTION_CONFIG[loc.action] || { label: loc.action, className: 'bg-gray-100 text-gray-700', icon: MapPin };
                    const ActionIcon = actionConfig.icon;
                    
                    return (
                      <motion.div
                        key={loc.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.01 }}
                        className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-all bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={actionConfig.className}>
                              <ActionIcon className="h-3 w-3 mr-1" />
                              {actionConfig.label}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              <span>{formatDate(loc.createdAt)}</span>
                              <span className="ml-2 text-blue-600">{formatTimeAgo(loc.createdAt)}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => openInMaps(loc.latitude, loc.longitude)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Map
                          </Button>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-red-500" />
                          <span className="font-mono text-gray-600">
                            {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                          </span>
                          {loc.accuracy && (
                            <span className="text-xs text-gray-400">
                              (±{loc.accuracy.toFixed(0)}m)
                            </span>
                          )}
                        </div>
                        
                        {loc.deviceType && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            {getDeviceIcon(loc.deviceType)}
                            <span>{loc.deviceType}</span>
                            {loc.os && <span>• {loc.os}</span>}
                            {loc.browser && <span>• {loc.browser}</span>}
                          </div>
                        )}
                        
                        {loc.address && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-medium">Address:</span> {loc.address}
                            {loc.city && <span>, {loc.city}</span>}
                            {loc.state && <span>, {loc.state}</span>}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
