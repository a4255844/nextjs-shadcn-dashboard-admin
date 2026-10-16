"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  profileFormSchema,
  validateProfileForm,
} from "@/lib/validations/profile";
import { z } from "zod";

export type ProfileFormInput = z.input<typeof profileFormSchema>;

export type ProfileField = "firstName" | "lastName" | "avatar";

export type ProfileFieldErrorCode =
  | "required"
  | "tooLong"
  | "invalidAvatar"
  | "uploadFailed";

export type ProfileResult =
  | { ok: true }
  | { ok: false; fieldErrors: Partial<Record<ProfileField, ProfileFieldErrorCode>> };

function isOwnedAvatarUrl(candidate: string, userId: string): boolean {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const prefix = `/storage/v1/object/public/user-avatars/${userId}/`;
    if (!url.pathname.startsWith(prefix)) return false;
    const rest = url.pathname.slice(prefix.length);
    return rest.length > 0 && !rest.includes("/");
  } catch {
    return false;
  }
}

/** 服务端信任边界校验：zod schema + avatar URL 归属检查 */
function validateProfileInput(
  raw: ProfileFormInput,
  userId: string,
):
  | { ok: true; input: { firstName: string; lastName: string; avatarUrl: string | null } }
  | { ok: false; fieldErrors: Partial<Record<ProfileField, ProfileFieldErrorCode>> } {
  const result = validateProfileForm(raw);
  if (!result.ok) {
    return { ok: false, fieldErrors: result.fieldErrors as Partial<Record<ProfileField, ProfileFieldErrorCode>> };
  }

  let avatarUrl: string | null = null;
  const avatarRaw = result.data.avatarUrl.trim();
  if (avatarRaw !== "") {
    if (isOwnedAvatarUrl(avatarRaw, userId)) {
      avatarUrl = avatarRaw;
    } else {
      return { ok: false, fieldErrors: { avatar: "invalidAvatar" } };
    }
  }

  return { ok: true, input: { firstName: result.data.firstName, lastName: result.data.lastName, avatarUrl } };
}

export async function updateMyProfile(raw: ProfileFormInput): Promise<ProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return { ok: false, fieldErrors: { avatar: "uploadFailed" } };

  const parsed = validateProfileInput(raw, user.id);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.input.firstName,
      last_name: parsed.input.lastName,
      avatar_url: parsed.input.avatarUrl,
    })
    .eq("id", user.id);

  if (error !== null) {
    return { ok: false, fieldErrors: { avatar: "uploadFailed" } };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export type UserAvatarUploadResult =
  | { ok: true; url: string }
  | { ok: false; errorCode: "invalidType" | "tooLarge" | "uploadFailed" };

const AVATAR_MAX_BYTES = 1024 * 1024;
const AVATAR_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

export async function uploadUserAvatar(formData: FormData): Promise<UserAvatarUploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, errorCode: "invalidType" };
  }
  if (!AVATAR_TYPES.includes(file.type)) {
    return { ok: false, errorCode: "invalidType" };
  }
  if (file.size === 0 || file.size > AVATAR_MAX_BYTES) {
    return { ok: false, errorCode: "tooLarge" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    return { ok: false, errorCode: "uploadFailed" };
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const { error } = await supabase.storage.from("user-avatars").upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error !== null) {
      return { ok: false, errorCode: "uploadFailed" };
    }
    const { data } = supabase.storage.from("user-avatars").getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch {
    return { ok: false, errorCode: "uploadFailed" };
  }
}
