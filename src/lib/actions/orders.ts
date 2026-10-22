"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  deleteOrder,
  insertOrder,
  patchOrder,
  type OrderWriteInput,
} from "@/lib/api/orders";
import { toErrorCode } from "@/lib/actions/rpc-errors";
import {
  orderFormSchema,
  validateOrderForm,
} from "@/lib/validations/order";
import { z } from "zod";

export type OrderFormInput = z.input<typeof orderFormSchema>;

export type OrderField =
  | "customerId"
  | "amount"
  | "status"
  | "paymentMethod"
  | "notes";

export type OrderFieldErrorCode =
  | "required"
  | "tooLong"
  | "invalidAmount"
  | "invalidStatus"
  | "invalidCustomer";

export type OrderErrorCode = "duplicate_number" | "not_found" | "forbidden" | "network";

const KNOWN_ERROR_CODES = [
  "duplicate_number",
  "not_found",
  "forbidden",
  "network",
] as const;

export type OrderResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors?: Partial<Record<OrderField, OrderFieldErrorCode>>;
      errorCode?: OrderErrorCode;
    };

// customer_id 归属校验：必须是本组织的 customer
async function isOrgCustomer(customerId: string, orgId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("org_id", orgId)
    .limit(1);
  if (error !== null) return false;
  return data.length > 0;
}

/** 服务端信任边界校验：zod schema + customer 归属检查 */
async function validateOrderInput(
  raw: OrderFormInput,
  orgId: string,
): Promise<
  | { ok: true; input: OrderWriteInput }
  | { ok: false; fieldErrors: Partial<Record<OrderField, OrderFieldErrorCode>> }
> {
  const result = validateOrderForm(raw);
  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: result.fieldErrors as Partial<Record<OrderField, OrderFieldErrorCode>>,
    };
  }

  // customer 归属校验
  if (!(await isOrgCustomer(result.data.customerId, orgId))) {
    return { ok: false, fieldErrors: { customerId: "invalidCustomer" } };
  }

  return {
    ok: true,
    input: {
      customer_id: result.data.customerId,
      amount: result.data.amount,
      status: result.data.status,
      payment_method: result.data.paymentMethod || null,
      notes: result.data.notes || null,
    },
  };
}

function toWriteError(message: string): OrderResult {
  if (message === "duplicate_number") {
    return { ok: false, fieldErrors: { customerId: "required" } }; // 占位：number 服务端生成，实际不应触发
  }
  return {
    ok: false,
    errorCode: toErrorCode(message, KNOWN_ERROR_CODES, "network"),
  };
}

export async function createOrder(
  orgId: string,
  raw: OrderFormInput,
): Promise<OrderResult> {
  const parsed = await validateOrderInput(raw, orgId);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  try {
    await insertOrder(orgId, parsed.input);
  } catch (err) {
    return toWriteError(err instanceof Error ? err.message : "network");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateOrder(
  orgId: string,
  id: string,
  raw: OrderFormInput,
): Promise<OrderResult> {
  const parsed = await validateOrderInput(raw, orgId);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  try {
    await patchOrder(orgId, id, parsed.input);
  } catch (err) {
    return toWriteError(err instanceof Error ? err.message : "network");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeOrder(
  orgId: string,
  id: string,
): Promise<OrderResult> {
  try {
    await deleteOrder(orgId, id);
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
