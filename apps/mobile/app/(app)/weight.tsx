/**
 * Weight Tracking Screen - Dedicated page for weight management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path, Line, G, Text as SvgText } from 'react-native-svg';
import {
  ArrowLeft,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
  Target,
  Calendar,
  X,
  Check,
  ChevronRight,
  Trash2,
  Clock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
import { fetchProgress, logWeight, updateWeight, deleteWeight } from '../../lib/api';
import type { WeightPoint, ProgressKPIs } from '../../types/progress';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CHART_HEIGHT = 200;

// Weight Chart Component
function WeightChart({ data }: { data: WeightPoint[] }) {
  if (!data.length || data.length < 2) return null;

  const weights = data.map(d => d.kg);
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const padding = { top: 30, right: 15, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const max = Math.max(...weights) * 1.02;
  const min = Math.min(...weights) * 0.98;
  const range = max - min || 1;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - ((val - min) / range) * chartHeight;

  // Create smooth path
  const pathPoints = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.kg)}`).join(' ');

  // Create area path
  const areaPath = `${pathPoints} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Y-axis labels
  const yLabels = [min, (min + max) / 2, max].map(v => v.toFixed(1));

  // X-axis labels (show first, middle, last dates) - dedupe for small arrays
  const xIndices = [...new Set([0, Math.floor(data.length / 2), data.length - 1])];

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="weightAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.accent.primary} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={colors.accent.primary} stopOpacity="0" />
          </SvgGradient>
        </Defs>

        {/* Grid lines */}
        {yLabels.map((label, i) => {
          const y = getY(parseFloat(label));
          return (
            <G key={i}>
              <Line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={1}
              />
              <SvgText
                x={padding.left - 10}
                y={y + 4}
                fontSize={11}
                fill={colors.text.muted}
                textAnchor="end"
              >
                {label}
              </SvgText>
            </G>
          );
        })}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#weightAreaGradient)" />

        {/* Line */}
        <Path
          d={pathPoints}
          stroke={colors.accent.primary}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <Circle
            key={i}
            cx={getX(i)}
            cy={getY(d.kg)}
            r={i === data.length - 1 ? 8 : 4}
            fill={i === data.length - 1 ? colors.accent.primary : colors.background.secondary}
            stroke={colors.accent.primary}
            strokeWidth={2}
          />
        ))}

        {/* X-axis labels */}
        {xIndices.map((idx) => {
          // Try to parse the date, with fallbacks
          let labelDate: Date;
          const item = data[idx];
          if (item.date) {
            // Handle both ISO timestamp and YYYY-MM-DD formats
            if (item.date.includes('T')) {
              labelDate = new Date(item.date);
            } else {
              labelDate = new Date(item.date + 'T00:00:00');
            }
          } else if (item.t) {
            labelDate = new Date(item.t);
          } else {
            labelDate = new Date();
          }
          // Validate the date
          const isValidDate = !isNaN(labelDate.getTime());
          const displayText = isValidDate
            ? labelDate.toLocaleDateString('en', { day: 'numeric', month: 'short' })
            : '';
          return (
            <SvgText
              key={idx}
              x={getX(idx)}
              y={height - 10}
              fontSize={11}
              fill={colors.text.muted}
              textAnchor="middle"
            >
              {displayText}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

// Stats Card
function StatsCard({ kpis, weightData }: { kpis: ProgressKPIs | null; weightData: WeightPoint[] }) {
  const current = kpis?.weight.current;
  const delta7d = kpis?.weight.delta7d;
  const trend = kpis?.weight.trend;

  // Calculate 30-day change
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const oldWeight = weightData.find(w => new Date(w.t) <= thirtyDaysAgo);
  const delta30d = oldWeight && current ? current - oldWeight.kg : null;

  // Get highest and lowest
  const weights = weightData.map(w => w.kg);
  const highest = weights.length ? Math.max(...weights) : null;
  const lowest = weights.length ? Math.min(...weights) : null;

  return (
    <View style={styles.statsContainer}>
      {/* Current Weight - Hero */}
      <LinearGradient
        colors={['rgba(226, 241, 99, 0.15)', 'rgba(163, 230, 53, 0.05)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.currentWeightCard}
      >
        <View style={styles.currentWeightHeader}>
          <Scale size={20} color={colors.accent.primary} />
          <Text style={styles.currentWeightLabel}>Current Weight</Text>
        </View>
        <View style={styles.currentWeightValue}>
          <Text style={styles.currentWeightNumber}>{current?.toFixed(1) || '--'}</Text>
          <Text style={styles.currentWeightUnit}>kg</Text>
        </View>
        {delta7d !== null && delta7d !== undefined && (
          <View style={styles.currentWeightDelta}>
            {trend === 'down' ? (
              <TrendingDown size={16} color={colors.semantic.success} />
            ) : trend === 'up' ? (
              <TrendingUp size={16} color={colors.semantic.warning} />
            ) : (
              <Minus size={16} color={colors.text.muted} />
            )}
            <Text style={[
              styles.currentWeightDeltaText,
              { color: trend === 'down' ? colors.semantic.success :
                       trend === 'up' ? colors.semantic.warning : colors.text.muted }
            ]}>
              {delta7d > 0 ? '+' : ''}{delta7d.toFixed(1)} kg this week
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>7 Day Change</Text>
          <Text style={[styles.statValue, {
            color: delta7d && delta7d < 0 ? colors.semantic.success :
                   delta7d && delta7d > 0 ? colors.semantic.warning : colors.text.primary
          }]}>
            {delta7d != null ? `${delta7d > 0 ? '+' : ''}${delta7d.toFixed(1)}` : '--'} kg
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>30 Day Change</Text>
          <Text style={[styles.statValue, {
            color: delta30d && delta30d < 0 ? colors.semantic.success :
                   delta30d && delta30d > 0 ? colors.semantic.warning : colors.text.primary
          }]}>
            {delta30d !== null ? `${delta30d > 0 ? '+' : ''}${delta30d.toFixed(1)}` : '--'} kg
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Highest</Text>
          <Text style={styles.statValue}>{highest?.toFixed(1) || '--'} kg</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Lowest</Text>
          <Text style={styles.statValue}>{lowest?.toFixed(1) || '--'} kg</Text>
        </View>
      </View>
    </View>
  );
}

// Weigh-in List Item
function WeighInItem({ item, isLatest, onPress }: { item: WeightPoint; isLatest: boolean; onPress: () => void }) {
  // Use the user-selected date for display, fallback to created_at if not available
  const getDisplayDate = () => {
    if (item.date) {
      // The date from API comes as ISO timestamp '2025-12-04T00:00:00+00:00'
      // or as YYYY-MM-DD '2025-12-04' - handle both cases
      let parsed: Date;
      if (item.date.includes('T')) {
        // Already a full ISO timestamp
        parsed = new Date(item.date);
      } else {
        // Just a date string, add time to avoid timezone issues
        parsed = new Date(item.date + 'T00:00:00');
      }
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Fallback to created_at timestamp
    return new Date(item.t);
  };
  const displayDate = getDisplayDate();
  const formattedDate = displayDate.toLocaleDateString('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Extract time from notes if available (format: "... (10:30 AM)" or "Logged at 10:30 AM")
  const extractTime = (notes?: string | null): string | null => {
    if (!notes) return null;
    // Match patterns like "(10:30 AM)" or "Logged at 10:30 AM"
    const timeMatch = notes.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    return timeMatch ? timeMatch[1] : null;
  };

  const time = extractTime(item.notes);

  return (
    <TouchableOpacity
      style={[styles.weighInItem, isLatest && styles.weighInItemLatest]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.weighInLeft}>
        <View style={[styles.weighInDot, isLatest && styles.weighInDotLatest]} />
        <View>
          <Text style={styles.weighInDate}>{formattedDate}</Text>
          {time && <Text style={styles.weighInTime}>{time}</Text>}
          {isLatest && !time && <Text style={styles.weighInLatestBadge}>Latest</Text>}
        </View>
      </View>
      <View style={styles.weighInRight}>
        <Text style={[styles.weighInWeight, isLatest && styles.weighInWeightLatest]}>
          {item.kg.toFixed(1)} kg
        </Text>
        <View style={styles.weighInEditHint}>
          {isLatest && time && <Text style={styles.weighInLatestBadge}>Latest</Text>}
          <ChevronRight size={16} color={colors.text.muted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Weight Modal Component - supports both add and edit
function WeightModal({
  visible,
  onClose,
  onSave,
  onDelete,
  currentWeight,
  editingEntry,
  isSaving,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (weight: number, date: Date, notes?: string) => void;
  onDelete?: () => void;
  currentWeight?: number | null;
  editingEntry?: WeightPoint | null;
  isSaving: boolean;
}) {
  const [weightInput, setWeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use a ref to always have the latest date value (avoids stale closure issues)
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const isEditing = !!editingEntry;

  // Extract user notes without the time suffix
  const extractUserNotes = (notes?: string | null): string => {
    if (!notes) return '';
    // Remove time patterns like "(10:30 AM)" or "Logged at 10:30 AM"
    return notes
      .replace(/\s*\(\d{1,2}:\d{2}\s*(?:AM|PM)\)/i, '')
      .replace(/^Logged at \d{1,2}:\d{2}\s*(?:AM|PM)$/i, '')
      .trim();
  };

  // Store currentWeight in a ref so we can use it without it being a dependency
  const currentWeightRef = useRef(currentWeight);
  useEffect(() => {
    currentWeightRef.current = currentWeight;
  }, [currentWeight]);

  // Initialize form when modal opens - only run once per open
  // IMPORTANT: Only depend on visible and editingEntry to prevent re-initialization
  useEffect(() => {
    if (visible && !isInitialized) {
      if (editingEntry) {
        // Editing mode - populate from existing entry
        setWeightInput(editingEntry.kg.toFixed(1));
        setNotesInput(extractUserNotes(editingEntry.notes));
        // Use the user-selected date, fallback to created_at
        // Handle both ISO timestamp and YYYY-MM-DD formats
        let entryDate: Date;
        const dateStr = editingEntry.date || editingEntry.t;
        if (dateStr.includes('T')) {
          entryDate = new Date(dateStr);
        } else {
          entryDate = new Date(dateStr + 'T00:00:00');
        }
        // Try to extract and apply time from notes
        const timeMatch = editingEntry.notes?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const isPM = timeMatch[3].toUpperCase() === 'PM';
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
          entryDate.setHours(hours, minutes);
        }
        setSelectedDate(entryDate);
        selectedDateRef.current = entryDate; // Update ref immediately
      } else {
        // Add mode - use ref to get currentWeight without causing re-runs
        setWeightInput(currentWeightRef.current?.toFixed(1) || '');
        setNotesInput('');
        const now = new Date();
        setSelectedDate(now);
        selectedDateRef.current = now; // Update ref immediately
      }
      setIsInitialized(true);
    } else if (!visible && isInitialized) {
      // Reset when modal closes
      setIsInitialized(false);
    }
  }, [visible, isInitialized, editingEntry]); // Removed currentWeight from deps

  const handleSave = useCallback(() => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0 || weight > 500) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight between 0 and 500 kg');
      return;
    }
    onSave(weight, selectedDate, notesInput.trim() || undefined);
  }, [weightInput, selectedDate, notesInput, onSave]);

  const quickAdjust = (delta: number) => {
    const current = parseFloat(weightInput) || currentWeight || 70;
    setWeightInput((current + delta).toFixed(1));
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    // On Android, the picker auto-closes, so we handle it here
    // On iOS spinner, we keep it open and let the user press Done
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      // Keep the time from current ref value, only change the date
      const newDate = new Date(selectedDateRef.current);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(newDate);
      selectedDateRef.current = newDate; // Update ref immediately
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    // On Android, the picker auto-closes
    // On iOS spinner, we keep it open and let the user press Done
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      // Keep the date from current ref value, only change the time
      const newDate = new Date(selectedDateRef.current);
      newDate.setHours(date.getHours(), date.getMinutes());
      setSelectedDate(newDate);
      selectedDateRef.current = newDate; // Update ref immediately
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalBackdropTouch} onPress={onClose} activeOpacity={1} />
        </View>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Weight' : 'Log Weight'}</Text>
              <View style={styles.modalHeaderRight}>
                {isEditing && onDelete && (
                  <TouchableOpacity onPress={onDelete} style={styles.modalDeleteBtn}>
                    <Trash2 size={20} color={colors.semantic.error} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                  <X size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalBody}>
                <View style={styles.weightInputSection}>
                  <View style={styles.weightInputContainer}>
                    <TouchableOpacity
                      style={styles.weightAdjustBtn}
                      onPress={() => quickAdjust(-0.1)}
                    >
                      <Text style={styles.weightAdjustText}>-</Text>
                    </TouchableOpacity>

                    <View style={styles.weightInputWrapper}>
                      <TextInput
                        style={styles.weightInput}
                        value={weightInput}
                        onChangeText={setWeightInput}
                        keyboardType="decimal-pad"
                        placeholder="70.0"
                        placeholderTextColor={colors.text.muted}
                        maxLength={5}
                        selectTextOnFocus
                      />
                      <Text style={styles.weightInputUnit}>kg</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.weightAdjustBtn}
                      onPress={() => quickAdjust(0.1)}
                    >
                      <Text style={styles.weightAdjustText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.quickPresets}>
                    {[-1, -0.5, +0.5, +1].map((delta) => (
                      <TouchableOpacity
                        key={delta}
                        style={styles.presetBtn}
                        onPress={() => quickAdjust(delta)}
                      >
                        <Text style={styles.presetBtnText}>
                          {delta > 0 ? '+' : ''}{delta} kg
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Date and Time Selection */}
                <View style={styles.dateTimeSection}>
                  <Text style={styles.dateTimeLabel}>When did you weigh in?</Text>
                  <View style={styles.dateTimeRow}>
                    <TouchableOpacity
                      style={styles.dateTimeBtn}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Calendar size={18} color={colors.accent.primary} />
                      <Text style={styles.dateTimeBtnText}>{formatDate(selectedDate)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateTimeBtn}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Clock size={18} color={colors.accent.primary} />
                      <Text style={styles.dateTimeBtnText}>{formatTime(selectedDate)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showDatePicker && (
                  <View style={styles.pickerContainer}>
                    {Platform.OS === 'ios' && (
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      themeVariant="dark"
                    />
                  </View>
                )}

                {showTimePicker && (
                  <View style={styles.pickerContainer}>
                    {Platform.OS === 'ios' && (
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <DateTimePicker
                      value={selectedDate}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      themeVariant="dark"
                    />
                  </View>
                )}

                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes (optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={notesInput}
                    onChangeText={setNotesInput}
                    placeholder="Morning weigh-in, post workout, etc."
                    placeholderTextColor={colors.text.muted}
                    multiline
                    maxLength={200}
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={onClose}
                  disabled={isSaving}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, isSaving && styles.modalSaveBtnDisabled]}
                  onPress={handleSave}
                  disabled={isSaving || !weightInput}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.background.primary} />
                  ) : (
                    <>
                      <Check size={18} color={colors.background.primary} />
                      <Text style={styles.modalSaveBtnText}>{isEditing ? 'Update' : 'Save'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Legacy alias for compatibility
const AddWeightModal = WeightModal;

export default function WeightScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<ProgressKPIs | null>(null);
  const [weightData, setWeightData] = useState<WeightPoint[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightPoint | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const response = await fetchProgress('90d'); // Get 90 days for history
      if (response.ok) {
        setKpis(response.kpis);
        setWeightData(response.weight || []);
      }
    } catch (err) {
      console.error('Failed to load weight data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  const handleSaveWeight = async (weight: number, date: Date, notes?: string) => {
    setSavingWeight(true);
    try {
      // Format date as YYYY-MM-DD for the API (use local date, not UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Store the full datetime as ISO string in notes or a separate field
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const fullNotes = notes ? `${notes} (${timeStr})` : `Logged at ${timeStr}`;

      if (editingEntry) {
        // Update existing entry
        const result = await updateWeight(editingEntry.id, {
          weight_kg: weight,
          date: dateStr,
          notes: fullNotes,
        });
        if (result.ok) {
          setShowWeightModal(false);
          setEditingEntry(null);
          loadData(false);
          Alert.alert('Success', 'Weight updated successfully!');
        } else {
          Alert.alert('Error', result.error || 'Failed to update weight');
        }
      } else {
        // Add new entry
        const result = await logWeight({ weight_kg: weight, date: dateStr, notes: fullNotes });
        if (result.ok) {
          setShowWeightModal(false);
          loadData(false);
          Alert.alert('Success', 'Weight logged successfully!');
        } else {
          Alert.alert('Error', result.error || 'Failed to save weight');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save weight');
    } finally {
      setSavingWeight(false);
    }
  };

  const handleDeleteWeight = () => {
    if (!editingEntry) return;

    Alert.alert(
      'Delete Weight Entry',
      `Are you sure you want to delete this weigh-in (${editingEntry.kg.toFixed(1)} kg)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSavingWeight(true);
            try {
              const result = await deleteWeight(editingEntry.id);
              if (result.ok) {
                setShowWeightModal(false);
                setEditingEntry(null);
                loadData(false);
                Alert.alert('Success', 'Weight entry deleted');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete weight');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete weight');
            } finally {
              setSavingWeight(false);
            }
          },
        },
      ]
    );
  };

  const handleEditEntry = (entry: WeightPoint) => {
    setEditingEntry(entry);
    setShowWeightModal(true);
  };

  const handleAddNew = () => {
    setEditingEntry(null);
    setShowWeightModal(true);
  };

  const handleCloseModal = () => {
    setShowWeightModal(false);
    setEditingEntry(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(app)/progress')} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Weight</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Helper to get sortable date string
  const getSortDate = (item: WeightPoint) => item.date || item.t.split('T')[0];

  // Sort weight data by user-selected date descending, then by created_at for same date
  const sortedWeightData = [...weightData].sort((a, b) => {
    const dateCompare = getSortDate(b).localeCompare(getSortDate(a));
    if (dateCompare !== 0) return dateCompare;
    // Same date - sort by created_at (most recent first)
    return new Date(b.t).getTime() - new Date(a.t).getTime();
  });

  // Sort ascending for chart (by user-selected date, then created_at)
  const chartData = [...weightData].sort((a, b) => {
    const dateCompare = getSortDate(a).localeCompare(getSortDate(b));
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.t).getTime() - new Date(b.t).getTime();
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/progress')} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Weight</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddNew}
        >
          <Plus size={20} color={colors.background.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Stats */}
        <StatsCard kpis={kpis} weightData={weightData} />

        {/* Chart */}
        {chartData.length > 1 ? (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Weight Trend</Text>
            <WeightChart data={chartData} />
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Scale size={48} color={colors.text.muted} />
            <Text style={styles.emptyChartTitle}>Not enough data</Text>
            <Text style={styles.emptyChartText}>Log at least 2 weigh-ins to see your trend</Text>
          </View>
        )}

        {/* History List */}
        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <Text style={styles.sectionTitle}>History</Text>
            <Text style={styles.historyCount}>{weightData.length} entries</Text>
          </View>

          {sortedWeightData.length > 0 ? (
            <View style={styles.historyList}>
              {sortedWeightData.map((item, index) => (
                <WeighInItem
                  key={item.id}
                  item={item}
                  isLatest={index === 0}
                  onPress={() => handleEditEntry(item)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyHistory}>
              <Calendar size={32} color={colors.text.muted} />
              <Text style={styles.emptyHistoryText}>No weigh-ins yet</Text>
              <TouchableOpacity
                style={styles.emptyHistoryBtn}
                onPress={handleAddNew}
              >
                <Plus size={16} color={colors.background.primary} />
                <Text style={styles.emptyHistoryBtnText}>Log First Weight</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <WeightModal
        visible={showWeightModal}
        onClose={handleCloseModal}
        onSave={handleSaveWeight}
        onDelete={handleDeleteWeight}
        currentWeight={kpis?.weight.current}
        editingEntry={editingEntry}
        isSaving={savingWeight}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Stats
  statsContainer: {
    marginBottom: spacing.lg,
  },
  currentWeightCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(226, 241, 99, 0.2)',
  },
  currentWeightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  currentWeightLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  currentWeightValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  currentWeightNumber: {
    fontSize: 56,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  currentWeightUnit: {
    fontSize: typography.size.xl,
    color: colors.text.secondary,
  },
  currentWeightDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  currentWeightDeltaText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  // Chart
  chartSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  chartContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
  },
  emptyChart: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyChartTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptyChartText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // History
  historySection: {
    marginBottom: spacing.lg,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyCount: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  historyList: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  weighInItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  weighInItemLatest: {
    backgroundColor: `${colors.accent.primary}10`,
  },
  weighInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weighInDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text.muted,
  },
  weighInDotLatest: {
    backgroundColor: colors.accent.primary,
  },
  weighInDate: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  weighInTime: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  weighInRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weighInEditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weighInLatestBadge: {
    fontSize: typography.size.xs,
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },
  weighInWeight: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  weighInWeightLatest: {
    color: colors.accent.primary,
  },
  emptyHistory: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: typography.size.base,
    color: colors.text.muted,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  emptyHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  emptyHistoryBtnText: {
    fontSize: typography.size.base,
    color: colors.background.primary,
    fontWeight: typography.weight.semibold,
  },

  bottomPadding: {
    height: 100,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingBottom: spacing['3xl'],
    maxHeight: '85%',
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.secondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalDeleteBtn: {
    padding: spacing.xs,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  weightInputSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  weightAdjustBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  weightAdjustText: {
    fontSize: 28,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  weightInputWrapper: {
    alignItems: 'center',
  },
  weightInput: {
    fontSize: 56,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 150,
  },
  weightInputUnit: {
    fontSize: typography.size.lg,
    color: colors.text.muted,
    marginTop: -spacing.xs,
  },
  quickPresets: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  presetBtnText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  dateTimeSection: {
    marginBottom: spacing.lg,
  },
  dateTimeLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.weight.medium,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  dateTimeBtnText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  pickerContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  pickerDoneText: {
    fontSize: typography.size.base,
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },
  notesSection: {
    marginBottom: spacing.lg,
  },
  notesLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.weight.medium,
  },
  notesInput: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  modalCancelBtnText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
  },
  modalSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
  },
  modalSaveBtnDisabled: {
    opacity: 0.6,
  },
  modalSaveBtnText: {
    fontSize: typography.size.base,
    color: colors.background.primary,
    fontWeight: typography.weight.semibold,
  },
});
