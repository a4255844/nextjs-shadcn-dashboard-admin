import { z } from "zod";

// 共享 profile 表单 schema：客户端预检 + 服务端信任边界复用同一套规则。
// 错误 message 即 i18n key 后缀（pages.profile.errors.<code>）。

export const PROFILE_MAX_NAME = 50;

export const profileFormSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(PROFILE_MAX_NAME, "tooLong"),
  lastName: z.string().trim().max(PROFILE_MAX_NAME, "tooLong"),
  avatarUrl: z.string(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** 校验 profile 表单输入，返回字段级错误（key = i18n code） */
export function validateProfileForm(raw: Record<string, string>) {
  const result = profileFormSchema.safeParse(raw);
  if (result.success) return { ok: true as const, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return { ok: false as const, fieldErrors };
}
