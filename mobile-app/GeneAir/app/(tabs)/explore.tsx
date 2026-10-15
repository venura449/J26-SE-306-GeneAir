import { useState, useRef } from 'react';
import {
  StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, View, Text
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
};

export default function ExploreScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! How can I help you today?', sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Theme colors extracted perfectly matching your UI design
  const APP_BG = '#F8F9FA';       // Soft light background from the image
  const NAVY_TEXT = '#1A2144';    // Deep navy blue used for headings and primary text
  const CARD_BG = '#FFFFFF';      // White used for the health overview cards
  const PRIMARY_BLUE = '#4258B8'; // Blue accent matching the profile icon 
  const GRAY_TEXT = '#7A8299';    // Muted color for secondary text/placeholders

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');

    // Simulate network delay and bot response
    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "This is a placeholder response. Connect your backend API here.",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 1000);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        <View style={[
          styles.messageBubble,
          isUser ? [styles.userBubble, { backgroundColor: PRIMARY_BLUE }] : styles.botBubble
        ]}>
          <Text style={{
            color: isUser ? '#FFFFFF' : NAVY_TEXT,
            fontSize: 15,
            lineHeight: 22,
          }}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: APP_BG }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 15}
      >
        <View style={styles.header}>
          <Text style={[styles.titleText, { color: NAVY_TEXT }]}>
            GeneAir Assistant
          </Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={[styles.inputContainer, { backgroundColor: APP_BG }]}>
          <TextInput
            style={[styles.input, { color: NAVY_TEXT, backgroundColor: CARD_BG }]}
            placeholder="Type your message..."
            placeholderTextColor={GRAY_TEXT}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: PRIMARY_BLUE }]}
            onPress={sendMessage}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 24,
    // Removed the bottom border to match the clean aesthetic of your other screens
  },
  titleText: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 4, // Gives a "chat tail" effect
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    // Soft shadow matching the health overview cards in your design
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginRight: 12,
    fontSize: 15,
    // Input shadow to match the card style
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4258B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
});