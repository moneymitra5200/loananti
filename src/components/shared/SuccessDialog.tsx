'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, PartyPopper, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon?: 'check' | 'party' | 'sparkles';
  actionText?: string;
  onAction?: () => void;
  showConfetti?: boolean;
}

export default function SuccessDialog({
  open,
  onClose,
  title,
  description,
  icon = 'check',
  actionText,
  onAction,
  showConfetti = true
}: SuccessDialogProps) {
  const IconComponent = icon === 'party' ? PartyPopper : icon === 'sparkles' ? Sparkles : CheckCircle;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-white p-0 overflow-hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative"
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 h-32" />
              
              {/* Confetti Animation */}
              {showConfetti && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        y: -20, 
                        x: Math.random() * 400 - 200, 
                        rotate: 0,
                        opacity: 1 
                      }}
                      animate={{ 
                        y: 400, 
                        x: Math.random() * 400 - 200, 
                        rotate: Math.random() * 360,
                        opacity: 0 
                      }}
                      transition={{ 
                        duration: 2, 
                        delay: Math.random() * 0.5,
                        ease: 'linear'
                      }}
                      className="absolute top-0 w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'][i % 6],
                        left: `${(i / 20) * 100}%`
                      }}
                    />
                  ))}
                </div>
              )}
              
              {/* Content */}
              <div className="relative pt-16 pb-6 px-6">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                  className="flex justify-center mb-4"
                >
                  <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-green-100">
                    <IconComponent className="w-10 h-10 text-green-500" />
                  </div>
                </motion.div>
                
                {/* Title */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                  <p className="text-gray-600 text-sm">{description}</p>
                </motion.div>
                
                {/* Action Buttons */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 flex flex-col gap-2"
                >
                  {actionText && onAction ? (
                    <Button 
                      onClick={() => { onAction(); onClose(); }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                    >
                      {actionText} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button 
                    onClick={onClose}
                    variant="outline"
                    className="w-full"
                  >
                    Continue
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
