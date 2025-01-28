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

  // Si l'heure sélectionnée est dans le futur ou à plus de 24h dans le passé,
  // on ajuste le jour en conséquence
  if (selectedTime > now) {
    selectedTime.setDate(selectedTime.getDate() - 1);
  } else if (now.getTime() - selectedTime.getTime() > 24 * 60 * 60 * 1000) {
    selectedTime.setDate(selectedTime.getDate() + 1);
  }

  // Si l'heure est avant 8h du matin, on suppose que c'était la veille
  if (selectedTime.getHours() < 8) {
    selectedTime.setDate(selectedTime.getDate() - 1);
  }

  return selectedTime;
}

/**
 * Génére une timeline avec une fenêtre personnalisée,
 * incluant les heures passées et futures.
 */
export function generateBACTimeline(
  drinks: any[],
  userInfo: any,
  pastHours = 8,
  futureHours = 4,
  stepMinutes = 5
): { time: Date; bac: number }[] {
  const now = new Date();
  const startTime = new Date(now.getTime() - pastHours * 60 * 60 * 1000);
  // const endTime = new Date(now.getTime() + futureHours * 60 * 60 * 1000);
  const timeline: { time: Date; bac: number }[] = [];

  const totalSteps = ((pastHours + futureHours) * 60) / stepMinutes;

  const r = userInfo.gender === "male" ? 0.68 : 0.55;

  for (let i = 0; i <= totalSteps; i++) {
    const time = new Date(startTime.getTime() + i * stepMinutes * 60 * 1000);

    let totalBAC = 0;

    drinks.forEach((drink) => {
      const drinkTime = new Date(drink.timestamp);

      if (drinkTime <= time) {
        const hoursSinceDrink =
          (time.getTime() - drinkTime.getTime()) / (1000 * 60 * 60);

        // Grammes d'alcool pur
        const alcoholGrams =
          ((drink.amount * drink.alcoholPercentage) / 100) * 0.789;

        // Taux d'élimination horaire (corrigé à 0.15)
        const eliminatedAlcohol = hoursSinceDrink * 0.15;

        // BAC résiduel de cette boisson
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
