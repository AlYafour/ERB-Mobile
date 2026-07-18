import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Modal, ActivityIndicator, Animated,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { apiClient } from '@/lib/api';
import { productsApi } from '@/lib/api/products';
import { Product } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Palette = typeof Colors.light | typeof Colors.dark;

// ─── Types ────────────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'recording' | 'thinking' | 'speaking';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chips?: { product_name: string; quantity: number; unit?: string }[];
  imageUri?: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'مرحباً! أنا مساعدك الذكي للمشتريات.\n\nيمكنك الكتابة أو الضغط على 🎙 للكلام أو 📎 لإرسال صورة.',
};

const VC: Record<VoiceState, string> = {
  idle: Colors.light.tint, recording: '#ef4444', thinking: '#f97316', speaking: '#3b82f6',
};

const VL: Record<VoiceState, string> = {
  idle: '', recording: 'يسجل… تكلم الآن', thinking: 'يعالج…', speaking: 'يتكلم…',
};

const VI: Record<VoiceState, keyof typeof MaterialIcons.glyphMap> = {
  idle: 'mic', recording: 'stop', thinking: 'hourglass-empty', speaking: 'volume-up',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIProcurementChat({ onAddItems, onFormUpdate }: Props) {
  const C = Colors[useColorScheme() ?? 'light'];
  const S = useMemo(() => makeStyles(C), [C]);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');

  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation while recording
  useEffect(() => {
    if (voiceState === 'recording') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.28, duration: 550, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [voiceState, pulseAnim]);

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

  // ── TTS via expo-speech ───────────────────────────────────────────────────

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    Speech.stop();
    const isAr = /[؀-ۿ]/.test(text);
    setVoiceState('speaking');
    Speech.speak(text, {
      language: isAr ? 'ar-SA' : 'en-US',
      rate: 0.9,
      onDone: () => setVoiceState('idle'),
      onError: () => setVoiceState('idle'),
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setVoiceState('idle');
  }, []);

  // ── Core send ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string, isVoice = false) => {
    const trimmed = text.trim();
    if (!trimmed && !imageUri) return;
    if (loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      imageUri: imageUri || undefined,
    };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    setInput('');
    const sentImage = imageUri;
    const sentMime = imageMime;
    setImageUri(null);
    setLoading(true);
    scrollToEnd();

    try {
      const history = updated.map((m) => ({ role: m.role, content: m.content }));
      const fd = new FormData();
      fd.append('messages', JSON.stringify(history));
      if (sentImage) {
        fd.append('image', { uri: sentImage, type: sentMime, name: 'image.jpg' } as any);
      }

      const response = await apiClient.postForm<{
        reply: string;
        tool_use?: any;
        spoken_reply?: string;
      }>('/ai/chat/', fd);

      if (response.error || !response.data) throw new Error(response.error || 'No response');

      const { reply, tool_use, spoken_reply } = response.data;

      if (tool_use?.form && onFormUpdate) {
        const fields: AIFormUpdate = {};
        if (tool_use.form.project_id)   fields.project_id  = tool_use.form.project_id;
        if (tool_use.form.title)        fields.title       = tool_use.form.title;
        if (tool_use.form.required_by)  fields.required_by = tool_use.form.required_by;
        if (tool_use.form.notes)        fields.notes       = tool_use.form.notes;
        if (Object.keys(fields).length) onFormUpdate(fields);
      }

      let chips: ChatMessage['chips'];
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
      setLoading(false);
      scrollToEnd();

      if (isVoice) speak(spoken_reply || content);
      else setVoiceState('idle');
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + 'e', role: 'assistant', content: `❌ ${err.message || 'حدث خطأ، حاول مرة أخرى.'}` },
      ]);
      setLoading(false);
      setVoiceState('idle');
      scrollToEnd();
    }
  }, [loading, imageUri, imageMime, onAddItems, onFormUpdate, speak]);

  // Stable ref so stopRecording can call the latest sendMessage
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // ── Voice recording ───────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('يجب السماح بالوصول للمايك لاستخدام الصوت');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setVoiceState('recording');
    } catch (e) {
      console.warn('Recording failed to start:', e);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setVoiceState('thinking');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) { setVoiceState('idle'); return; }

      const fd = new FormData();
      fd.append('audio', { uri, type: 'audio/m4a', name: 'recording.m4a' } as any);
      const resp = await apiClient.postForm<{ text: string }>('/ai/transcribe/', fd);

      if (resp.data?.text?.trim()) {
        await sendMessageRef.current(resp.data.text.trim(), true);
      } else {
        setVoiceState('idle');
      }
    } catch {
      setVoiceState('idle');
    }
  }, []);

  const toggleVoice = useCallback(() => {
    if (voiceState === 'recording')  stopRecording();
    else if (voiceState === 'speaking') stopSpeaking();
    else if (voiceState === 'idle')  startRecording();
    // 'thinking' → ignore tap (processing in progress)
  }, [voiceState, startRecording, stopRecording, stopSpeaking]);

  // ── Image picker ──────────────────────────────────────────────────────────

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { alert('يجب السماح بالوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageMime(asset.mimeType || 'image/jpeg');
    }
  }, []);

  // ── Close / cleanup ───────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    Speech.stop();
    setVoiceState('idle');
    setOpen(false);
  }, []);

  // ── Render helpers ────────────────────────────────────────────────────────

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
          {!!m.imageUri && (
            <Image source={{ uri: m.imageUri }} style={S.bubbleImage} resizeMode="cover" />
          )}
          {!!m.content && (
            <Text style={[S.bubbleText, isUser ? S.bubbleTextUser : S.bubbleTextBot]}>
              {m.content}
            </Text>
          )}
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

  // ── FAB (collapsed) ───────────────────────────────────────────────────────

  if (!open) {
    return (
      <TouchableOpacity style={S.fab} onPress={() => setOpen(true)} activeOpacity={0.82}>
        <View style={S.fabIcon}>
          <MaterialIcons name="auto-awesome" size={16} color="#fff" />
        </View>
        <View style={S.fabTexts}>
          <Text style={S.fabTitle}>AI Assistant</Text>
          <Text style={S.fabSub}>اكتب أو تكلم أو أرسل صورة</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={C.tint} />
      </TouchableOpacity>
    );
  }

  // ── Full chat sheet ───────────────────────────────────────────────────────

  const vColor = VC[voiceState];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <View style={S.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />

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
            <TouchableOpacity onPress={handleClose} hitSlop={10} style={S.headerClose}>
              <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* Voice state banner */}
          {voiceState !== 'idle' && (
            <View style={[S.voiceBanner, { backgroundColor: vColor + '18', borderBottomColor: vColor }]}>
              <Animated.View style={[S.voiceDot, { backgroundColor: vColor, transform: [{ scale: pulseAnim }] }]}>
                <MaterialIcons name={VI[voiceState]} size={13} color="#fff" />
              </Animated.View>
              <Text style={[S.voiceLabel, { color: vColor }]}>{VL[voiceState]}</Text>
              {(voiceState === 'recording' || voiceState === 'speaking') && (
                <TouchableOpacity
                  style={[S.voiceStop, { backgroundColor: vColor }]}
                  onPress={() => voiceState === 'recording' ? stopRecording() : stopSpeaking()}>
                  <Text style={S.voiceStopText}>إيقاف</Text>
                </TouchableOpacity>
              )}
              {voiceState === 'thinking' && (
                <ActivityIndicator size="small" color={vColor} style={{ marginLeft: 'auto' }} />
              )}
            </View>
          )}

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

          <View style={S.divider} />

          {/* Image preview */}
          {imageUri && (
            <View style={S.imgPreviewWrap}>
              <Image source={{ uri: imageUri }} style={S.imgPreview} resizeMode="cover" />
              <TouchableOpacity style={S.imgRemoveBtn} onPress={() => setImageUri(null)}>
                <MaterialIcons name="cancel" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input row — KAV only here, not around the whole sheet */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={S.inputRow}>

              {/* Image attach */}
              <TouchableOpacity style={S.iconBtn} onPress={pickImage} activeOpacity={0.7}>
                <MaterialIcons name="attach-file" size={21} color={imageUri ? C.tint : C.textTertiary} />
              </TouchableOpacity>

              {/* Text input */}
              <TextInput
                ref={inputRef}
                style={S.textInput}
                value={input}
                onChangeText={setInput}
                placeholder={voiceState === 'recording' ? 'يسجل… تكلم الآن' : 'اكتب احتياجاتك…'}
                placeholderTextColor={C.textTertiary}
                multiline
                returnKeyType="default"
                blurOnSubmit={false}
              />

              {/* Mic button */}
              <Animated.View style={{ transform: [{ scale: voiceState === 'recording' ? pulseAnim : 1 }] }}>
                <TouchableOpacity
                  style={[S.micBtn, { backgroundColor: voiceState === 'idle' ? C.borderDark : vColor }]}
                  onPress={toggleVoice}
                  disabled={voiceState === 'thinking'}
                  activeOpacity={0.8}>
                  <MaterialIcons name={VI[voiceState]} size={18} color="#fff" />
                </TouchableOpacity>
              </Animated.View>

              {/* Send */}
              <TouchableOpacity
                style={[S.sendBtn, ((!input.trim() && !imageUri) || loading) && S.sendBtnOff]}
                onPress={() => sendMessage(input)}
                disabled={(!input.trim() && !imageUri) || loading}
                activeOpacity={0.8}>
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <MaterialIcons name="send" size={19} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (C: Palette) => StyleSheet.create({
  // FAB
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, padding: 12, marginBottom: 16,
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '88%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 24,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: C.tint,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
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

  // Voice banner
  voiceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1.5,
  },
  voiceDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  voiceLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  voiceStop: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  voiceStopText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Messages
  list: { maxHeight: 340 },
  listContent: { padding: 16, gap: 12 },
  msgWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgWrapUser: { justifyContent: 'flex-end' },
  msgWrapBot: { justifyContent: 'flex-start' },
  avatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(249,115,22,0.12)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16 },
  bubbleUser: { backgroundColor: C.tint, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextBot: { color: C.text },
  bubbleImage: { width: 180, height: 120, borderRadius: 8, marginBottom: 6 },

  chips: { marginTop: 8, gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#6EE7B7',
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
  imgPreviewWrap: {
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  imgPreview: { width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  imgRemoveBtn: { position: 'absolute', top: 2, left: 70 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    paddingHorizontal: 10, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    backgroundColor: '#fff',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 9,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  textInput: {
    flex: 1, minHeight: 42, maxHeight: 110,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 11 : 8,
    paddingBottom: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 15, color: C.text, backgroundColor: '#F8FAFC',
  },
  micBtn: {
    width: 38, height: 38, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: C.tint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sendBtnOff: { backgroundColor: C.borderDark },
});
