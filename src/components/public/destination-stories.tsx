import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getMessages } from "@/lib/i18n/server";
const photos = ["/images/world-connections.jpg","/images/study-together.jpg","/images/moscow.jpg","/images/campus-life.jpg"];
export async function DestinationStories() {
  const { home: h } = await getMessages();
  return <section className="destination-chapter">
    <div className="container destination-feature"><div className="destination-copy"><span className="destination-coordinate" aria-hidden="true">55°45′ N · 37°37′ E</span><h2>{h.cityTitle}</h2><p>{h.cityText}</p><Link href="/pathways" className="text-link">{h.cityLink}<ArrowUpRight size={18} /></Link></div>
      <figure className="destination-photo"><Image src="/images/moscow.jpg" alt="The colorful domes of Saint Basil’s Cathedral in Moscow" fill sizes="(max-width: 767px) 100vw, 58vw" /><figcaption>{h.cityCaption}</figcaption></figure>
    </div>
    <div className="container education-stories"><h2>{h.storyTitle}</h2><div className="story-grid">{h.stories.map(([title,text],i) => <article className="education-story" key={title}><Image src={photos[i]} fill sizes="(max-width: 600px) 85vw, (max-width: 1023px) 45vw, 25vw" alt="" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div>
  </section>;
}
