import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#cccccc" />
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a group to start chatting with multiple people
          </Text>
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
