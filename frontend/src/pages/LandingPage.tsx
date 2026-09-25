import NavHeader from "./landing/NavHeader";
import Hero from "./landing/Hero";
import AboutStats from "./landing/AboutStats";
import Features from "./landing/Features";
import HowItWorks from "./landing/HowItWorks";
import Faq from "./landing/Faq";
import CtaBanner from "./landing/CtaBanner";
import Footer from "./landing/Footer";

export default function LandingPage() {
  return (
    <div style={{ background: "#fff" }}>
      <NavHeader />
      <Hero />
      <AboutStats />
      <Features />
      <HowItWorks />
      <Faq />
      <CtaBanner />
      <Footer />
    </div>
  );
}
