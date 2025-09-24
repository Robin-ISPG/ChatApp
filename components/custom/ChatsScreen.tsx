import { router } from 'expo-router';
import React from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { demoContacts } from '../../data/demoData';

export default function ChatsScreen() {
  const renderContact = ({ item }: { item: typeof demoContacts[0] }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.avatar}</Text>
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.lastMessageTime}>{item.lastMessageTime}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={demoContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        style={styles.contactsList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e1e5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#666666',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
