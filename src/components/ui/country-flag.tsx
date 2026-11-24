import Image from "next/image";

export function CountryFlag({ code, eager = false }: { code: string; eager?: boolean }) {
  const region = code.toLowerCase();
  return (
    <Image
      src={region === "cn" ? "/flags/china.svg" : `/flags/${region}.svg`}
      width={24}
      height={18}
      alt=""
      unoptimized
      loading={eager ? "eager" : "lazy"}
    />
  );
}
