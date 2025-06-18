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
  const selectedDate = new Date();
  selectedDate.setHours(hours, minutes, 0, 0);

  // Gère le passage à minuit : si on est en fin de soirée et qu'on
  // sélectionne une heure tôt le matin, on considère que c'est pour le lendemain.
  // Ex: il est 23h30, on sélectionne 00h30 -> on veut le 00h30 dans 1h, pas celui d'il y a 23h.
  if (now.getHours() >= 21 && hours <= 3) {
    const potentialNextDay = new Date(selectedDate);
    potentialNextDay.setDate(potentialNextDay.getDate() + 1);
    // Si cette heure est dans un futur proche (moins de 3h), on la prend.
    if (
      potentialNextDay > now &&
      potentialNextDay.getTime() - now.getTime() < 3 * 60 * 60 * 1000
    ) {
      return potentialNextDay;
    }
  }

  // Si l'heure sélectionnée est dans le futur (hors cas de minuit ci-dessus)
  if (selectedDate > now) {
    // Si c'est dans plus de 3h, on suppose que c'était hier.
    if (selectedDate.getTime() - now.getTime() > 3 * 60 * 60 * 1000) {
      selectedDate.setDate(selectedDate.getDate() - 1);
    }
    // Sinon, c'est dans moins de 3h, on garde la date d'aujourd'hui.
  }

  // Pour les heures passées, on suppose que c'est aujourd'hui.
  return selectedDate;
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
