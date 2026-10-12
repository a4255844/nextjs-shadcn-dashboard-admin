/**
 * rpc 异常码收窄（纯函数模块，无 "use server"——两个 action 文件共用）。
 * rpc raise exception 的异常码经 PostgREST 出现在 error.message 中。
 * 先做已知码白名单校验，通过后收窄（断言紧邻校验）。
 */
export function toErrorCode<E extends string>(
  message: string,
  known: readonly E[],
  fallback: Extract<E, "network">,
): E {
  return (known as readonly string[]).includes(message)
    ? (message as E)
    : fallback;
}
