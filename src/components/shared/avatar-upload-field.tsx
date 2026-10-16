"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// 头像上传错误码：客户端预检与上传 action 共用（调用方负责翻译）
export type AvatarUploadErrorCode = "invalidType" | "tooLarge" | "uploadFailed";

export type AvatarUploadOutcome =
  | { ok: true; url: string }
  | { ok: false; errorCode: AvatarUploadErrorCode };

interface AvatarUploadFieldProps {
  /** 当前头像 URL；null/"" = 无头像（显示首字母 fallback） */
  value: string | null;
  /** 无头像时的 fallback 文字（通常为首字母缩写） */
  fallbackText: string;
  /** fallback 背景色等附加类名 */
  fallbackClassName?: string;
  disabled?: boolean;
  /** 上传通道：接收已重采样的 JPEG Blob，返回公开 URL（调用方绑定具体 action） */
  upload: (blob: Blob) => Promise<AvatarUploadOutcome>;
  /** 无障碍/悬浮提示文案 */
  labels: { change: string; remove: string };
  /** 预翻译的错误文案（组件内部展示） */
  errorMessages: Record<AvatarUploadErrorCode, string>;
  /** 上传成功回填 URL；点移除回传 null（调用方自行决定清除语义） */
  onChange: (url: string | null) => void;
  /** Avatar 尺寸类名，默认 size-16 */
  avatarClassName?: string;
}

// 客户端预检上限（重采样前的原图）：仅防把超大文件塞进 decode，
// 上传体积由重采样输出决定，与原图大小无关
const MAX_RAW_BYTES = 8 * 1024 * 1024;

// 扩展名兜底：Windows 对 .webp 等新格式常无 MIME 注册，
// 系统文件选择器给出的 file.type 为空字符串，不能只信 MIME 预检。
// 真正的把关在 createImageBitmap 解码（解不了 -> invalidType）。
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;

// 重采样：居中方形裁剪 -> 256px JPEG。统一头像规格、把几 MB 的原图
// 压到 ~100KB 级，天然满足 Server Action 1MB body 上限（无需调配置）。
// imageOrientation 修正手机照片的 EXIF 旋转。
async function resampleToAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    bitmap.close();
    throw new Error("canvas unavailable");
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 256, 256);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob !== null ? resolve(blob) : reject(new Error("encode failed"))),
      "image/jpeg",
      0.85,
    );
  });
}

/**
 * 头像上传选择器：整个圆形区域可点击选图（label 覆盖 Avatar），
 * 右下角相机角标仅为视觉提示；选中即重采样并调用传入的上传通道。
 */
export function AvatarUploadField({
  value,
  fallbackText,
  fallbackClassName,
  disabled = false,
  upload,
  labels,
  errorMessages,
  onChange,
  avatarClassName,
}: AvatarUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [errorCode, setErrorCode] = useState<AvatarUploadErrorCode | null>(null);

  const busy = disabled || uploading;
  const hasAvatar = value !== null && value !== "";

  async function handleFileSelected(file: File) {
    setErrorCode(null);

    const looksLikeImage =
      file.type.startsWith("image/") ||
      (file.type === "" && IMAGE_EXT_RE.test(file.name));
    if (!looksLikeImage) {
      setErrorCode("invalidType");
      return;
    }
    if (file.size === 0 || file.size > MAX_RAW_BYTES) {
      setErrorCode("tooLarge");
      return;
    }

    setUploading(true);
    try {
      const blob = await resampleToAvatar(file);
      const result = await upload(blob);
      if (result.ok) {
        onChange(result.url);
      } else {
        setErrorCode(result.errorCode);
      }
    } catch {
      // decode/encode 失败（损坏文件、不支持的格式）
      setErrorCode("invalidType");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <label
        className={cn(
          "group relative block rounded-full",
          busy ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        )}
        aria-label={labels.change}
        title={labels.change}
      >
        <Avatar className={cn("size-16", avatarClassName)}>
          {hasAvatar && <AvatarImage src={value} alt={fallbackText} />}
          <AvatarFallback
            className={cn("text-lg font-medium", fallbackClassName)}
          >
            {fallbackText || "?"}
          </AvatarFallback>
        </Avatar>
        {/* 相机角标：纯视觉提示，点击事件由外层 label（整圆）承接 */}
        <span className="pointer-events-none absolute -right-1 -bottom-1 z-10 inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background transition-colors group-hover:bg-primary/90">
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Camera className="size-3.5" />
          )}
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // 允许连续选择同一文件
            if (file !== undefined) void handleFileSelected(file);
          }}
        />
      </label>
      {hasAvatar && (
        <button
          type="button"
          className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
          disabled={busy}
          onClick={() => onChange(null)}
        >
          {labels.remove}
        </button>
      )}
      {errorCode !== null && (
        <p className="text-sm text-destructive">{errorMessages[errorCode]}</p>
      )}
    </div>
  );
}
