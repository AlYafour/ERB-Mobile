import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { apiClient } from '@/lib/api';
import { productsApi } from '@/lib/api/products';
import { Product } from '@/types';
import { Colors } from '@/constants/theme';

const C = Colors.light;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chips?: { product_name: string; quantity: number; unit?: string }[];
}

interface PRItem {
  product_id: number;
  product?: Product;
  quantity: number;
  unit: string;
  reason: string;
  notes: string;
  project_site: string;
}

export interface AIFormUpdate {
  project_id?: number;
  title?: string;
  required_by?: string;
  notes?: string;
}

interface Props {
  onAddItems: (items: PRItem[]) => void;
  onFormUpdate?: (fields: AIFormUpdate) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'مرحباً! أنا مساعدك الذكي للمشتريات.\n\nأخبرني باحتياجاتك وسأضيف المنتجات تلقائياً للطلب.',
};

export default function AIProcurementChat({ onAddItems, onFormUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    scrollToEnd();

    try {
      const history = updated.map((m) => ({ role: m.role, content: m.content }));
      const fd = new FormData();
      fd.append('messages', JSON.stringify(history));

      const response = await apiClient.postForm<{ reply: string; tool_use?: any }>('/ai/chat/', fd);

      if (response.error || !response.data) {
        throw new Error(response.error || 'No response');
      }

      const { reply, tool_use } = response.data;

      // Handle form field updates
      if (tool_use?.form && onFormUpdate) {
        const fields: AIFormUpdate = {};
        if (tool_use.form.project_id)   fields.project_id  = tool_use.form.project_id;
        if (tool_use.form.title)        fields.title       = tool_use.form.title;
        if (tool_use.form.required_by)  fields.required_by = tool_use.form.required_by;
        if (tool_use.form.notes)        fields.notes       = tool_use.form.notes;
        if (Object.keys(fields).length) onFormUpdate(fields);
      }

      // Handle product items
      let chips: ChatMessage['chips'] = undefined;
      if (tool_use?.items?.length) {
        chips = tool_use.items.map((it: any) => ({
          product_name: it.product_name || `Product #${it.product_id}`,
          quantity: it.quantity,
          unit: it.unit,
        }));

        const prItems: PRItem[] = [];
        for (const item of tool_use.items) {
          try {
            const product = await productsApi.getById(item.product_id);
            prItems.push({
              product_id: item.product_id, product,
              quantity: item.quantity,
              unit: item.unit || product.unit || '',
              reason: item.reason || '',
              notes: item.notes || '',
              project_site: item.project_site || '',
            });
          } catch {
            prItems.push({
              product_id: item.product_id,
              quantity: item.quantity,
              unit: item.unit || '',
              reason: item.reason || '',
              notes: item.notes || '',
              project_site: item.project_site || '',
            });
          }
        }
        onAddItems(prItems);
      }

      const content = tool_use?.message || reply || '✓ تم';
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + 'a', role: 'assistant', content, chips },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + 'e',
          role: 'assistant',
          content: `❌ ${err.message || 'حدث خطأ، حاول مرة أخرى.'}`,
        },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [messages, loading, onAddItems, onFormUpdate]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderMessage = ({ item: m }: { item: ChatMessage }) => {
    const isUser = m.role === 'user';
    return (
      <View style={[S.msgWrap, isUser ? S.msgWrapUser : S.msgWrapBot]}>
        {!isUser && (
          <View style={S.avatar}>
            <MaterialIcons name="auto-awesome" size={14} color={C.tint} />
          </View>
        )}
        <View style={[S.bubble, isUser ? S.bubbleUser : S.bubbleBot]}>
          <Text style={[S.bubbleText, isUser ? S.bubbleTextUser : S.bubbleTextBot]}>
            {m.content}
          </Text>
          {m.chips && m.chips.length > 0 && (
            <View style={S.chips}>
              {m.chips.map((chip, j) => (
                <View key={j} style={S.chip}>
                  <MaterialIcons name="check-circle" size={13} color="#059669" />
                  <Text style={S.chipText}>
                    {chip.product_name} × {chip.quantity}{chip.unit ? ` ${chip.unit}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── FAB (collapsed) ────────────────────────────────────────────────────────

  if (!open) {
    return (
      <TouchableOpacity style={S.fab} onPress={() => setOpen(true)} activeOpacity={0.82}>
        <View style={S.fabIcon}>
          <MaterialIcons name="auto-awesome" size={16} color="#fff" />
        </View>
        <View style={S.fabTexts}>
          <Text style={S.fabTitle}>AI Assistant</Text>
          <Text style={S.fabSub}>اطلب بالعربي أو الإنجليزي</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={C.tint} />
      </TouchableOpacity>
    );
  }

  // ── Full chat sheet ────────────────────────────────────────────────────────

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
      <View style={S.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <View style={S.sheet}>

            {/* Header */}
            <View style={S.header}>
              <View style={S.headerLeft}>
                <View style={S.headerIcon}>
                  <MaterialIcons name="auto-awesome" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={S.headerTitle}>
                    <Text style={S.headerTitleAI}>AI</Text>
                    {' '}Procurement Assistant
                  </Text>
                  <Text style={S.headerSub}>Claude · عربي / English</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10} style={S.headerClose}>
                <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              style={S.list}
              contentContainerStyle={S.listContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListFooterComponent={
                loading ? (
                  <View style={S.thinking}>
                    <ActivityIndicator size="small" color={C.tint} />
                    <Text style={S.thinkingText}>جاري التفكير…</Text>
                  </View>
                ) : null
              }
            />

            {/* Divider */}
            <View style={S.divider} />

            {/* Input row */}
            <View style={S.inputRow}>
              <TextInput
                ref={inputRef}
                style={S.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="اكتب احتياجاتك…"
                placeholderTextColor={C.textTertiary}
                multiline
                returnKeyType="default"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[S.sendBtn, (!input.trim() || loading) && S.sendBtnOff]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                activeOpacity={0.8}>
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <MaterialIcons name="send" size={19} color="#fff" />
                }
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // FAB
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  fabIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.tint,
    alignItems: 'center', justifyContent: 'center',
  },
  fabTexts: { flex: 1 },
  fabTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  fabSub: { fontSize: 12, color: C.textTertiary, marginTop: 1 },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '88%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 24,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: C.tint,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.tint,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  headerTitleAI: { color: C.tint },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  headerClose: { padding: 6, marginLeft: 8 },

  // Messages
  list: { maxHeight: 380 },
  listContent: { padding: 16, gap: 12 },

  msgWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgWrapUser: { justifyContent: 'flex-end' },
  msgWrapBot: { justifyContent: 'flex-start' },

  avatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(249,115,22,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 13, paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: C.tint,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextBot: { color: C.text },

  chips: { marginTop: 8, gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1, borderColor: '#6EE7B7',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#065F46', flex: 1 },

  thinking: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  thinkingText: { fontSize: 13, color: C.textTertiary, fontStyle: 'italic' },

  // Input
  divider: { height: 1, backgroundColor: C.borderLight },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    minHeight: 42, maxHeight: 110,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 11 : 8,
    paddingBottom: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 15, color: C.text,
    backgroundColor: '#F8FAFC',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: C.tint,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnOff: { backgroundColor: C.borderDark },
});
