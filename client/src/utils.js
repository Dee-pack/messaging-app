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

// Shrinks an image so its longest side is at most maxSize, re-encoded as JPEG
export async function resizeToJpeg(file, maxSize = 512) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // JPEG has no transparency; avoid black backgrounds on PNGs
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))),
            "image/jpeg",
            0.85
        );
    });
}