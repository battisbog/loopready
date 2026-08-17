import { redirect } from "next/navigation";

/**
 * Legacy entry point. Pricing used to link here before checkout existed;
 * keep it working for any bookmarked or shared links.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; product?: string }>;
}) {
  const { plan, product } = await searchParams;
  const query = product
    ? `product=${encodeURIComponent(product)}`
    : `plan=${encodeURIComponent(plan ?? "voice")}`;
  redirect(`/checkout?${query}`);
}
