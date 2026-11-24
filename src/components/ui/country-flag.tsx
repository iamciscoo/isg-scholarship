import Image from "next/image";

export function CountryFlag({ code, eager = false }: { code: string; eager?: boolean }) {
  return (
    <Image
      src={`/flags/${code.toLowerCase()}.svg`}
      width={24}
      height={18}
      alt=""
      unoptimized
      loading={eager ? "eager" : "lazy"}
    />
  );
}
