import { Tabs } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Map, TrendingUp, UtensilsCrossed, User, Bot } from 'lucide-react-native';
import { colors } from '../../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab bar dimensions
const TAB_BAR_HEIGHT = 80;
const FAB_SIZE = 64;

// Define which tabs to show in the tab bar (in order)
// Progress | Nutrition | Journey (center) | Coach | Profile
const VISIBLE_TABS = ['progress', 'nutrition', 'journey', 'coach', 'profile'];

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  // Hide tab bar on certain screens
  const currentRoute = state.routes[state.index];
  const hideTabBarScreens = ['food-search', 'add-food-from-search', 'equivalences', 'weight', 'coach'];

  if (hideTabBarScreens.includes(currentRoute.name)) {
    return null;
  }

  // Filter and sort routes to only show visible tabs in correct order
  const visibleRoutes = VISIBLE_TABS
    .map(name => state.routes.find((r: any) => r.name === name))
    .filter(Boolean);

  // Find the center route index for special handling
  const centerRoute = visibleRoutes.find((r: any) => r.name === 'journey');
  const leftRoutes = visibleRoutes.slice(0, 2); // profile, nutrition
  const rightRoutes = visibleRoutes.slice(3); // coach, progress

  const isCenterFocused = centerRoute && state.index === state.routes.indexOf(centerRoute);

  const handleCenterPress = () => {
    if (!centerRoute) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: centerRoute.key,
      canPreventDefault: true,
    });

    if (!isCenterFocused && !event.defaultPrevented) {
      navigation.navigate(centerRoute.name);
    }
  };

  const renderTabButton = (route: any) => {
    const isFocused = state.index === state.routes.indexOf(route);
    const iconColor = isFocused ? colors.accent.primary : 'rgba(255, 255, 255, 0.5)';
    const strokeWidth = isFocused ? 2.2 : 1.8;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const getIcon = () => {
      switch (route.name) {
        case 'profile':
          return <User size={22} color={iconColor} strokeWidth={strokeWidth} />;
        case 'nutrition':
          return <UtensilsCrossed size={22} color={iconColor} strokeWidth={strokeWidth} />;
        case 'coach':
          return <Bot size={22} color={iconColor} strokeWidth={strokeWidth} />;
        case 'progress':
          return <TrendingUp size={22} color={iconColor} strokeWidth={strokeWidth} />;
        default:
          return null;
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={styles.tabButton}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
          {getIcon()}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 0 }]}>
      <View style={styles.tabBarContainer}>
        {/* Tab buttons */}
        <View style={styles.tabButtonsRow}>
          {leftRoutes.map(renderTabButton)}

          <TouchableOpacity
            onPress={handleCenterPress}
            style={styles.centerButton}
            activeOpacity={0.8}
          >
            <View style={[styles.centerIconContainer, isCenterFocused && styles.centerIconContainerActive]}>
              <Map size={24} color={colors.background.primary} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          {rightRoutes.map(renderTabButton)}
        </View>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent.lime} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Add',
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      {/* Hidden screens - not shown in tab bar */}
      <Tabs.Screen
        name="workouts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="equivalences"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="food-search"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="add-food-from-search"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabBarContainer: {
    width: '95%',
    height: TAB_BAR_HEIGHT,
    backgroundColor: '#242529',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  tabButtonsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: -50,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(226, 241, 99, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(226, 241, 99, 0.3)',
  },
  centerIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  centerIconContainerActive: {
    transform: [{ scale: 1.05 }],
  },
});
