/* File: src/utils/timeUtils.tsx */
export function roundToNearest15Minutes(date: Date): {
  hours: number;
  minutes: number;
} {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  return {
    hours: date.getHours(),
    minutes: roundedMinutes,
  };
}

export function generateTimeOptions(): {
  hours: { value: number; label: string }[];
  minutes: { value: number; label: string }[];
} {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, "0"),
  }));

  const minutes = Array.from({ length: 4 }, (_, i) => ({
    value: i * 15,
    label: (i * 15).toString().padStart(2, "0"),
  }));

  return { hours, minutes };
}

export function normalizeTime(hours: number, minutes: number): Date {
  const now = new Date();
  const selectedTime = new Date(now);
  selectedTime.setHours(hours, minutes, 0, 0);

  // If the selected time is in the future or more than 24 hours in the past,
  // adjust the day accordingly
  if (selectedTime > now) {
    selectedTime.setDate(selectedTime.getDate() - 1);
  } else if (now.getTime() - selectedTime.getTime() > 24 * 60 * 60 * 1000) {
    selectedTime.setDate(selectedTime.getDate() + 1);
  }

  // If the time is before 8 AM, assume it's from the previous day
  if (selectedTime.getHours() < 8) {
    selectedTime.setDate(selectedTime.getDate() - 1);
  }

  return selectedTime;
}

export function generateBACTimeline(
  drinks: any[],
  userInfo: any,
  hours = 24
): { time: Date; bac: number }[] {
  const now = new Date();
  const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const timeline: { time: Date; bac: number }[] = [];

  // Generate points every 15 minutes
  for (let i = 0; i <= hours * 4; i++) {
    const time = new Date(startTime.getTime() + i * 15 * 60 * 1000);
    let totalBAC = 0;

    drinks.forEach((drink) => {
      const drinkTime = new Date(drink.timestamp);
      if (drinkTime <= time) {
        const hoursSinceDrink =
          (time.getTime() - drinkTime.getTime()) / (1000 * 60 * 60);
        const alcoholGrams =
          ((drink.amount * drink.alcoholPercentage) / 100) * 0.789;
        const r = userInfo.gender === "male" ? 0.68 : 0.55;
        const eliminatedAlcohol = hoursSinceDrink * 0.015;
        const remainingBACFromDrink =
          alcoholGrams / (userInfo.weight * r) - eliminatedAlcohol;
        totalBAC += Math.max(0, remainingBACFromDrink);
      }
    });

    timeline.push({
      time,
      bac: Number(totalBAC.toFixed(3)),
    });
  }

  return timeline;
}
