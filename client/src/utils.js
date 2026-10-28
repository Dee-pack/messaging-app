// Group chats show their name; 1-to-1 chats show the other person
export function conversationTitle(conversation, me) {
    if (conversation.isGroup) return conversation.name || "Group chat";
    const other = conversation.participants.find((p) => p.id !== me.id);
    return other ? other.displayName || other.username : "Unknown user";
}
// Who to show an avatar for in the conversation list
export function conversationAvatarUser(conversation, me) {
    if (conversation.isGroup) return { displayName: conversation.name || "Group" };
    return conversation.participants.find((p) => p.id !== me.id) || {};
}