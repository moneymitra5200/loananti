'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Handle install prompt event
  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 5000);

      return () => clearTimeout(timer);
    };

    // For iOS, show install button after delay
    if (isIOS) {
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  const handleIOSInstall = useCallback(() => {
    setShowIOSInstructions(true);
  }, []);

  // Don't show if already installed
  if (isInstalled) return null;

  // Check iOS
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // iOS Install Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <Card className="border-2 border-emerald-200 shadow-2xl bg-white">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Install Money Mitra</h3>
                  <p className="text-xs text-gray-500">Add to Home Screen</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold">1</div>
                <div className="flex items-center gap-2">
                  <span>Tap the</span>
                  <Share className="w-5 h-5 text-emerald-600" />
                  <span>Share button</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold">2</div>
                <div className="flex items-center gap-2">
                  <span>Scroll down and tap</span>
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>"Add to Home Screen"</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold">3</div>
                <span>Tap "Add" in the top right</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Standard install prompt (Android/Chrome)
  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom duration-300">
      <Card className="border-2 border-emerald-200 shadow-2xl bg-white">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Install Money Mitra</h3>
                <p className="text-xs text-gray-500">Add to your home screen</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Install Money Mitra for quick access, offline support, and a better experience!
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={isIOS ? handleIOSInstall : handleInstallClick}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Install App
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Not Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
