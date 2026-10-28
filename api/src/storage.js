import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = process.env.SUPABASE_BUCKET;

// We pick the extension ourselves from the mimetype allowlist,
// never from the client's filename
export const EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

export async function uploadImage(file, folder) {
    // A unique path per upload also avoids stale cached images after a change
    const path = `${folder}/${Date.now()}-${randomUUID()}.${EXTENSIONS[file.mimetype]}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw error;

    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Best effort: removes a file we uploaded earlier, ignores anything else
export async function deleteImageByUrl(url) {
    if (!url) return;

    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.indexOf(marker);
    if (index === -1) return; // not one of ours, e.g. an old pasted URL

    const path = decodeURIComponent(url.slice(index + marker.length));
    try {
        await supabase.storage.from(bucket).remove([path]);
    } catch (err) {
        console.error("Could not delete old image", err);
    }
}