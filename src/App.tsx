import { Ticker, Nav, Hero } from "./components/Hero";
import { KeyFeatures, PagesExplorer } from "./components/Explore";
import { TechStack, FileStructure, DataModel } from "./components/Blueprint";
import { Deployment, DevNotes, Roadmap, Footer } from "./components/Deliver";

export default function App() {
  return (
    <div className="min-h-screen bg-pine-950 text-ink font-body">
      <div className="noise-overlay" aria-hidden />
      <Ticker />
      <Nav />
      <main>
        <Hero />
        <KeyFeatures />
        <PagesExplorer />
        <TechStack />
        <FileStructure />
        <DataModel />
        <Deployment />
        <DevNotes />
        <Roadmap />
      </main>
      <Footer />
    </div>
  );
}
