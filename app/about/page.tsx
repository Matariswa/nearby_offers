import type { Metadata } from "next";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "About",
};

const values = [
  {
    title: "Local first",
    description:
      "We believe in supporting neighborhood businesses and helping communities thrive.",
  },
  {
    title: "Real-time value",
    description:
      "Offers are time-sensitive. We surface deals when they matter most.",
  },
  {
    title: "Trust & quality",
    description:
      "Every shop is reviewed before going live to keep the platform reliable.",
  },
];

export default function AboutPage() {
  return (
    <div className="container-app py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          About Nearby Offers
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-600">
          Nearby Offers is a location-based platform that helps customers
          discover nearby shops and their latest discounts in real time — while
          giving shop owners a simple way to reach people in their area.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {values.map((value) => (
          <Card key={value.title}>
            <CardHeader>
              <CardTitle>{value.title}</CardTitle>
              <CardDescription>{value.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
