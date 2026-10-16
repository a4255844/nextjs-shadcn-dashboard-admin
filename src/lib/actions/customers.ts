"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  deleteCustomer,
  insertCustomer,
  patchCustomer,
  type CustomerWriteInput,
} from "@/lib/api/customers";
import { toErrorCode } from "@/lib/actions/rpc-errors";
import {
  customerFormSchema,
  validateCustomerForm,
} from "@/lib/validations/customer";
import { z } from "zod";

// 客户端表单提交的精确形状（服务端信任边界入口；全部为字符串，
// 因为来自表单控件，由 customerFormSchema 做运行时校验与转换）
export type CustomerFormInput = z.input<typeof customerFormSchema>;

// 可写字段（与表单控件一一对应）
export type CustomerField =
  | "name"
  | "email"
  | "company"
  | "status"
  | "spent"
  | "avatar";

// 字段级校验错误：value 为 i18n key 后缀（form.errors.<code>）
// duplicateEmail 由 DB unique(org_id, email) 冲突（23505）语义化映射而来；
// invalidType/tooLarge/uploadFailed 为头像上传流专用（客户端预检与上传 action 共用）
export type CustomerFieldErrorCode =
  | "required"
  | "tooLong"
  | "invalidEmail"
  | "invalidStatus"
  | "invalidSpent"
  | "duplicateEmail"
  | "invalidAvatar"
  | "invalidType"
  | "tooLarge"
  | "uploadFailed";

// 服务端整体错误码（DB/权限类）
export type CustomerErrorCode =
  | "duplicate_email"
  | "not_found"
  | "forbidden"
  | "network";

const KNOWN_ERROR_CODES = [
  "duplicate_email",
  "not_found",
  "forbidden",
  "network",
] as const;

export type CustomerResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors?: Partial<Record<CustomerField, CustomerFieldErrorCode>>;
      errorCode?: CustomerErrorCode;
    };

// 头像 URL 归属校验：必须指向本项目 customer-avatars 公开桶、
// 且位于调用者所属组织的 folder 下（与 0007 的 storage policy 路径约定一致，
// 单段文件名，防路径穿越）。URL 本身由 uploadCustomerAvatar 产出，
// 此处校验的是"提交值没有被客户端换成任意 URL"。
function isOwnedAvatarUrl(candidate: string, orgId: string): boolean {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const prefix = `/storage/v1/object/public/customer-avatars/${orgId}/`;
    if (!url.pathname.startsWith(prefix)) return false;
    const rest = url.pathname.slice(prefix.length);
    return rest.length > 0 && !rest.includes("/");
  } catch {
    return false;
  }
}

/** 服务端信任边界校验：zod schema + avatar URL 归属检查 */
function validateCustomerInput(
  raw: CustomerFormInput,
  orgId: string,
):
  | { ok: true; input: CustomerWriteInput }
  | { ok: false; fieldErrors: Partial<Record<CustomerField, CustomerFieldErrorCode>> } {
  const result = validateCustomerForm(raw);
  if (!result.ok) {
    return { ok: false, fieldErrors: result.fieldErrors as Partial<Record<CustomerField, CustomerFieldErrorCode>> };
  }

  // 头像：可选。"" = 清除/未设置；非空必须是指向本组织 folder 的桶内 URL
  let avatarUrl: string | null = null;
  const avatarRaw = result.data.avatarUrl.trim();
  if (avatarRaw !== "") {
    if (isOwnedAvatarUrl(avatarRaw, orgId)) {
      avatarUrl = avatarRaw;
    } else {
      return { ok: false, fieldErrors: { avatar: "invalidAvatar" } };
    }
  }

  return {
    ok: true,
    input: {
      name: result.data.name,
      email: result.data.email,
      company: result.data.company,
      status: result.data.status,
      spent: result.data.spent,
      avatar_url: avatarUrl,
    },
  };
}

// 统一处理数据层抛出的错误码（写操作：邮箱冲突语义化为字段级错误）
function toWriteError(message: string): CustomerResult {
  if (message === "duplicate_email") {
    return { ok: false, fieldErrors: { email: "duplicateEmail" } };
  }
  return {
    ok: false,
    errorCode: toErrorCode(message, KNOWN_ERROR_CODES, "network"),
  };
}

// 新建客户
export async function createCustomer(
  orgId: string,
  raw: CustomerFormInput,
): Promise<CustomerResult> {
  const parsed = validateCustomerInput(raw, orgId);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  try {
    await insertCustomer(orgId, parsed.input);
  } catch (err) {
    return toWriteError(err instanceof Error ? err.message : "network");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// 编辑客户
export async function updateCustomer(
  orgId: string,
  id: string,
  raw: CustomerFormInput,
): Promise<CustomerResult> {
  const parsed = validateCustomerInput(raw, orgId);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  try {
    await patchCustomer(orgId, id, parsed.input);
  } catch (err) {
    return toWriteError(err instanceof Error ? err.message : "network");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// 删除客户
export async function removeCustomer(
  orgId: string,
  id: string,
): Promise<CustomerResult> {
  try {
    await deleteCustomer(orgId, id);
  } catch (err) {
    return {
      ok: false,
      errorCode: toErrorCode(
        err instanceof Error ? err.message : "network",
        KNOWN_ERROR_CODES,
        "network",
      ),
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- 头像上传 ----
// 客户端已把图片重采样为 256px JPEG（体积通常 < 200KB），天然满足
// Server Action 默认 1MB body 上限，无需调 next.config 的 bodySizeLimit。
// 上传成功只代表文件入库；URL 随表单 create/update 落库。用户填一半
// 取消表单、或替换旧头像时，旧文件会留在桶里成为孤儿对象——
// 清理策略（删除时同步 remove / pg_cron 定期清扫）暂不在模板范围。

export type AvatarUploadResult =
  | { ok: true; url: string }
  | { ok: false; errorCode: "invalidType" | "tooLarge" | "uploadFailed" };

const AVATAR_MAX_BYTES = 1024 * 1024; // 1MB（防御性：正常重采样产物远小于此）
const AVATAR_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

export async function uploadCustomerAvatar(
  orgId: string,
  formData: FormData,
): Promise<AvatarUploadResult> {
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

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // 路径约定 {orgId}/{uuid}.{ext}：与 0007 的 storage RLS folder 前缀对应
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;

  try {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from("customer-avatars")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error !== null) {
      // 含 RLS 拒绝（非 admin）与桶不存在（迁移未应用）等情况
      return { ok: false, errorCode: "uploadFailed" };
    }
    const { data } = supabase.storage
      .from("customer-avatars")
      .getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch {
    return { ok: false, errorCode: "uploadFailed" };
  }
}
