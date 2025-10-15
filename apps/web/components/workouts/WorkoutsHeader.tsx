import StickyHeader from "@/components/ui/StickyHeader";
import texts from "@/lib/assistantTexts";

export function WorkoutsHeader() {
  return <StickyHeader title={texts.workouts.title} />;
}
