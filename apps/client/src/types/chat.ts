// apps/client/src/types/chat.ts

export type ChatMessage = {
  id:        string;
  userId:    string;
  username:  string;
  guildTag:  string;
  content:   string;
  createdAt: string;
};

export type ChatChannel = "global" | "guild";
