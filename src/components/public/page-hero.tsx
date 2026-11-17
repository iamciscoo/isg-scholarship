import Image from "next/image";
export function PageHero({
  label,
  title,
  description,
  image,
  imageAlt="Students preparing for their university journey",
}: {
  label: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?:string;
}) {
  return (
    <section className="page-hero">
      <div className={`container ${image ? "page-hero-with-photo" : ""}`}><div>
        <span className="eyebrow">{label}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>{image && <div className="page-hero-photo"><Image src={image} fill sizes="(max-width:767px) 100vw, 40vw" alt={imageAlt} priority /></div>}</div>
    </section>
  );
}
