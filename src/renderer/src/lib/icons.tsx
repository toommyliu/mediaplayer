import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 5v14l11-7z" />
    </BaseIcon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 5h-2v14h2zM16 5h-2v14h2z" />
    </BaseIcon>
  );
}

export function PreviousIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M11 19 2 12l9-7v14z" />
      <path d="M22 19 13 12l9-7v14z" />
    </BaseIcon>
  );
}

export function NextIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m13 5 9 7-9 7V5z" />
      <path d="m2 5 9 7-9 7V5z" />
    </BaseIcon>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18 6a8 8 0 0 1 0 12" />
    </BaseIcon>
  );
}

export function MuteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="m17 9 5 5" />
      <path d="m22 9-5 5" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
      <circle cx="12" cy="12" r="4" />
    </BaseIcon>
  );
}

export function FullscreenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 3H3v5" />
      <path d="m3 3 6 6" />
      <path d="M16 3h5v5" />
      <path d="m21 3-6 6" />
      <path d="M8 21H3v-5" />
      <path d="m3 21 6-6" />
      <path d="M16 21h5v-5" />
      <path d="m21 21-6-6" />
    </BaseIcon>
  );
}

export function FullscreenExitIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 13h5v5" />
      <path d="m8 13-5 5" />
      <path d="M21 13h-5v5" />
      <path d="m16 13 5 5" />
      <path d="M3 11h5V6" />
      <path d="m8 11-5-5" />
      <path d="M21 11h-5V6" />
      <path d="m16 11 5-5" />
    </BaseIcon>
  );
}

export function PanelLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </BaseIcon>
  );
}

export function ShuffleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="m4 4 5 5" />
    </BaseIcon>
  );
}

export function RepeatIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 23-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </BaseIcon>
  );
}

export function RepeatOneIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 23-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      <path d="M11 10h2v8" />
    </BaseIcon>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </BaseIcon>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect width="18" height="14" x="3" y="5" rx="2" />
      <path d="M7 5v14" />
      <path d="M17 5v14" />
      <path d="M3 9h4" />
      <path d="M3 15h4" />
      <path d="M17 9h4" />
      <path d="M17 15h4" />
    </BaseIcon>
  );
}

export function LoaderIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
    </BaseIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </BaseIcon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </BaseIcon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3a7 7 0 1 0 9 9 9 9 0 1 1-9-9z" />
    </BaseIcon>
  );
}

export function DotIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function RevealIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </BaseIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}
