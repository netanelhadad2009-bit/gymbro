/**
 * Manual Product Entry Sheet
 * Allows users to manually add food products with nutrition data
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import type { BarcodeProduct, Per100g } from '@/types/barcode';
import { useToast } from '@/components/ui/use-toast';
import { Keyboard } from '@capacitor/keyboard';

interface ManualProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode?: string; // Pre-fill barcode if available
  onSuccess?: (product: BarcodeProduct) => void;
}

interface FormData {
  name_he: string;
  brand: string;
  barcode: string;
  serving_grams: string;
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

interface FormErrors {
  [key: string]: string;
}

export function ManualProductSheet({
  open,
  onOpenChange,
  barcode: initialBarcode,
  onSuccess,
}: ManualProductSheetProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    name_he: '',
    brand: '',
    barcode: initialBarcode || '',
    serving_grams: '100',
    kcal: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
  });

  // Calculate preview of nutrition per serving
  const servingPreview = useMemo(() => {
    const serving = parseInt(formData.serving_grams) || 100;
    const scale = serving / 100;

    return {
      kcal: Math.round((parseInt(formData.kcal) || 0) * scale),
      protein_g: Math.round((parseInt(formData.protein_g) || 0) * scale * 10) / 10,
      carbs_g: Math.round((parseInt(formData.carbs_g) || 0) * scale * 10) / 10,
      fat_g: Math.round((parseInt(formData.fat_g) || 0) * scale * 10) / 10,
    };
  }, [formData]);

  // Listen for keyboard show/hide events
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const handleKeyboardShow = (info: any) => {
      console.log('[ManualProductSheet] Keyboard shown, height:', info.keyboardHeight);
      setKeyboardHeight(info.keyboardHeight);
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[ManualProductSheet] Keyboard hidden');
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    let showListener: any;
    let hideListener: any;

    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
      hideListener = await Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
    };

    setupListeners();

    return () => {
      setIsKeyboardVisible(false);
      showListener?.remove();
      hideListener?.remove();
    };
  }, [open]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name_he.trim()) {
      newErrors.name_he = 'שם המוצר הוא שדה חובה';
    }

    // Barcode validation (optional, but if provided must be valid)
    if (formData.barcode && !/^[0-9]{8,14}$/.test(formData.barcode)) {
      newErrors.barcode = 'ברקוד חייב להכיל 8-14 ספרות';
    }

    // Serving size
    const serving = parseInt(formData.serving_grams);
    if (!serving || serving <= 0 || serving > 10000) {
      newErrors.serving_grams = 'גודל מנה חייב להיות בין 1-10000 גרם';
    }

    // Nutrition values (all required, must be >= 0)
    const kcal = parseInt(formData.kcal);
    if (isNaN(kcal) || kcal < 0 || kcal > 9999) {
      newErrors.kcal = 'קלוריות חייבות להיות בין 0-9999';
    }

    const protein = parseInt(formData.protein_g);
    if (isNaN(protein) || protein < 0 || protein > 999) {
      newErrors.protein_g = 'חלבון חייב להיות בין 0-999';
    }

    const carbs = parseInt(formData.carbs_g);
    if (isNaN(carbs) || carbs < 0 || carbs > 999) {
      newErrors.carbs_g = 'פחמימות חייבות להיות בין 0-999';
    }

    const fat = parseInt(formData.fat_g);
    if (isNaN(fat) || fat < 0 || fat > 999) {
      newErrors.fat_g = 'שומן חייב להיות בין 0-999';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast({
        title: 'שגיאה בטופס',
        description: 'נא לתקן את השגיאות ולנסות שוב',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const per100g: Per100g = {
        kcal: parseInt(formData.kcal),
        protein_g: parseInt(formData.protein_g),
        carbs_g: parseInt(formData.carbs_g),
        fat_g: parseInt(formData.fat_g),
      };

      const payload = {
        name_he: formData.name_he.trim(),
        brand: formData.brand.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        serving_grams: parseInt(formData.serving_grams),
        per100g,
      };

      console.log('[ManualProduct] Submitting:', payload);

      const response = await fetch('/api/nutrition/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      // Haptic success
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }

      toast({
        title: 'המוצר נוסף בהצלחה!',
        description: `הרווחת +5 נקודות`,
        duration: 2000,
      });

      console.log('[ManualProduct] Success:', data.product);

      // Call success callback with the created product
      if (onSuccess && data.product) {
        onSuccess(data.product);
      }

      onOpenChange(false);

      // Reset form
      setFormData({
        name_he: '',
        brand: '',
        barcode: '',
        serving_grams: '100',
        kcal: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
      });
      setErrors({});

    } catch (error: any) {
      console.error('[ManualProduct] Error:', error);

      if (navigator.vibrate) {
        navigator.vibrate([30, 30, 30, 30, 30]);
      }

      toast({
        title: 'שגיאה ביצירת המוצר',
        description: error.message || 'נסו שוב מאוחר יותר',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />

        <Dialog.Content
          className="fixed left-0 right-0 z-[201] max-h-[90vh] rounded-t-3xl bg-[#1a1b20] overflow-hidden transition-all duration-200"
          dir="rtl"
          style={{
            bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
          }}
        >
          {/* Handle */}
          <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mt-3" />

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white">הוספת מוצר ידני</h2>
            <Dialog.Close asChild>
              <button
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                aria-label="סגור"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[75vh] pb-32">
            <div className="p-4 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  שם המוצר <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name_he}
                  onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
                  className={`w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 ${
                    errors.name_he ? 'ring-2 ring-red-500' : 'focus:ring-[#E2F163]/50'
                  }`}
                  placeholder="למשל: חלב 3%"
                  dir="rtl"
                />
                {errors.name_he && (
                  <p className="mt-1 text-sm text-red-400">{errors.name_he}</p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  מותג (אופציונלי)
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E2F163]/50"
                  placeholder="למשל: תנובה"
                  dir="rtl"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  ברקוד (אופציונלי)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value.replace(/\D/g, '') })}
                  className={`w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 ${
                    errors.barcode ? 'ring-2 ring-red-500' : 'focus:ring-[#E2F163]/50'
                  }`}
                  placeholder="8-14 ספרות"
                  maxLength={14}
                />
                {errors.barcode && (
                  <p className="mt-1 text-sm text-red-400">{errors.barcode}</p>
                )}
              </div>

              {/* Serving Size */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  גודל מנה (גרם) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.serving_grams}
                  onChange={(e) => setFormData({ ...formData, serving_grams: e.target.value })}
                  className={`w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 ${
                    errors.serving_grams ? 'ring-2 ring-red-500' : 'focus:ring-[#E2F163]/50'
                  }`}
                  placeholder="100"
                  min="1"
                  max="10000"
                />
                {errors.serving_grams && (
                  <p className="mt-1 text-sm text-red-400">{errors.serving_grams}</p>
                )}
              </div>

              {/* Nutrition per 100g */}
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                  ערכים תזונתיים ל-100 גרם <span className="text-red-400">*</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Calories */}
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">קלוריות</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.kcal}
                      onChange={(e) => setFormData({ ...formData, kcal: e.target.value })}
                      className={`w-full px-3 py-2 bg-white/5 rounded-lg text-white text-center focus:outline-none focus:ring-2 ${
                        errors.kcal ? 'ring-2 ring-red-500' : 'focus:ring-[#E2F163]/50'
                      }`}
                      placeholder="0"
                      min="0"
                      max="9999"
                    />
                    {errors.kcal && (
                      <p className="mt-1 text-xs text-red-400">{errors.kcal}</p>
                    )}
                  </div>

                  {/* Protein */}
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">חלבון (ג׳)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.protein_g}
                      onChange={(e) => setFormData({ ...formData, protein_g: e.target.value })}
                      className={`w-full px-3 py-2 bg-white/5 rounded-lg text-white text-center focus:outline-none focus:ring-2 ${
                        errors.protein_g ? 'ring-2 ring-red-500' : 'focus:ring-[#E2F163]/50'
                      }`}
                      placeholder="0"
                      min="0"
                      max="999"
                    />
                    {errors.protein_g && (
                      <p className="mt-1 text-xs text-red-400">{errors.protein_g}</p>
                    )}
                  </div>

                  {/* Carbs */}
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">פחמימות (ג׳)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.carbs_g}
                      onChange={(e) => setFormData({ ...formData, carbs_g: e.target.value })}
                      className={`w-full px-3 py-2 bg-white/5 rounded-lg text-white text-center focus:outline-none focus:ring-2 ${
                        errors.carbs_g ? 'ring-2 ring-red-500' : 'focus:ring-[#E2F163]/50'
                      }`}
                      placeholder="0"
                      min="0"
                      max="999"
                    />
                    {errors.carbs_g && (
                      <p className="mt-1 text-xs text-red-400">{errors.carbs_g}</p>
                    )}
                  </div>

                  {/* Fat */}
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">שומן (ג׳)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.fat_g}
                      onChange={(e) => setFormData({ ...formData, fat_g: e.target.value })}
                      className={`w-full px-3 py-2 bg-white/5 rounded-lg text-white text-center focus:outline-none focus:ring-2 ${
                        errors.fat_g ? 'ring-2 ring-red-500' : 'focus:ring-[#E2F163]/50'
                      }`}
                      placeholder="0"
                      min="0"
                      max="999"
                    />
                    {errors.fat_g && (
                      <p className="mt-1 text-xs text-red-400">{errors.fat_g}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-[#E2F163]/10 rounded-xl p-4 border border-[#E2F163]/20">
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">
                  תצוגה מקדימה למנה ({formData.serving_grams || 100} גרם)
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-[#E2F163]">{servingPreview.kcal}</p>
                    <p className="text-xs text-zinc-500">קלוריות</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{servingPreview.protein_g}</p>
                    <p className="text-xs text-zinc-500">חלבון</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{servingPreview.carbs_g}</p>
                    <p className="text-xs text-zinc-500">פחמימות</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{servingPreview.fat_g}</p>
                    <p className="text-xs text-zinc-500">שומן</p>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-gradient-to-t from-[#1a1b20] to-transparent">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 bg-[#E2F163] text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>שומר...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>שמור מוצר</span>
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
