import Image from "next/image";
import { Link } from "@/i18n/navigation";

const FullLogo = () => {
  return (
    <Link href="/" className="max-w-[40px] block lg:max-w-[120px] overflow-hidden">
      {/* Dark Logo (light mode) */}
      <Image
        src="/images/logos/darklogo.svg"
        alt="logo"
        width={100}
        height={32}
        className="block dark:hidden max-w-[120px] rtl:scale-x-[-1]"
        priority
      />
      {/* Light Logo (dark mode) */}
      <Image
        src="/images/logos/whitelogo.svg"
        alt="logo"
        width={100}
        height={32}
        className="hidden dark:block max-w-[120px] rtl:scale-x-[-1]"
        priority
      />
    </Link>
  );
};

export default FullLogo;
