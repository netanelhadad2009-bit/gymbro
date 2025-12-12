import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../../lib/theme';
import { ArrowUp, RefreshCw, ChevronLeft, Utensils, Dumbbell, Activity, Target } from 'lucide-react-native';

// Coach avatar component - 3D cartoon coach avatar
const CoachAvatar = () => (
  <Image
    source={require('../../assets/images/coach-avatar.png')}
    style={{
      width: 32,
      height: 32,
      borderRadius: 16,
    }}
  />
);

// User avatar component
const UserAvatar = () => (
  <Image
    source={require('../../assets/images/user-avatar.png')}
    style={{
      width: 32,
      height: 32,
      borderRadius: 16,
    }}
  />
);
import { sendCoachMessage, loadCoachMessages, CoachMessage } from '../../lib/api';
import { supabase } from '../../lib/supabase';

// Message interface for local state
interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'error';
  isOptimistic?: boolean;
  isStreaming?: boolean; // For typewriter effect
}

// Premium suggestion cards without emojis
const QUICK_SUGGESTIONS = [
  { text: 'What should I eat today?', icon: Utensils, gradient: ['#FF6B6B', '#FF8E53'] },
  { text: 'Create a workout plan', icon: Dumbbell, gradient: ['#4FACFE', '#00F2FE'] },
  { text: 'How much protein do I need?', icon: Target, gradient: ['#A8EB12', '#7DD56F'] },
  { text: 'Analyze my progress', icon: Activity, gradient: ['#667EEA', '#764BA2'] },
];

