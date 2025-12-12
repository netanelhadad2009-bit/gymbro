import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, X, Plus } from 'lucide-react-native';
import { searchFoods } from '../../lib/api';
import type { FoodSearchResult } from '../../types/food-search';
import { colors, spacing, typography, borderRadius } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function FoodSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    recent: FoodSearchResult[];
    database: FoodSearchResult[];
  } | null>(null);
  const [recentFoods, setRecentFoods] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [addingFoodId, setAddingFoodId] = useState<string | null>(null);

  // Save food to user's personal food database
  const saveToUserFoods = useCallback(async (food: FoodSearchResult) => {
    if (!user) return;

    try {
      // Check if food already exists
      const { data: existing } = await supabase
        .from('user_foods')
        .select('id')
        .eq('user_id', user.id)
        .eq('name_he', food.name)
        .eq('brand', food.brand || '')
        .maybeSingle();

      if (existing) {
        // Food already exists, just update created_at to move to top of recent
        await supabase
          .from('user_foods')
          .update({ created_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Insert new food
        await supabase.from('user_foods').insert({
          user_id: user.id,
          name_he: food.name,
          brand: food.brand || null,
          serving_grams: 100,
          per_100g: {
            kcal: food.per100g.kcal,
            protein_g: food.per100g.protein_g,
            carbs_g: food.per100g.carbs_g,
            fat_g: food.per100g.fat_g,
          },
          is_verified: false,
        });
      }
    } catch (error) {
      console.error('[FoodSearch] Error saving to user_foods:', error);
    }
  }, [user]);

  // Load recent foods from user's personal food database
  const loadRecentFoods = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_foods')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Convert to FoodSearchResult format
        const recentResults: FoodSearchResult[] = data.map((userFood) => {
          const per100g = {
            kcal: userFood.per_100g.kcal || 0,
            protein_g: userFood.per_100g.protein_g || 0,
            carbs_g: userFood.per_100g.carbs_g || 0,
            fat_g: userFood.per_100g.fat_g || 0,
          };

          return {
            id: `user-food-${userFood.id}`,
            source: 'user' as const,
            name: userFood.name_he,
            brand: userFood.brand || undefined,
            per100g,
            servings: [
              {
                id: '100g',
                label: '100g',
                grams: 100,
                isDefault: true,
                nutrition: per100g,
              },
            ],
            defaultServing: '100g',
            lastUsed: userFood.created_at,
          };
        });

        setRecentFoods(recentResults);
      }
    } catch (error) {
      console.error('[FoodSearch] Error loading recent foods:', error);
    }
  }, [user]);

  // Load recent foods on mount and when screen comes into focus
  useEffect(() => {
    loadRecentFoods();
  }, [loadRecentFoods]);

  // Reload recent foods when returning from add-food screen
  useFocusEffect(
    useCallback(() => {
      loadRecentFoods();
    }, [loadRecentFoods])
  );

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchFoods(searchQuery);

      if (response.ok) {
        setResults(response.results);
      } else {
        setError('Search failed. Please try again.');
        setResults(null);
      }
    } catch (err) {
      setError('Search failed. Please try again.');
      setResults(null);
      console.error('[FoodSearch] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);

    // Clear previous timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      performSearch(text);
    }, 500); // 500ms debounce

    setDebounceTimeout(newTimeout);
  }, [debounceTimeout, performSearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  const handleSelectFood = useCallback((food: FoodSearchResult) => {
    // Navigate to add food sheet with food data
    router.push({
      pathname: '/(app)/add-food-from-search',
      params: { foodData: JSON.stringify(food) },
    });
  }, [router]);

  const handleQuickAdd = useCallback(async (food: FoodSearchResult, event: any) => {
    // Stop propagation to prevent navigating to detail page
    event?.stopPropagation?.();

    if (!user) {
      return;
    }

    setAddingFoodId(food.id);

    try {
      // Get default serving
      const defaultServing = food.servings.find(s => s.id === food.defaultServing) || food.servings[0];

      // Insert meal with default values
      const { error } = await supabase.from('meals').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        name: food.name,
        calories: defaultServing.nutrition.kcal,
        protein: Math.round(defaultServing.nutrition.protein_g),
        carbs: Math.round(defaultServing.nutrition.carbs_g),
        fat: Math.round(defaultServing.nutrition.fat_g),
        meal_type: 'snack', // Default meal type for quick add
        source: 'manual',
        portion_grams: defaultServing.grams,
        brand: food.brand || null,
      });

      if (error) throw error;

      // Save to user's personal food database
      await saveToUserFoods(food);

      // Success feedback
      console.log('[FoodSearch] Food added successfully');
      Alert.alert('Added!', `${food.name} has been added to your diary`);

      // Reload recent foods to include the newly added food
      loadRecentFoods();
    } catch (error) {
      console.error('[FoodSearch] Quick add error:', error);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    } finally {
      setAddingFoodId(null);
    }
  }, [user, loadRecentFoods, saveToUserFoods]);

  const renderFoodItem = useCallback(({ item, index, isRecent }: { item: FoodSearchResult; index: number; isRecent?: boolean }) => {
    const isAdding = addingFoodId === item.id;

    return (
      <TouchableOpacity
        style={[styles.foodItem, index === 0 && isRecent && styles.firstItem]}
        onPress={() => handleSelectFood(item)}
        activeOpacity={0.7}
        disabled={isAdding}
      >
        <View style={styles.foodInfo}>
          <Text style={styles.foodName} numberOfLines={2}>
            {item.name_he || item.name}
          </Text>
          <View style={styles.macrosRow}>
            <Text style={styles.foodMacros}>
              {item.per100g.kcal} cal
            </Text>
            <Text style={styles.macroDot}>•</Text>
            <Text style={styles.foodMacros}>
              {item.per100g.protein_g}g protein
            </Text>
            {item.isPartial && (
              <>
                <Text style={styles.macroDot}>•</Text>
                <Text style={styles.partialTag}>Partial Data</Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={(e) => handleQuickAdd(item, e)}
          disabled={isAdding}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          ) : (
            <Plus size={18} color={colors.accent.primary} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [handleSelectFood, handleQuickAdd, addingFoodId]);

  const allResults = results
    ? [...(results.recent || []).map(r => ({ ...r, isRecent: true })), ...results.database]
    : [];

  const hasRecent = results && results.recent && results.recent.length > 0;
  const hasDatabase = results && results.database && results.database.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(app)/nutrition')}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={colors.text.primary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>Search Foods</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.text.secondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a food..."
            placeholderTextColor={colors.text.placeholder}
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading && (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          )}
          {query.length > 0 && !loading && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {results && (hasRecent || hasDatabase) ? (
          <FlatList
            data={allResults}
            renderItem={({ item, index }) => {
              const isFirstRecent = hasRecent && index === 0;
              return renderFoodItem({ item, index, isRecent: (item as any).isRecent });
            }}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={() => (
              hasRecent ? (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>RECENT FOODS</Text>
                  <Text style={styles.sectionCount}>{results.recent?.length || 0}</Text>
                </View>
              ) : null
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              !loading && query.length >= 2 && (
                <View style={styles.emptyContainer}>
                  <Search size={48} color={colors.text.tertiary} strokeWidth={1.5} />
                  <Text style={styles.emptyText}>No foods found</Text>
                  <Text style={styles.emptySubtext}>
                    Try a different search term
                  </Text>
                </View>
              )
            )}
          />
        ) : !loading && query.length >= 2 ? (
          <View style={styles.emptyContainer}>
            <Search size={48} color={colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No foods found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search term
            </Text>
          </View>
        ) : !loading && query.length < 2 && recentFoods.length > 0 ? (
          <FlatList
            data={recentFoods}
            renderItem={({ item, index }) => renderFoodItem({ item, index, isRecent: true })}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={() => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT FOODS</Text>
                <Text style={styles.sectionCount}>{recentFoods.length}</Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : !loading && query.length < 2 ? (
          <View style={styles.placeholderContainer}>
            <Search size={56} color={colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.placeholderText}>
              Search for any food by name
            </Text>
            <Text style={styles.placeholderSubtext}>
              Search Israeli, US, and international food databases
            </Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
    padding: spacing.xs,
  },
  resultsList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  firstItem: {
    marginTop: 0,
  },
  separator: {
    height: spacing.sm,
  },
  foodInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  quickAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.accent.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.accent.primary}30`,
  },
  foodName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  foodMacros: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  macroDot: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  partialTag: {
    fontSize: typography.size.xs,
    color: colors.semantic.warning,
    fontWeight: typography.weight.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
  },
  emptyText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  placeholderText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: colors.semantic.errorLight,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.semantic.error,
  },
  errorText: {
    fontSize: typography.size.sm,
    color: colors.semantic.error,
    textAlign: 'center',
    fontWeight: typography.weight.medium,
  },
});
