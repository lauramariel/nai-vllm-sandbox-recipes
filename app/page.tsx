import { buildRecipeIndex, loadRecipes } from "@/lib/recipes";
import { BrowseIndex } from "./BrowseIndex";

export default function Home() {
  const index = buildRecipeIndex(loadRecipes());
  return <BrowseIndex recipes={index} />;
}
