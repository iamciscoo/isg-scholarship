export function PageHero({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-hero">
      <div className="container">
        <span className="eyebrow">{label}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
