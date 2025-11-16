'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, X, ChevronLeft, Users, Sparkles } from 'lucide-react';
import { track } from '@/lib/analytics';

export default function PrePricingPaywall() {
  const router = useRouter();
  const [showTeaser, setShowTeaser] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Track page view on mount
  useEffect(() => {
    track('paywall_view', { page: 'preview' });
  }, []);

  // Handle ESC key for modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeaser) {
        closeTeaser();
      }
    };

    if (showTeaser) {
      document.addEventListener('keydown', handleEsc);
      // Focus trap
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showTeaser]);

  const goToPricing = () => {
    track('paywall_cta_click', { source: 'main_cta' });
    console.log('[Navigation] Redirecting to pricing...');
    router.push('/pricing');
  };

  const openTeaser = () => {
    track('paywall_teaser_open');
    setShowTeaser(true);
  };

  const closeTeaser = () => {
    setShowTeaser(false);
  };

  const handleCardClick = (cardName: string) => {
    track('paywall_card_click', { card_name: cardName });
    goToPricing();
  };

  const lockedCards = [
    {
      id: 'full_map',
      title: 'מפת המסע המלאה',
      description: 'מפה אינטראקטיבית עם כל השלבים והמשימות במסך אחד.',
      icon: '🗺️'
    },
    {
      id: 'all_tasks',
      title: 'כל השלבים והמשימות',
      description: 'מעקב מלא מכל משימה ועד היעד הסופי שלך.',
      icon: '📋'
    },
    {
      id: 'personalized',
      title: 'תזונה ואימונים מותאמים',
      description: 'תפריט תזונה ותוכנית אימונים לפי הנתונים שלך.',
      icon: '🎯'
    },
    {
      id: 'tracking',
      title: 'מעקב והתקדמות',
      description: 'נקודות, מדדים ושמירה של כל התהליך שלך.',
      icon: '📈'
    }
  ];

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#1C1C22] text-white relative">
      {/* Main Content */}
      <div className="relative z-10 px-4 py-8 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            מסע הכושר שלך מוכן — פתח גישה מלאה
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            יצרנו לך מסע אישי עם משימות מדויקות, תזונה מותאמת, אימונים לפי היעדים שלך ומעקב התקדמות.
          </p>
        </motion.div>

        {/* Status Badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-900/30 border border-green-800/50">
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">
              המסע האישי שלך נוצר ומחכה לך בפנים
            </span>
          </div>
        </motion.div>

        {/* Locked Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8 max-w-4xl mx-auto">
          {lockedCards.map((card, index) => (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              onClick={() => handleCardClick(card.id)}
              className="relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#E2F163]/30 transition-all hover:scale-[1.02] text-right group"
            >
              {/* Premium Tag */}
              <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-[#E2F163]/10 border border-[#E2F163]/30">
                <span className="text-xs text-[#E2F163] font-medium">ננעל בפרימיום</span>
              </div>

              {/* Icon */}
              <div className="text-3xl mb-3">{card.icon}</div>

              {/* Content */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  {card.title}
                  <Lock className="w-4 h-4 text-gray-500" />
                </h3>
                <p className="text-gray-400 text-sm blur-[1px] group-hover:blur-0 transition-all">
                  {card.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Teaser Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mb-8"
        >
          <button
            onClick={openTeaser}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 hover:border-[#E2F163]/50 transition-all hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            <span>הצג דוגמה</span>
          </button>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <Users className="w-5 h-5 text-[#E2F163]" />
          <span className="text-sm text-gray-400">מצטרפים חדשים השבוע</span>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="max-w-2xl mx-auto"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Free */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h4 className="text-lg font-semibold mb-3 text-gray-400">חינמי</h4>
              <p className="text-sm text-gray-500">
                גישה בסיסית ומוגבלת, ללא מפה מלאה וללא התאמה חכמה.
              </p>
            </div>

            {/* Premium */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#E2F163]/10 to-[#E2F163]/5 border border-[#E2F163]/30">
              <h4 className="text-lg font-semibold mb-3 text-[#E2F163]">פרימיום</h4>
              <p className="text-sm text-gray-300">
                גישה מלאה לכל הכלים, התאמות חכמות ותוכן מתעדכן.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sticky CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1C1C22] to-transparent backdrop-blur-lg z-20"
      >
        <div className="max-w-md mx-auto space-y-3">
          <button
            onClick={goToPricing}
            className="w-full py-4 px-6 rounded-full bg-[#E2F163] hover:bg-[#D7EA5F] text-black font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: '#E2F163' }}
          >
            המשך לפתיחת הגישה
          </button>

          <p className="text-center text-xs text-gray-500">
            ללא התחייבות · ניתן לבטל בכל רגע
          </p>
        </div>
      </motion.div>

      {/* Teaser Modal */}
      <AnimatePresence>
        {showTeaser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={closeTeaser}
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full bg-[#1C1C22] rounded-2xl p-6 border border-white/10"
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="teaser-title"
            >
              {/* Close Button */}
              <button
                onClick={closeTeaser}
                className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="סגור חלון"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Content */}
              <h3 id="teaser-title" className="text-2xl font-bold mb-4">
                הצצה למסע שלך
              </h3>

              {/* Teaser Images (blurred) */}
              <div className="space-y-4 mb-6">
                <div className="h-32 rounded-xl bg-gradient-to-br from-[#E2F163]/20 to-[#E2F163]/5 blur-[2px] flex items-center justify-center">
                  <span className="text-4xl">🗺️</span>
                </div>
                <div className="h-24 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 blur-[2px] flex items-center justify-center">
                  <span className="text-3xl">💪</span>
                </div>
                <div className="h-20 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 blur-[2px] flex items-center justify-center">
                  <span className="text-3xl">🥗</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  closeTeaser();
                  goToPricing();
                }}
                className="w-full py-3 px-6 rounded-full bg-[#E2F163] hover:bg-[#D7EA5F] text-black font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                המשך לפתיחת הגישה
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}