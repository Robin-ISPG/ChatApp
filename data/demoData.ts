export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
  isUser: boolean;
  type: 'text' | 'voice';
  voiceDuration?: number;
  recordingUri?: string | null;
}

export interface Chat {
  contactId: string;
  contact: Contact;
  messages: ChatMessage[];
}

export const demoContacts: Contact[] = [
  {
    id: '1',
    name: 'John Doe',
    avatar: '👨‍💼',
    lastMessage: 'Hey, how are you doing?',
    lastMessageTime: '2:30 PM',
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    avatar: '👩‍💻',
    lastMessage: 'Thanks for the help yesterday!',
    lastMessageTime: '1:15 PM',
    unreadCount: 0,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    avatar: '👨‍🎨',
    lastMessage: 'See you at the meeting',
    lastMessageTime: '11:45 AM',
    unreadCount: 1,
  },
  {
    id: '4',
    name: 'Emily Davis',
    avatar: '👩‍🏫',
    lastMessage: 'The project looks great!',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
  },
  {
    id: '5',
    name: 'David Brown',
    avatar: '👨‍🔬',
    lastMessage: 'Can we reschedule?',
    lastMessageTime: 'Yesterday',
    unreadCount: 3,
  },
];

export const demoChats: Chat[] = [
  {
    contactId: '1',
    contact: demoContacts[0],
    messages: [
      {
        id: '1',
        text: 'Hey there! How are you doing?',
        timestamp: '2:25 PM',
        isUser: false,
        type: 'text',
      },
      {
        id: '2',
        text: "I'm doing great! Thanks for asking. How about you?",
        timestamp: '2:26 PM',
        isUser: true,
        type: 'text',
      },
      {
        id: '3',
        text: 'Pretty good! Just working on some new projects.',
        timestamp: '2:28 PM',
        isUser: false,
        type: 'text',
      },
      {
        id: '4',
        text: 'That sounds exciting! What kind of projects?',
        timestamp: '2:30 PM',
        isUser: true,
        type: 'text',
      },
    ],
  },
  {
    contactId: '2',
    contact: demoContacts[1],
    messages: [
      {
        id: '1',
        text: 'Hi Sarah!',
        timestamp: '1:10 PM',
        isUser: true,
        type: 'text',
      },
      {
        id: '2',
        text: 'Thanks for the help yesterday!',
        timestamp: '1:15 PM',
        isUser: false,
        type: 'text',
      },
    ],
  },
  {
    contactId: '3',
    contact: demoContacts[2],
    messages: [
      {
        id: '1',
        text: 'See you at the meeting',
        timestamp: '11:45 AM',
        isUser: false,
        type: 'text',
      },
    ],
  },
  {
    contactId: '4',
    contact: demoContacts[3],
    messages: [
      {
        id: '1',
        text: 'The project looks great!',
        timestamp: 'Yesterday',
        isUser: false,
        type: 'text',
      },
    ],
  },
  {
    contactId: '5',
    contact: demoContacts[4],
    messages: [
      {
        id: '1',
        text: 'Can we reschedule?',
        timestamp: 'Yesterday',
        isUser: false,
        type: 'text',
      },
    ],
  },
];
