// Íconos SVG en línea (sin dependencias externas). Heredan el color del texto.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      width={20}
      height={20}
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
);
export const PinIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></Icon>
);
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);
export const CarIcon = (p: IconProps) => (
  <Icon {...p}><path d="M5 17h14v-5l-2-5H7l-2 5v5Z" /><path d="M5 12h14" /><circle cx="8" cy="17" r="1.5" /><circle cx="16" cy="17" r="1.5" /></Icon>
);
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}><path d="m5 12 5 5 9-10" /></Icon>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}><path d="m15 6-6 6 6 6" /></Icon>
);
export const StarIcon = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8L12 3Z" /></Icon>
);
export const PlusIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
);
export const HomeIcon = (p: IconProps) => (
  <Icon {...p}><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></Icon>
);
export const TicketIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M14 6v12" strokeDasharray="2 2" /></Icon>
);
export const KeyIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M15 8l2 2" /></Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>
);
export const CameraIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" /><circle cx="12" cy="13" r="3.5" /></Icon>
);
export const ParkingIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></Icon>
);
export const WalletIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" /><path d="M4 7V6a2 2 0 0 1 2-2h11v3" /><path d="M16 13.5h.01" /></Icon>
);
export const UserIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Icon>
);
