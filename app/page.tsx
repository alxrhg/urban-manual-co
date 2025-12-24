import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Map, ArrowRight, SlidersHorizontal, Globe2 } from "lucide-react"

export default function Page() {
  const cities = ["All Cities", "Taipei", "Tokyo", "London", "+60 more"]
  const categories = [
    { icon: "🌟", label: "Michelin" },
    { icon: "🥐", label: "Bakeries" },
    { icon: "🍷", label: "Bar" },
    { icon: "☕", label: "Cafe" },
    { icon: "☕", label: "Coffee" },
    { icon: "🎨", label: "Culture" },
    { icon: "🍽️", label: "Dining" },
    { icon: "🏨", label: "Hotel" },
    { label: "Others" },
  ]

  const destinations = [
    {
      name: "Ogata at The Shinmonzen",
      category: "Dining in Kyoto",
      image: "/images/screenshot-202025-12-24-20at-2012.png",
    },
    {
      name: "MACAM Hotel",
      category: "Hotel in Lisbon",
      image: "/placeholder.jpg",
    },
    {
      name: "Chef's Table by Katsuhito Inoue",
      category: "Dining in Kyoto",
      image: "/placeholder.jpg",
    },
    {
      name: "The Nickel Hotel",
      category: "Hotel in Charleston",
      image: "/placeholder.jpg",
    },
    {
      name: "Eleven Taylor River Lodge",
      category: "Hotel in Colorado",
      image: "/placeholder.jpg",
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-8 lg:px-16 py-5 flex items-center justify-between">
          <h1 className="font-serif text-xl tracking-tight text-foreground">Urban Manual®</h1>

          <nav className="hidden md:flex items-center gap-8">
            <button className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Search className="w-4 h-4" />
              <span>Search</span>
              <kbd className="px-2 py-0.5 text-xs bg-muted/60 text-muted-foreground rounded border border-border/60">
                ⌘K
              </kbd>
            </button>

            <button className="flex items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground transition-colors">
              <Map className="w-4 h-4" />
              <span>Trips</span>
            </button>

            <Button
              size="sm"
              variant="default"
              className="bg-foreground text-background hover:bg-foreground/90 h-9 px-5"
            >
              Sign In
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-8 lg:px-16 py-16 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-start">
          <div className="space-y-10">
            <div className="space-y-8">
              <p className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                Curated Travel Guide
              </p>

              <h2 className="font-serif text-6xl md:text-7xl lg:text-8xl font-light text-foreground leading-[0.95] tracking-tight text-balance">
                Discover the world's finest
              </h2>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md text-pretty">
                909+ handpicked hotels, restaurants, and destinations across the globe.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xl">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Where would you like to go?"
                className="pl-14 pr-16 h-16 text-base bg-card border-border/60 focus-visible:ring-ring rounded-lg"
              />
              <Button
                size="icon"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-muted hover:bg-muted/80 rounded-md"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded text-xs border border-border/60">
                /
              </kbd>{" "}
              to focus • Enter to search
            </p>
          </div>

          {/* Featured Card */}
          <div className="bg-card border border-border/40 overflow-hidden rounded-sm">
            <div className="relative aspect-[4/3] bg-secondary/30">
              <Image
                src="/images/screenshot-202025-12-24-20at-2012.png"
                alt="Featured destination"
                fill
                className="object-cover"
              />
            </div>

            <div className="p-10 space-y-8">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">Est. 2024</p>

              <div className="space-y-5">
                <h3 className="font-serif text-4xl font-light text-foreground tracking-tight">Urban Manual</h3>

                <p className="text-base leading-relaxed text-muted-foreground text-pretty">
                  A curated guide for those who appreciate the finer details of travel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="border-y border-border/40 bg-muted/20">
        <div className="container mx-auto px-8 lg:px-16 py-10">
          {/* Cities */}
          <div className="flex items-center gap-6 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {cities.map((city, idx) => (
              <button
                key={city}
                className={`text-sm transition-colors whitespace-nowrap ${
                  idx === 0 ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button className="px-4 py-2 text-sm font-medium text-foreground border border-border/60 bg-background rounded-full hover:bg-muted/50 transition-colors whitespace-nowrap">
              All Categories
            </button>
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent rounded-full transition-colors whitespace-nowrap flex items-center gap-2"
              >
                {cat.icon && <span className="text-base">{cat.icon}</span>}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="container mx-auto px-8 lg:px-16 py-16 lg:py-20">
        {/* Controls Bar */}
        <div className="flex items-center justify-between mb-12">
          <p className="text-sm text-muted-foreground tracking-wide">909 destinations</p>

          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5"
            >
              + Create Trip
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-4 border-border/60 bg-transparent">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-4 border-border/60 bg-transparent">
              <Globe2 className="w-4 h-4 mr-2" />
              Discover by Cities
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {destinations.map((dest, idx) => (
            <div key={idx} className="group cursor-pointer">
              <div className="relative aspect-[4/3] bg-muted/50 rounded-sm overflow-hidden mb-4">
                <Image
                  src={dest.image || "/placeholder.svg"}
                  alt={dest.name}
                  fill
                  className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-foreground group-hover:text-foreground/70 transition-colors text-balance">
                  {dest.name}
                </h3>
                <p className="text-sm text-muted-foreground">{dest.category}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/30 mt-28">
        <div className="container mx-auto px-8 lg:px-16 py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-xs text-muted-foreground tracking-wide">© 2025 Urban Manual. All rights reserved.</p>
            <nav className="flex gap-10">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  )
}
