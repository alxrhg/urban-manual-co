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
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-normal tracking-tight text-foreground">Urban Manual®</h1>

          <nav className="hidden md:flex items-center gap-6">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Search className="w-4 h-4" />
              <span>Search</span>
              <kbd className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded border border-border">⌘K</kbd>
            </button>

            <button className="flex items-center gap-2 text-sm text-foreground hover:text-foreground/80 transition-colors">
              <Map className="w-4 h-4" />
              <span>Trips</span>
            </button>

            <Button size="sm" variant="default" className="bg-foreground text-background hover:bg-foreground/90">
              Sign In
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 lg:px-12 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div className="space-y-6">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
                Curated Travel Guide
              </p>

              <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light text-foreground leading-[1.1] text-pretty">
                Discover the world's finest
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                909+ handpicked hotels, restaurants, and destinations across the globe.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Where would you like to go?"
                className="pl-12 pr-14 h-14 text-base bg-card border-border focus-visible:ring-ring"
              />
              <Button
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-muted hover:bg-muted-foreground/20"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs border border-border">/</kbd>{" "}
              to focus • Enter to search
            </p>
          </div>

          {/* Featured Card */}
          <div className="bg-card border border-border overflow-hidden">
            <div className="relative aspect-[4/3] bg-secondary/20">
              <Image
                src="/images/screenshot-202025-12-24-20at-2012.png"
                alt="Featured destination"
                fill
                className="object-cover"
              />
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-medium">Est. 2024</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-serif text-3xl font-light text-foreground">Urban Manual</h3>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  A curated guide for those who appreciate the finer details of travel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-6 lg:px-12 py-8">
          {/* Cities */}
          <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
            {cities.map((city) => (
              <button
                key={city}
                className="text-sm text-foreground hover:text-foreground/70 transition-colors whitespace-nowrap first:font-medium"
              >
                {city}
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <button className="px-3 py-1.5 text-sm font-medium text-foreground border border-border bg-background rounded-full hover:bg-muted transition-colors whitespace-nowrap">
              All Categories
            </button>
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="container mx-auto px-6 lg:px-12 py-12 lg:py-16">
        {/* Controls Bar */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-muted-foreground">909 destinations</p>

          <div className="flex items-center gap-3">
            <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              + Create Trip
            </Button>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm">
              <Globe2 className="w-4 h-4 mr-2" />
              Discover by Cities
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {destinations.map((dest, idx) => (
            <div key={idx} className="group cursor-pointer">
              <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden mb-3">
                <Image
                  src={dest.image || "/placeholder.svg"}
                  alt={dest.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-foreground group-hover:text-foreground/70 transition-colors">
                  {dest.name}
                </h3>
                <p className="text-sm text-muted-foreground">{dest.category}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-20">
        <div className="container mx-auto px-6 lg:px-12 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-muted-foreground">© 2025 Urban Manual. All rights reserved.</p>
            <nav className="flex gap-8">
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
