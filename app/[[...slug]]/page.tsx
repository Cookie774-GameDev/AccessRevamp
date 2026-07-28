import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessRevampClient } from "../accessrevamp-client";

type RouteProps = {
  params: Promise<{ slug?: string[] }>;
};

const routeCopy = new Map<string, readonly [string, string]>([
  ["/", ["Storefront revamps with a point of view", "AccessRevamp finds storefront friction, clarifies the offer, and builds a stronger one-time direction."]],
  ["/portfolio", ["Working website portfolio", "Explore original AccessRevamp website experiences with cinematic motion and interactive comparisons."]],
  ["/work", ["Working website portfolio", "Explore original AccessRevamp website experiences with cinematic motion and interactive comparisons."]],
  ["/services", ["Services", "Choose a free snapshot, focused reveal, complete website revamp, or cinematic scroll site."]],
  ["/process", ["Process", "See how AccessRevamp moves from public evidence to a human-reviewed direction."]],
  ["/pricing", ["One-time pricing", "Four clear AccessRevamp tiers with cumulative credit and no recurring platform fee."]],
  ["/free-snapshot", ["Free snapshot", "Request one bounded, human-reviewed observation from a public HTTPS page."]],
  ["/sample-report", ["Sample report", "See how AccessRevamp documents evidence, impact, and repair priorities."]],
  ["/methodology", ["Methodology", "A transparent, passive, human-reviewed assessment process."]],
  ["/outreach-standards", ["Outreach standards", "How AccessRevamp keeps business outreach relevant, accurate, reviewed, and easy to stop."]],
  ["/contact", ["Contact", "Tell AccessRevamp what you want to improve."]],
  ["/login", ["Sign in", "Access your AccessRevamp project workspace."]],
  ["/signup", ["Create an account", "Create your AccessRevamp project workspace."]],
  ["/forgot-password", ["Recover account", "Request a one-time AccessRevamp recovery email and choose a new password."]],
  ["/recover-account", ["Recover account", "Verify your AccessRevamp recovery code and choose a new password."]],
  ["/account/projects", ["Projects", "View your AccessRevamp projects and orders."]],
  ["/project-intake", ["Project brief", "Choose pages, share references, and upload private visual direction."]],
  ["/dashboard", ["Dashboard", "View your AccessRevamp projects and orders."]],
  ["/privacy", ["Privacy Policy", "How AccessRevamp handles account, project, order, and support information."]],
  ["/policy", ["Customer Service Policy", "How AccessRevamp handles scope, communication, revisions, approvals, and delivery."]],
  ["/terms", ["Terms of Service", "The legal terms for AccessRevamp accounts, orders, content rights, and services."]],
  ["/accessibility", ["Accessibility Statement", "The AccessRevamp accessibility commitment, testing approach, and support channel."]],
  ["/refunds", ["Refund Policy", "How cancellation and refund requests are reviewed before and after digital delivery."]],
  ["/legal", ["Policy Center", "AccessRevamp privacy, customer, refund, accessibility, outreach, and support information."]],
  ["/support", ["Customer Support", "Get help with accounts, orders, project progress, files, privacy, and accessibility."]],
  ["/customer-support", ["Customer Support", "Get help with accounts, orders, project progress, files, privacy, and accessibility."]],
  ["/cinematic-scroll", ["Cinematic evidence story", "Move from scattered signals through verified evidence to redesigned hierarchy and one clear action."]],
  ["/success", ["Payment verification", "Verify the durable AccessRevamp order created by a signed Stripe webhook."]],
  ["/cancel", ["Checkout return", "Return safely from Stripe Checkout without assuming a payment result."]],
]);

const privateRoutes = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/recover-account",
  "/account/projects",
  "/project-intake",
  "/dashboard",
  "/success",
  "/cancel",
]);

function pathFrom(params: { slug?: string[] }) {
  return params.slug?.length ? `/${params.slug.join("/")}` : "/";
}

function routeDetails(pathname: string) {
  const exact = routeCopy.get(pathname);
  if (exact) return { copy: exact, canonical: pathname, private: privateRoutes.has(pathname) };
  if (/^\/approve\/[^/]+$/.test(pathname)) {
    return {
      copy: ["Private project approval", "Review and confirm one AccessRevamp project direction."] as const,
      canonical: "/approve",
      private: true,
    };
  }
  if (/^\/preview\/[^/]+$/.test(pathname)) {
    return {
      copy: ["Private preview", "A private AccessRevamp review preview."] as const,
      canonical: "/preview",
      private: true,
    };
  }
  return null;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const pathname = pathFrom(await params);
  const route = routeDetails(pathname);
  if (!route) {
    return {
      title: "Page not found | AccessRevamp",
      robots: { index: false, follow: false },
    };
  }
  const [title, description] = route.copy;
  return {
    title: `${title} | AccessRevamp`,
    description,
    alternates: { canonical: route.canonical },
    robots: route.private
      ? { index: false, follow: false, noarchive: true }
      : { index: true, follow: true },
  };
}

export default async function AccessRevampPage({ params }: RouteProps) {
  const pathname = pathFrom(await params);
  if (!routeDetails(pathname)) notFound();
  return <AccessRevampClient />;
}
