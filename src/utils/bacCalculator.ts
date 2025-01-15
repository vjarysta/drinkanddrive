import { DrinkInfo, UserInfo, BACResult } from "../types";

export function calculateBAC(
  drinks: DrinkInfo[],
  userInfo: UserInfo
): BACResult {
  const { weight, gender } = userInfo;
  const r = gender === "male" ? 0.68 : 0.55;

  let totalAlcohol = 0;
  const now = new Date();

  drinks.forEach((drink) => {
    const drinkTime = new Date(drink.timestamp);
    const hoursSinceDrink =
      (now.getTime() - drinkTime.getTime()) / (1000 * 60 * 60);
    const alcoholGrams =
      ((drink.amount * drink.alcoholPercentage) / 100) * 0.789; // Densité de l'alcool
    const eliminatedAlcohol = hoursSinceDrink * 0.015;

    const remainingBACFromDrink =
      alcoholGrams / (weight * r) - eliminatedAlcohol;
    totalAlcohol += Math.max(0, remainingBACFromDrink);
  });

  const result: BACResult = {
    bac: Number(totalAlcohol.toFixed(3)),
    status: "safe",
    message: "",
    timestamp: now,
  };

  if (result.bac === 0) {
    result.message = "Vous êtes sobre !";
  } else if (result.bac < 0.25) {
    result.status = "safe";
    result.message = "Vous êtes sous la limite légale, mais restez prudent.";
  } else if (result.bac < 0.5) {
    result.status = "caution";
    result.message =
      "Vous approchez la limite légale. Attendez avant de conduire.";
  } else {
    result.status = "danger";
    result.message =
      "NE CONDUISEZ PAS. Votre taux est au-dessus de la limite légale. Appelez un taxi.";
  }

  return result;
}
