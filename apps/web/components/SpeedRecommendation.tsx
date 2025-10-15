"use client";

type Props = { weeklyKg: number; recommendedKg?: number };

export default function SpeedRecommendation({ weeklyKg, recommendedKg = 0.8 }: Props) {
  let text = "";
  let cls = "";

  if (weeklyKg < 0.4) {
    text = "איטי מאוד – אפשר להגביר";
    cls = "bg-white/5 text-white border-white/10";
  } else if (weeklyKg < 0.7) {
    text = "איטי אבל בטוח";
    cls = "bg-white/5 text-white border-white/10";
  } else if (weeklyKg <= 0.9) {
    text = `מומלץ: ${recommendedKg} ק"ג לשבוע`;
    cls = "bg-[#1f2a1f] text-[#E2F163] border-[#E2F163]/20";
  } else if (weeklyKg <= 1.2) {
    text = "מהיר – ודא התאוששות טובה";
    cls = "bg-[#2a2416] text-[#f6c453] border-[#f6c453]/20";
  } else {
    text = "מהיר מדי – שקול להאט";
    cls = "bg-[#2a1b1b] text-[#f87171] border-[#f87171]/20";
  }

  return (
    <div dir="rtl" className="w-full flex justify-center">
      <div
        className={[
          "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-150",
          cls,
        ].join(" ")}
        aria-live="polite"
      >
        {text}
      </div>
    </div>
  );
}
