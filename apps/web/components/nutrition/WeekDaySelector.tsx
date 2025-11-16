"use client";

type Props = {
  currentDayIndex: number;
  onDayChange: (index: number) => void;
};

const HEBREW_DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

export function WeekDaySelector({ currentDayIndex, onDayChange }: Props) {
  // Get current date and day of week
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate the start of the current week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - todayDayOfWeek);

  // Generate 7 days from Sunday to Saturday
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const dayOfWeek = date.getDay();

    return {
      index: i,
      dayName: HEBREW_DAYS[dayOfWeek],
      dayNumber: date.getDate(),
      isToday: dayOfWeek === todayDayOfWeek && date.getDate() === today.getDate(),
      isPast: i < todayDayOfWeek, // Day has already passed
      isFuture: i > todayDayOfWeek, // Day hasn't arrived yet
    };
  });

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide" dir="rtl">
      <div className="flex gap-2 justify-between px-1">
        {days.map((day) => {
          const isSelected = currentDayIndex === day.index;

          return (
            <button
              key={day.index}
              onClick={() => onDayChange(day.index)}
              className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity flex-1"
            >
              {/* Circular button with day letter */}
              <div
                className={`
                  w-11 h-11 rounded-full
                  flex items-center justify-center
                  text-lg font-bold
                  transition-all duration-200
                  ${
                    isSelected
                      ? "text-black"
                      : day.isFuture
                      ? "bg-transparent text-white border-2 border-dashed border-neutral-600"
                      : "bg-transparent text-white"
                  }
                `}
                style={isSelected ? { backgroundColor: "#e2f163" } : undefined}
              >
                {day.dayName}
              </div>

              {/* Day number below circle */}
              <span
                className={`text-sm font-medium ${isSelected ? "" : "text-neutral-400"}`}
                style={isSelected ? { color: "#e2f163" } : undefined}
              >
                {day.dayNumber}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
