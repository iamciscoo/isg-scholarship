import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  FileCheck2,
  GraduationCap,
  Plane,
  CircleCheck,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqList } from "@/components/public/faq-list";
import { Cta } from "@/components/public/cta";
import { HomeMotion } from "@/components/public/home-motion";
import { DestinationStories } from "@/components/public/destination-stories";
import { getMessages } from "@/lib/i18n/server";
import { Leaders } from "@/components/public/leaders";
import { UniversityLife } from "@/components/public/university-life";
import { getHomepageImage } from "@/server/repositories/marketing-images";
export const metadata: Metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const { home: h, ui: t } = await getMessages();
  const heroImage = await getHomepageImage();
  return (
    <div data-home>
      <section className="hero container" data-home-hero>
        <div className="hero-copy">
          <div className="eyebrow">{h.eyebrow}</div>
          <h1>
            {h.title1}
            <br />
            <span>{h.title2}</span>
          </h1>
          <p>{h.description}</p>
          <div className="hero-actions">
            <Button asChild>
              <Link href="/consultation">
                {t.myEligibility}
                <ArrowUpRight size={18} />
              </Link>
            </Button>
            <Link className="text-link" href="/contact?topic=consultation">
              {t.advisor}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-destinations">
            <span>{h.destinationLabel}</span>
            <div>
              {h.destinations.map((name, i) => (
                <Link
                  key={name}
                  href={`/pathways?destination=${encodeURIComponent(["Russia", "United Kingdom", "Germany", "Canada"][i])}`}
                >
                  <Image src={`/flags/${["ru", "gb", "de", "ca"][i]}.svg`} width={32} height={24} alt="" />
                  <span>{name}</span>
                  <ArrowUpRight size={12} />
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="hero-scene">
          <div className="hero-cream-plane" aria-hidden="true" />
          <div className="hero-visual">
            <Image
              src={heroImage}
              alt="Explore international study with ISG guidance"
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              priority
              className="hero-photo"
            />
            <div className="hero-image-edge" aria-hidden="true" />
          </div>
          <div className="hero-route-plaque">
            <Plane size={19} />
            <span>{h.promises[0]}</span>
          </div>
        </div>
      </section>
      <div className="promise-strip container">
        {h.promises.map((text, i) => {
          const Icon = [Compass, CircleCheck, FileCheck2][i];
          return (
            <div key={text}>
              <Icon size={20} />
              <span>{text}</span>
            </div>
          );
        })}
      </div>
      <section className="section container intro-section">
        <div className="intro-heading">
          <h2>{h.introTitle}</h2>
          <p>{h.introText}</p>
          <Link className="text-link" href="/about">
            {h.aboutLink}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="service-list">
          {h.services.map(([title, text], i) => {
            const Icon = [Compass, FileCheck2, UsersRound][i];
            return (
              <div key={title} className="service-item">
                <span className="icon-box">
                  <Icon size={23} strokeWidth={1.5} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <Leaders />
      <UniversityLife />
      <DestinationStories />
      <section className="pathways-section section">
        <div className="container">
          <div className="section-heading">
            <h2>{h.pathTitle}</h2>
          </div>
          <div className="pathway-grid" tabIndex={0} role="region" aria-label={h.pathTitle}>
            {h.degrees.map(([degree, title], i) => (
              <Link
                href={`/pathways?level=${encodeURIComponent(["Undergraduate", "Master's", "PhD / Research"][i])}#programmes`}
                className={`pathway-tile pathway-${i}`}
                key={title}
              >
                <GraduationCap size={29} strokeWidth={1.4} />
                <div>
                  <span>{degree}</span>
                  <h3>{title}</h3>
                </div>
                <ArrowUpRight className="pathway-arrow" size={23} />
              </Link>
            ))}
          </div>
          <p className="pathway-note">{h.pathNote}</p>
        </div>
      </section>
      <section className="section container process-section">
        <div className="section-heading">
          <h2>{h.processTitle}</h2>
          <p>{h.processText}</p>
        </div>
        <div className="flight-route" aria-hidden="true">
          <div className="flight-route-line" />
          <span className="flight-plane">
            <Plane size={22} />
          </span>
        </div>
        <ol className="process-grid">
          {h.steps.map(([title, text], i) => (
            <li key={title}>
              <span className="step-number">{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <Link className="text-link" href="/how-it-works">
          {h.fullJourney}
          <ArrowRight size={18} />
        </Link>
      </section>
      <section className="care-section container">
        <div className="care-image">
          <Image
            src="/images/campus-life.webp"
            alt="Students together in a university corridor"
            fill
            sizes="(max-width: 767px) 100vw, 45vw"
          />
        </div>
        <div className="care-copy">
          <CircleCheck size={30} strokeWidth={1.4} />
          <h2>{h.careTitle}</h2>
          <p>{h.careText}</p>
          <ul>
            {h.carePoints.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <Link href="/services" className="text-link">
            {h.careLink}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="section container faq-section">
        <div>
          <h2>{h.faqTitle}</h2>
          <p>{h.faqText}</p>
          <Link className="text-link" href="/faqs">
            {t.allQuestions}
            <ArrowRight size={18} />
          </Link>
        </div>
        <FaqList limit={4} />
      </section>
      <Cta />
      <HomeMotion />
    </div>
  );
}
