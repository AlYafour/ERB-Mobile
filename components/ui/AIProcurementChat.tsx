import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { apiClient } from '@/lib/api';
import { productsApi } from '@/lib/api/products';
import { Product } from '@/types';
import { Colors } from '@/constants/theme';

const C = Colors.light;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  items?: AddedItem[];
}

interface AddedItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit?: string;
  reason?: string;
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

const INITIAL: ChatMessage = {
  role: 'assistant',
  content: 'مرحباً! أنا مساعدك الذكي للمشتريات.\n\nأخبرني باحتياجاتك وسأضيف المنتجات تلقائياً.',
};

export default function AIProcurementChat({ onAddItems, onFormUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history = newMessages.map((m) => ({ role: m.role, content: m.content }));
      const fd = new FormData();
      fd.append('messages', JSON.stringify(history));
      const response = await apiClient.postForm<{ reply: string; tool_use?: any }>('/ai/chat/', fd);

      if (!response.data) throw new Error('No response from AI');
      const { reply, tool_use } = response.data;

      if (tool_use?.form && onFormUpdate) {
        const fields: AIFormUpdate = {};
        if (tool_use.form.project_id)  fields.project_id  = tool_use.form.project_id;
        if (tool_use.form.title)       fields.title       = tool_use.form.title;
        if (tool_use.form.required_by) fields.required_by = tool_use.form.required_by;
        if (tool_use.form.notes)       fields.notes       = tool_use.form.notes;
        if (Object.keys(fields).length) onFormUpdate(fields);
      }

      let addedItems: AddedItem[] = [];
      if (tool_use?.items?.length) {
        addedItems = tool_use.items;
        const prItems: PRItem[] = [];
        for (const item of tool_use.items) {
          try {
            const product = await productsApi.getById(item.product_id);
            prItems.push({
              product_id: item.product_id, product,
              quantity: item.quantity, unit: item.unit || product.unit || '',
              reason: item.reason || '', notes: item.notes || '', project_site: item.project_site || '',
            });
          } catch {
            prItems.push({
              product_id: item.product_id,
              quantity: item.quantity, unit: item.unit || '',
              reason: item.reason || '', notes: item.notes || '', project_site: item.project_site || '',
            });
          }
        }
        onAddItems(prItems);
      }

      const assistantText = tool_use?.message || reply || '✓ تم';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantText, items: addedItems.length ? addedItems : undefined }]);
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ في الاتصال، حاول مرة أخرى.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading, onAddItems, onFormUpdate]);

  const renderMessage = ({ item: m }: { item: ChatMessage }) => (
    <View style={[S.msgRow, m.role === 'user' ? S.msgRowUser : S.msgRowAssistant]}>
      {m.role === 'assistant' && (
        <View style={S.avatar}>
          <Text style={{ fontSize: 14 }}>🤖</Text>
        </View>
      )}
      <View style={{ flex: 1, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
        <View style={[S.bubble, m.role === 'user' ? S.bubbleUser : S.bubbleAssistant]}>
          <Text style={[S.bubbleText, m.role === 'user' && { color: '#fff' }]}>{m.content}</Text>
        </View>
        {m.items && m.items.length > 0 && (
          <View style={S.itemChips}>
            {m.items.map((it, j) => (
              <View key={j} style={S.itemChip}>
                <Text style={S.itemChipText}>✓ {it.product_name} × {it.quantity}{it.unit ? ` ${it.unit}` : ''}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  if (!open) {
    return (
      <TouchableOpacity style={S.fab} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={S.fabAi}>AI</Text>
        <Text style={S.fabLabel}>مساعد المشتريات</Text>
        <MaterialIcons name="chat" size={16} color={C.tint} />
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={S.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <View style={S.sheet}>

            {/* Header */}
            <View style={S.header}>
              <View style={S.headerLeft}>
                <View style={S.botIcon}><Text style={{ fontSize: 18 }}>🤖</Text></View>
                <View>
                  <Text style={S.headerTitle}><Text style={{ color: C.tint }}>AI</Text> Procurement Assistant</Text>
                  <Text style={S.headerSub}>Claude · عربي / English</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderMessage}
              style={S.list}
              contentContainerStyle={S.listContent}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListFooterComponent={loading ? (
                <View style={S.thinkingRow}>
                  <ActivityIndicator size="small" color={C.tint} />
                  <Text style={S.thinkingText}>جاري التفكير…</Text>
                </View>
              ) : null}
            />

            {/* Input */}
            <View style={S.inputRow}>
              <TextInput
                style={S.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="اكتب احتياجاتك…"
                placeholderTextColor={C.textTertiary}
                multiline
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => sendMessage(input)}
              />
              <TouchableOpacity
                style={[S.sendBtn, (!input.trim() || loading) && S.sendBtnDisabled]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                activeOpacity={0.8}>
                <MaterialIcons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: C.border,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  fabAi: { fontSize: 13, fontWeight: '800', color: C.tint },
  fabLabel: { fontSize: 13, fontWeight: '600', color: C.text, flex: 1 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomWidth: 2, borderBottomColor: C.tint,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(249,115,22,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },

  list: { maxHeight: 380 },
  listContent: { padding: 14, gap: 10 },

  msgRow: { flexDirection: 'row', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleUser: {
    backgroundColor: C.tint,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: '#1E293B' },
  itemChips: { marginTop: 6, gap: 4, alignItems: 'flex-start' },
  itemChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, backgroundColor: '#D1FAE5',
    borderWidth: 1, borderColor: '#6EE7B7',
  },
  itemChipText: { fontSize: 12, fontWeight: '600', color: '#065F46' },

  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  thinkingText: { fontSize: 13, color: C.textSecondary, fontStyle: 'italic' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 100,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: C.text, backgroundColor: '#fff',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.tint,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.border },
});
