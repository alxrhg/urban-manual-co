import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCoverage() {
  const { count: total } = await supabase
    .from("destinations")
    .select("*", { count: "exact", head: true });

  const { count: hasRatingsTotal } = await supabase
    .from("destinations")
    .select("*", { count: "exact", head: true })
    .not("user_ratings_total", "is", null);

  const { count: hasRating } = await supabase
    .from("destinations")
    .select("*", { count: "exact", head: true })
    .not("rating", "is", null);

  const { count: hasTrending } = await supabase
    .from("destinations")
    .select("*", { count: "exact", head: true })
    .gt("trending_score", 0);

  const t = total || 1;
  console.log("Data Coverage:");
  console.log(`Total destinations: ${total}`);
  console.log(
    `user_ratings_total: ${hasRatingsTotal}/${total} (${Math.round(((hasRatingsTotal || 0) / t) * 100)}%)`
  );
  console.log(
    `rating: ${hasRating}/${total} (${Math.round(((hasRating || 0) / t) * 100)}%)`
  );
  console.log(
    `trending_score > 0: ${hasTrending}/${total} (${Math.round(((hasTrending || 0) / t) * 100)}%)`
  );

  // Sample some destinations with high ratings total
  const { data: topRated } = await supabase
    .from("destinations")
    .select("name, city, user_ratings_total, rating")
    .not("user_ratings_total", "is", null)
    .order("user_ratings_total", { ascending: false })
    .limit(5);

  console.log("\nTop 5 by review count:");
  topRated?.forEach((d) => {
    console.log(
      `  ${d.name} (${d.city}): ${d.user_ratings_total} reviews, ${d.rating} rating`
    );
  });
}

checkCoverage();
