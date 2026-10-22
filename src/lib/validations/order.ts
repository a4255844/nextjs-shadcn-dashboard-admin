import { z } from "zod";

// 共享 order 表单 schema：客户端预检 + 服务端信任边界复用同一套规则。
// 错误 message 即 i18n key 后缀（pages.orders.form.errors.<code>）。

export const ORDER_AMOUNT_MAX = 999_999_999_999.99; // numeric(12,2) 上限
export const ORDER_MAX_TEXT = 50; // payment_method
export const ORDER_MAX_NOTES = 1000;

export const orderFormSchema = z.object({
  customerId: z.string().min(1, "required"),
  amount: z
    .string()
    .trim()
    .refine((val) => {
      if (val === "") return false;
      const n = Number(val);
      return Number.isFinite(n) && n >= 0 && n <= ORDER_AMOUNT_MAX;
    }, "invalidAmount")
    .transform(Number),
  status: z.enum(["pending", "paid", "refunded", "cancelled"], "invalidStatus"),
  paymentMethod: z.string().max(ORDER_MAX_TEXT, "tooLong").optional().default(""),
  notes: z.string().max(ORDER_MAX_NOTES, "tooLong").optional().default(""),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

/** 校验 order 表单输入，返回字段级错误（key = i18n code） */
export function validateOrderForm(raw: Record<string, string>) {
  const result = orderFormSchema.safeParse(raw);
  if (result.success) return { ok: true as const, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return { ok: false as const, fieldErrors };
}
