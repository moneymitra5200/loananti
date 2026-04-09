'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

function FieldVisitsTabComponent() {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-teal-600" />
          Field Visits
        </CardTitle>
        <CardDescription>Track and manage field visit assignments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <Navigation className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Field Visit Tracking</p>
          <p className="text-sm mt-2">Field visit management features coming soon</p>
          <p className="text-xs text-gray-400 mt-1">You'll be able to view assigned visits, update statuses, and capture location data</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(FieldVisitsTabComponent);
