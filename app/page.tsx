import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 lg:px-12 py-6">
          <h1 className="font-serif text-2xl font-light tracking-[0.3em] text-foreground">OF STUDY</h1>
        </div>
      </header>

      <section className="container mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left Card - Brand Statement */}
          <div className="bg-card border border-border p-12 lg:p-20 flex items-center justify-center min-h-[500px] lg:min-h-[650px]">
            <div className="text-center space-y-2">
              <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light text-foreground tracking-tight leading-none">
                OF STUDY
              </h2>
              <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase font-sans">
                Collections By Design
              </p>
            </div>
          </div>

          <div className="bg-secondary border border-border overflow-hidden min-h-[500px] lg:min-h-[650px] flex flex-col">
            {/* Image Area */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-secondary">
              <div className="relative w-full max-w-sm aspect-square">
                <Image
                  src="/white-sculptural-ceramic-vase-on-pedestal-minimali.jpg"
                  alt="Sculptural ceramic piece"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            <div className="bg-card p-6 lg:p-8 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-sans text-xs tracking-[0.15em] font-medium text-foreground uppercase">
                  Collections By Design
                </h3>
              </div>

              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-foreground/90 font-sans">
                  Of Study is created for those who understand that how we live with objects shapes the way we see them.
                  The objects we live with. The objects that punctuate our days and nights. The spaces as meditations as
                  the spaces we inhabit and the hours that we keep.
                </p>

                <p className="text-sm leading-relaxed text-foreground/90 font-sans">
                  Developed in London and created from responsibly sourced materials, Of Study embodies our foundational
                  principles of sustainable design. Aiming to transform ordinary moments into something more
                  intentional.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href="#"
                  className="text-xs tracking-wider font-medium text-foreground/70 hover:text-foreground transition-colors uppercase"
                >
                  ofstudyhome.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-20 lg:py-32">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16 lg:mb-20 max-w-3xl mx-auto">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6 text-balance leading-tight">
              Curated Collections
            </h2>
            <p className="text-muted-foreground text-base lg:text-lg leading-relaxed font-sans">
              Each piece is thoughtfully selected to bring meaning and beauty to everyday rituals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[
              { title: "Ceramics", count: "24 pieces" },
              { title: "Textiles", count: "18 pieces" },
              { title: "Objects", count: "31 pieces" },
            ].map((collection) => (
              <div
                key={collection.title}
                className="bg-card border border-border p-10 lg:p-14 text-center hover:border-foreground/30 transition-all duration-300 group"
              >
                <h3 className="font-serif text-3xl lg:text-4xl font-light text-foreground mb-3 group-hover:text-foreground/80 transition-colors">
                  {collection.title}
                </h3>
                <p className="text-xs text-muted-foreground tracking-[0.15em] uppercase font-sans">
                  {collection.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 lg:px-12 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto">
          <blockquote className="space-y-8">
            <p className="font-serif text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-relaxed text-balance">
              "We believe in the power of objects to shape our daily experience. Each item is chosen not just for its
              aesthetic value, but for its ability to create moments of pause and reflection."
            </p>
            <footer className="text-xs text-muted-foreground tracking-[0.2em] uppercase font-sans">
              — Design Philosophy
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="bg-foreground py-20 lg:py-32">
        <div className="container mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-background mb-6 text-balance leading-tight">
            Explore The Collection
          </h2>
          <p className="text-background/70 text-base lg:text-lg mb-10 max-w-2xl mx-auto leading-relaxed font-sans">
            Discover objects that transform spaces into sanctuaries
          </p>
          <Button
            size="lg"
            variant="outline"
            className="bg-transparent border-2 border-background text-background hover:bg-background hover:text-foreground transition-all duration-300 font-sans tracking-wider text-sm px-8"
          >
            View All Collections
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-6 lg:px-12 py-12 lg:py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-xs text-muted-foreground tracking-wider font-sans">
              © 2025 Of Study. All rights reserved.
            </p>
            <nav className="flex gap-10">
              <a
                href="#"
                className="text-sm text-foreground/70 hover:text-foreground transition-colors tracking-wide font-sans"
              >
                About
              </a>
              <a
                href="#"
                className="text-sm text-foreground/70 hover:text-foreground transition-colors tracking-wide font-sans"
              >
                Contact
              </a>
              <a
                href="#"
                className="text-sm text-foreground/70 hover:text-foreground transition-colors tracking-wide font-sans"
              >
                Journal
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  )
}
