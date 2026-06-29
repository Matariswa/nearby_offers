import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

const features = [
  {
    title: "Real-time offers",
    description:
      "See the latest discounts from shops near you as soon as they are published.",
    icon: "⚡",
  },
  {
    title: "Location-based discovery",
    description:
      "Find shops within 1, 2, 5, or 10 km of your current location.",
    icon: "📍",
  },
  {
    title: "Easy navigation",
    description:
      "Get directions to any shop with one tap using Google Maps integration.",
    icon: "🗺️",
  },
];

const radiusOptions = ["1 km", "2 km", "5 km", "10 km"];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container-app relative py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-6 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              Location-based deals, delivered instantly
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Discover nearby offers before they expire
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-brand-100">
              Nearby Offers connects you with local shops and their latest
              discounts. Open the app, share your location, and start saving
              today.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-brand-700 hover:bg-brand-50"
                >
                  Start exploring
                </Button>
              </Link>
              <Link href="/shop-owner">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  List your shop
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-app -mt-10 relative z-10 pb-16">
        <Card padding="lg" className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Search radius</CardTitle>
            <CardDescription>
              Choose how far you want to search for nearby shops
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-3">
              {radiusOptions.map((radius) => (
                <button
                  key={radius}
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 first:border-brand-500 first:bg-brand-50 first:text-brand-700"
                >
                  {radius}
                </button>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-500">
              Map and shop listings will be available after location services
              are connected.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="container-app py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Why Nearby Offers?
          </h2>
          <p className="mt-3 text-slate-600">
            Built for customers who want deals and shop owners who want foot
            traffic.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <span className="text-3xl" aria-hidden="true">
                  {feature.icon}
                </span>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="container-app text-center">
          <h2 className="text-3xl font-bold">Ready to grow your business?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Register as a shop owner and publish offers that reach customers
            in your neighborhood.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg" className="bg-brand-500 hover:bg-brand-400">
              Create free account
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