export default function CoachScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to chat with your coach');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('ai_messages')
        .select('id, role, content, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (fetchError) {
        console.error('[Coach] Load error:', fetchError);
        setError('Failed to load messages');
      } else {
        setMessages((data || []).map(m => ({
          ...m,
          status: 'sent' as const,
        })));
        setHasMore((data?.length || 0) >= 50);
      }
    } catch (err) {
      console.error('[Coach] Load error:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || sending) return;

    setInputText('');
    Keyboard.dismiss();

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: LocalMessage = {
      id: optimisticId,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
      status: 'sending',
      isOptimistic: true,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await sendCoachMessage(messageText);

      if (response.ok && response.assistantMessage) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== optimisticId);
          return [
            ...filtered,
            {
              id: response.userMessage?.id || optimisticId,
              role: 'user' as const,
              content: messageText,
              created_at: response.userMessage?.created_at || new Date().toISOString(),
              status: 'sent' as const,
            },
            {
              id: response.assistantMessage!.id,
              role: 'assistant' as const,
              content: response.assistantMessage!.content,
              created_at: response.assistantMessage!.created_at,
              status: 'sent' as const,
              isStreaming: true, // Enable typewriter effect for new messages
            },
          ];
        });

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === optimisticId ? { ...m, status: 'error' as const } : m
          )
        );
        setError(response.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('[Coach] Send error:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === optimisticId ? { ...m, status: 'error' as const } : m
        )
      );
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const retryMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
    sendMessage(message.content);
  };

  // Mark message streaming as complete
  const onStreamingComplete = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId ? { ...m, isStreaming: false } : m
      )
    );
  }, []);

  // Scroll during streaming
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const getDateSeparator = (dateStr: string) => {
    const msgDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const msgDateNorm = new Date(msgDate);
    msgDateNorm.setHours(0, 0, 0, 0);

    if (msgDateNorm.getTime() === today.getTime()) {
      return 'Today';
    } else if (msgDateNorm.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return msgDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== prevDate;
  };

  const renderMessage = ({ item, index }: { item: LocalMessage; index: number }) => {
    const isUser = item.role === 'user';
    const showDate = shouldShowDateSeparator(index);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {getDateSeparator(item.created_at)}
            </Text>
          </View>
        )}

        <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
          {!isUser && (
            <View style={styles.avatarContainer}>
              <CoachAvatar />
            </View>
          )}

          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
            {!isUser && item.isStreaming ? (
              <TypewriterText
                text={item.content}
                style={[styles.messageText, styles.assistantText]}
                onComplete={() => onStreamingComplete(item.id)}
                onProgress={scrollToBottom}
              />
            ) : (
              <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
                {item.content}
              </Text>
            )}

            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isUser ? styles.userTime : styles.assistantTime]}>
                {new Date(item.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>

              {isUser && item.status === 'sending' && (
                <ActivityIndicator size="small" color="rgba(0,0,0,0.4)" style={styles.statusIcon} />
              )}

              {isUser && item.status === 'error' && (
                <TouchableOpacity onPress={() => retryMessage(item.id)} style={styles.retryButton}>
                  <RefreshCw size={14} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isUser && (
            <View style={styles.avatarContainerUser}>
              <UserAvatar />
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {/* Minimal text-based hero */}
      <Text style={styles.heroGreeting}>Hey there</Text>
      <Text style={styles.heroTitle}>How can I help{'\n'}you today?</Text>

      <View style={styles.suggestionsContainer}>
        {QUICK_SUGGESTIONS.map((suggestion, index) => {
          const IconComponent = suggestion.icon;
          return (
            <TouchableOpacity
              key={index}
              style={styles.suggestionCard}
              onPress={() => sendMessage(suggestion.text)}
              disabled={sending}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionIconWrapper}>
                <LinearGradient
                  colors={suggestion.gradient as [string, string]}
                  style={styles.suggestionIconGradient}
                >
                  <IconComponent size={18} color="#FFF" strokeWidth={2} />
                </LinearGradient>
              </View>
              <Text style={styles.suggestionText}>{suggestion.text}</Text>
              <ChevronLeft size={16} color="rgba(255,255,255,0.3)" style={styles.suggestionArrow} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderTypingIndicator = () => (
    <View style={[styles.messageRow, styles.messageRowAssistant]}>
      <View style={styles.avatarContainer}>
        <CoachAvatar />
      </View>
      <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <TypingDot delay={0} />
          <TypingDot delay={200} />
          <TypingDot delay={400} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Coach</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        ) : error && messages.length === 0 ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryFullButton} onPress={loadMessages}>
              <RefreshCw size={18} color={colors.text.primary} />
              <Text style={styles.retryFullText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.messageList,
              messages.length === 0 && styles.messageListEmpty,
            ]}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={sending ? renderTypingIndicator : null}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Premium Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Message your coach..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              returnKeyType="default"
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <ArrowUp size={20} color="#000" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Animated typing dot
const TypingDot = ({ delay }: { delay: number }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.typingDot, { opacity }]} />
  );
};

// Typewriter effect for streaming text
const TypewriterText = ({
  text,
  style,
  onComplete,
  onProgress,
  speed = 12, // ms per character chunk
}: {
  text: string;
  style?: any;
  onComplete?: () => void;
  onProgress?: () => void;
  speed?: number;
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);

  // Update refs without triggering re-render
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onProgressRef.current = onProgress;
  }, [onComplete, onProgress]);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    indexRef.current = 0;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        // Add characters in chunks for smoother feel
        const chunkSize = Math.min(4, text.length - indexRef.current);
        const nextChunk = text.slice(indexRef.current, indexRef.current + chunkSize);
        setDisplayedText(prev => prev + nextChunk);
        indexRef.current += chunkSize;

        // Trigger scroll every ~20 characters
        if (indexRef.current % 20 < chunkSize) {
          onProgressRef.current?.();
        }
      } else {
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <Text style={style}>{displayedText}</Text>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorText: {
    fontSize: typography.size.base,
    color: colors.semantic.error,
    textAlign: 'center',
  },
  retryFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: 12,
  },
  retryFullText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: '500',
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageListEmpty: {
    flex: 1,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: spacing.sm,
    marginTop: 4,
  },
  avatarContainerUser: {
    marginLeft: spacing.sm,
    marginTop: 4,
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: colors.accent.primary,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 6,
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#000',
  },
  assistantText: {
    color: colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  userTime: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  assistantTime: {
    color: 'rgba(255,255,255,0.4)',
  },
  statusIcon: {
    marginLeft: 4,
  },
  retryButton: {
    padding: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  heroGreeting: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.accent.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 48,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  suggestionIconWrapper: {
    marginRight: 14,
  },
  suggestionIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  suggestionArrow: {
    transform: [{ rotate: '180deg' }],
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.lg,
    backgroundColor: colors.background.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    maxHeight: 120,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(168, 235, 18, 0.2)',
  },
});
