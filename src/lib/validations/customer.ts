import { z } from "zod";

// 共享 customer 表单 schema：客户端预检 + 服务端信任边界复用同一套规则。
// 所有字段来自表单控件，均为 string；spent 经 transform 转为 number。
// 错误 message 即 i18n key 后缀（customers.form.errors.<code>）。

export const CUSTOMER_MAX_TEXT = 100;
export const CUSTOMER_MAX_EMAIL = 160;
export const CUSTOMER_SPENT_MAX = 2_147_483_647; // integer 上限

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, "required").max(CUSTOMER_MAX_TEXT, "tooLong"),
  email: z
    .string()
    .trim()
    .min(1, "required")
    .max(CUSTOMER_MAX_EMAIL, "tooLong")
    .regex(EMAIL_RE, "invalidEmail"),
  company: z.string().trim().min(1, "required").max(CUSTOMER_MAX_TEXT, "tooLong"),
  status: z.enum(["active", "inactive", "vip", "atRisk"], "invalidStatus"),
  spent: z
    .string()
    .trim()
    .refine((val) => {
      if (val === "") return false;
      const n = Number(val);
      return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= CUSTOMER_SPENT_MAX;
    }, "invalidSpent")
    .transform(Number),
  avatarUrl: z.string(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

/** 校验 customer 表单输入，返回字段级错误（key = i18n code） */
export function validateCustomerForm(raw: Record<string, string>) {
  const result = customerFormSchema.safeParse(raw);
  if (result.success) return { ok: true as const, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return { ok: false as const, fieldErrors };
}
