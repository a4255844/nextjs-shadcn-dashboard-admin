"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_ORG_COOKIE,
  listMyOrganizations,
  joinOrganization,
  type JoinErrorCode,
} from "@/lib/api/organizations";

export interface CreateOrgResult {
  ok: boolean;
  orgId?: string;
  errorCode?: "auth_required" | "invalid_name" | "network";
}

export interface CreateInviteResult {
  ok: boolean;
  token?: string;
  errorCode?: "auth_required" | "not_admin" | "invalid_role" | "network";
}

export interface AcceptInviteResult {
  ok: boolean;
  orgId?: string;
  alreadyMember?: boolean;
  errorCode?: JoinErrorCode | "network";
}

const CREATE_ORG_ERRORS = ["auth_required", "invalid_name"] as const;
const CREATE_INVITE_ERRORS = [
  "auth_required",
  "not_admin",
  "invalid_role",
] as const;
const JOIN_ERRORS = ["auth_required", "invalid", "used", "expired"] as const;

/**
 * rpc raise exception 的异常码经 PostgREST 出现在 error.message 中。
 * 先做已知码白名单校验，通过后收窄（断言紧邻校验）。
 */
function toErrorCode<E extends string>(
  message: string,
  known: readonly E[],
  fallback: Extract<E, "network">,
): E {
  return (known as readonly string[]).includes(message)
    ? (message as E)
    : fallback;
}

async function writeActiveOrgCookie(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** 创建组织（rpc 原子写入 org + admin 成员），并切换为当前组织 */
export async function createOrganization(
  name: string,
): Promise<CreateOrgResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_organization", {
    p_name: name,
  });

  if (error !== null) {
    return {
      ok: false,
      errorCode: toErrorCode(error.message, CREATE_ORG_ERRORS, "network"),
    };
  }

  await writeActiveOrgCookie(data);
  revalidatePath("/", "layout");
  return { ok: true, orgId: data };
}

/** 为指定组织生成一次性邀请链接（仅 admin；旧活跃链接自动失效） */
export async function createInvite(orgId: string): Promise<CreateInviteResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_invite", {
    p_org_id: orgId,
    p_role: "member",
  });

  if (error !== null) {
    return {
      ok: false,
      errorCode: toErrorCode(error.message, CREATE_INVITE_ERRORS, "network"),
    };
  }

  return { ok: true, token: data };
}

/** 消费邀请链接，成功后切换到该组织 */
export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  try {
    const { orgId, alreadyMember } = await joinOrganization(token);
    await writeActiveOrgCookie(orgId);
    // 注意：这里不做 revalidatePath。invite 是独立落地页，用户随后会
    // 跳转 /customers，由目标页面的导航自然触发数据刷新；
    // 若在此 revalidate，Server Action 响应与客户端 setPhase 竞争，
    // 会导致 React removeChild DOM 不同步错误。
    return { ok: true, orgId, alreadyMember };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      errorCode: toErrorCode(message, JOIN_ERRORS, "network"),
    };
  }
}

/** 切换当前组织（先校验成员资格，防止伪造 cookie 值） */
export async function setActiveOrganization(orgId: string): Promise<void> {
  const orgs = await listMyOrganizations();
  if (!orgs.some((o) => o.id === orgId)) return;

  await writeActiveOrgCookie(orgId);
  revalidatePath("/", "layout");
}
