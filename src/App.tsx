/* File: src/App.tsx */
import React, { useState, useEffect } from "react";
import {
  Beer,
  Wine,
  GlassWater,
  UserCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  History,
  RotateCcw,
  Martini,
} from "lucide-react";
import { DrinkInfo, UserInfo, BACResult, SavedDrink } from "./types";
import { calculateBAC } from "./utils/bacCalculator";
import {
  roundToNearest15Minutes,
  generateTimeOptions,
  normalizeTime,
  generateBACTimeline,
} from "./utils/timeUtils";
import { BACChart } from "./components/BACChart";

function App() {
  const [userInfo, setUserInfo] = useState<UserInfo>(() => {
    const saved = localStorage.getItem("userInfo");
    return saved
      ? JSON.parse(saved)
      : {
          weight: 70,
          gender: "male",
        };
  });

  const [drinks, setDrinks] = useState<DrinkInfo[]>(() => {
    const saved = localStorage.getItem("drinks");
    return saved
      ? JSON.parse(saved).map((drink: any) => ({
          ...drink,
          timestamp: new Date(drink.timestamp),
        }))
      : [];
  });

  const [result, setResult] = useState<BACResult | null>(null);

  const [savedDrinks, setSavedDrinks] = useState<SavedDrink[]>(() => {
    const saved = localStorage.getItem("savedDrinks");
    return saved ? JSON.parse(saved) : [];
  });

  // Prépare l'heure par défaut (arrondie au quart d'heure précédent)
  const defaultTime = roundToNearest15Minutes(new Date());
  const [selectedTime, setSelectedTime] = useState(defaultTime);

  // Boisson en cours de saisie
  const [newDrink, setNewDrink] = useState({
    name: "",
    amount: "",
    alcoholPercentage: "",
  });

  // Options pour les dropdowns de l'heure
  const timeOptions = generateTimeOptions();

  // Timeline du BAC pour le graphique
  const [timeline, setTimeline] = useState<{ time: Date; bac: number }[]>([]);

  /**
   * Boissons standards, juste pour pré-remplir le formulaire.
   * Les volumes et degrés d'alcool sont approximatifs, vous pouvez ajuster.
   */
  const standardDrinks = [
    {
      id: "beer",
      label: "Bière",
      icon: <Beer className="w-8 h-8 text-amber-500 mb-2" />,
      amount: 250,
      alcoholPercentage: 5,
    },
    {
      id: "wine",
      label: "Vin",
      icon: <Wine className="w-8 h-8 text-red-500 mb-2" />,
      amount: 125,
      alcoholPercentage: 12,
    },
    {
      id: "shot",
      label: "Shot",
      icon: <GlassWater className="w-8 h-8 text-purple-500 mb-2" />,
      amount: 25,
      alcoholPercentage: 40,
    },
    {
      id: "cocktail",
      label: "Cocktail",
      icon: <Martini className="w-8 h-8 text-green-500 mb-2" />,
      amount: 200,
      alcoholPercentage: 12,
    },
    {
      id: "pastis",
      label: "Pastis",
      icon: <GlassWater className="w-8 h-8 text-yellow-400 mb-2" />,
      amount: 25,
      alcoholPercentage: 45,
    },
  ];

  // Sauvegarde dans localStorage à chaque fois que userInfo, drinks ou savedDrinks changent
  useEffect(() => {
    localStorage.setItem("userInfo", JSON.stringify(userInfo));
  }, [userInfo]);

  useEffect(() => {
    localStorage.setItem("drinks", JSON.stringify(drinks));
  }, [drinks]);

  useEffect(() => {
    localStorage.setItem("savedDrinks", JSON.stringify(savedDrinks));
  }, [savedDrinks]);

  /**
   * Mise à jour automatique du BAC et de la timeline toutes les secondes.
   * Si le BAC retombe à 0, on efface l'historique de boissons.
   */
  useEffect(() => {
    const updateBAC = () => {
      if (drinks.length > 0) {
        const currentResult = calculateBAC(drinks, userInfo);
        setResult(currentResult);

        const newTimeline = generateBACTimeline(drinks, userInfo);
        setTimeline(newTimeline);

        // Si le taux retombe à 0, on supprime l'historique des boissons consommées
        if (currentResult.bac <= 0) {
          setDrinks([]);
          setResult(null);
          setTimeline([]);
        }
      } else {
        setResult(null);
        setTimeline([]);
      }
    };

    // Mise à jour initiale
    updateBAC();

    // Rafraîchissement chaque seconde
    const interval = setInterval(updateBAC, 1000);
    return () => clearInterval(interval);
  }, [drinks, userInfo]);

  /**
   * Pré-remplit le formulaire avec une boisson standard,
   * en décalant l'heure de 30min après la dernière boisson
   * UNIQUEMENT si la dernière boisson a été prise il y a moins de 24h.
   */
  const prefillDrinkForm = (drinkId: string) => {
    const found = standardDrinks.find((d) => d.id === drinkId);
    if (!found) return;

    setNewDrink({
      name: found.label,
      amount: String(found.amount),
      alcoholPercentage: String(found.alcoholPercentage),
    });

    const lastDrink = drinks[drinks.length - 1];
    let newTime: Date;

    if (lastDrink) {
      const lastTime = new Date(lastDrink.timestamp);
      const diff = Date.now() - lastTime.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        newTime = new Date(lastTime.getTime() + 30 * 60 * 1000);
      } else {
        newTime = new Date();
      }
    } else {
      newTime = new Date();
    }

    const roundedTime = roundToNearest15Minutes(newTime);
    setSelectedTime(roundedTime);
  };

  /**
   * Quand on ajoute une boisson depuis la liste 'savedDrinks',
   * même logique pour l'heure par défaut (décalage 30min si < 24h).
   */
  const addSavedDrink = (drink: SavedDrink) => {
    const lastDrink = drinks[drinks.length - 1];
    let newTime: Date;

    if (lastDrink) {
      const lastTime = new Date(lastDrink.timestamp);
      const diff = Date.now() - lastTime.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        newTime = new Date(lastTime.getTime() + 30 * 60 * 1000);
      } else {
        newTime = new Date();
      }
    } else {
      newTime = new Date();
    }

    const roundedTime = roundToNearest15Minutes(newTime);
    setSelectedTime(roundedTime);

    setNewDrink({
      name: drink.name,
      amount: drink.amount.toString(),
      alcoholPercentage: drink.alcoholPercentage.toString(),
    });
  };

  /**
   * Ajoute la boisson actuellement dans le formulaire
   * à la liste des boissons consommées + historique
   */
  const addDrink = () => {
    if (Number(newDrink.amount) > 0 && Number(newDrink.alcoholPercentage) > 0) {
      const timestamp = normalizeTime(selectedTime.hours, selectedTime.minutes);

      // On crée un objet pour l'historique
      const drinkToSave: SavedDrink = {
        id: Date.now().toString(),
        name: newDrink.name || `Boisson ${newDrink.alcoholPercentage}%`,
        amount: Number(newDrink.amount),
        alcoholPercentage: Number(newDrink.alcoholPercentage),
      };

      // Vérifie si la boisson existe déjà dans les savedDrinks
      const isDuplicate = savedDrinks.some(
        (drink) =>
          drink.name === drinkToSave.name &&
          drink.amount === drinkToSave.amount &&
          drink.alcoholPercentage === drinkToSave.alcoholPercentage
      );

      // Si ce n'est pas un duplicata, on l'ajoute dans les savedDrinks
      if (!isDuplicate) {
        setSavedDrinks((prev) => [...prev, drinkToSave]);
      }

      // On ajoute aussi cette boisson à la liste "drinks" consommées
      const drinkForList: DrinkInfo = {
        id: Date.now().toString(),
        name: drinkToSave.name,
        amount: drinkToSave.amount,
        alcoholPercentage: drinkToSave.alcoholPercentage,
        timestamp,
      };
      setDrinks((prev) => [...prev, drinkForList]);

      // On réinitialise le formulaire
      setNewDrink({
        name: "",
        amount: "",
        alcoholPercentage: "",
      });

      // On recalcule l'heure par défaut pour la prochaine boisson
      // en se basant sur la boisson qu'on vient d'ajouter,
      // uniquement si elle est de moins de 24h
      const lastDrinkTime = new Date(timestamp);
      let nextTime: Date;
      const diff = Date.now() - lastDrinkTime.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        nextTime = new Date(lastDrinkTime.getTime() + 30 * 60 * 1000);
      } else {
        nextTime = new Date();
      }
      setSelectedTime(roundToNearest15Minutes(nextTime));
    }
  };

  /**
   * Supprime une boisson de la liste 'drinks'
   */
  const removeDrink = (id: string) => {
    setDrinks(drinks.filter((drink) => drink.id !== id));
  };

  /**
   * Supprime une boisson du 'savedDrinks'
   */
  const removeSavedDrink = (id: string) => {
    setSavedDrinks(savedDrinks.filter((drink) => drink.id !== id));
  };

  /**
   * Reset total
   */
  const resetAll = () => {
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir tout réinitialiser ? Cette action est irréversible."
      )
    ) {
      setDrinks([]);
      setSavedDrinks([]);
      setUserInfo({
        weight: 70,
        gender: "male",
      });
      setNewDrink({
        name: "",
        amount: "",
        alcoholPercentage: "",
      });
      setResult(null);
      setTimeline([]);
      localStorage.clear();
    }
  };

  // Trouve la première date dans la timeline où le BAC tombe à 0
  const getTimeAtZero = (data: { time: Date; bac: number }[]): Date | null => {
    return data.find((point) => point.bac === 0)?.time || null;
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGender = e.target.value;
    if (selectedGender === "other") {
      window.location.href =
        "https://greatergood.berkeley.edu/article/item/seven_ways_to_find_your_purpose_in_life";
    } else {
      setUserInfo({ ...userInfo, gender: selectedGender as "male" | "female" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Drink & Drive
          </h1>
          <p className="text-gray-600">
            Calculez votre taux d'alcoolémie de manière responsable
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Informations utilisateur */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <UserCircle2 className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold">Vos Informations</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poids (kg)
                </label>
                <input
                  type="text"
                  value={userInfo.weight}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value)) {
                      setUserInfo({ ...userInfo, weight: Number(value) });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre
                </label>
                <select
                  value={userInfo.gender}
                  onChange={handleGenderChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ajouter une boisson */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Ajouter une boisson</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom (optionnel)
                </label>
                <input
                  type="text"
                  value={newDrink.name}
                  onChange={(e) =>
                    setNewDrink((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Cuvée des Trolls"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume (ml)
                </label>
                <input
                  type="number"
                  value={newDrink.amount}
                  onChange={(e) =>
                    setNewDrink((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Degré d'alcool (%)
                </label>
                <input
                  type="number"
                  value={newDrink.alcoholPercentage}
                  onChange={(e) =>
                    setNewDrink((prev) => ({
                      ...prev,
                      alcoholPercentage: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="7"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure
                  </label>
                  <select
                    value={selectedTime.hours}
                    onChange={(e) =>
                      setSelectedTime((prev) => ({
                        ...prev,
                        hours: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {timeOptions.hours.map((hour) => (
                      <option key={hour.value} value={hour.value}>
                        {hour.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minutes
                  </label>
                  <select
                    value={selectedTime.minutes}
                    onChange={(e) =>
                      setSelectedTime((prev) => ({
                        ...prev,
                        minutes: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {timeOptions.minutes.map((minute) => (
                      <option key={minute.value} value={minute.value}>
                        {minute.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={addDrink}
                className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Boissons standards (préremplir le formulaire) */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Boissons standards</h2>
            <div className="grid grid-cols-3 gap-4">
              {standardDrinks.map((drink) => (
                <button
                  key={drink.id}
                  onClick={() => prefillDrinkForm(drink.id)}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {drink.icon}
                  <span className="text-sm">{drink.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Boissons sauvegardées + Boissons consommées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Boissons sauvegardées */}
          {savedDrinks.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center mb-4">
                <History className="w-6 h-6 text-blue-500 mr-2" />
                <h2 className="text-xl font-semibold">Boissons sauvegardées</h2>
              </div>
              <div className="space-y-3">
                {savedDrinks.map((drink) => (
                  <div
                    key={drink.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <GlassWater className="w-5 h-5 text-blue-500 mr-2" />
                      <div>
                        <span className="font-medium">{drink.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {drink.amount}ml ({drink.alcoholPercentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => addSavedDrink(drink)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeSavedDrink(drink.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste des boissons consommées */}
          {drinks.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Boissons consommées
              </h2>
              <div className="space-y-3">
                {drinks.map((drink) => (
                  <div
                    key={drink.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <GlassWater className="w-5 h-5 text-blue-500 mr-2" />
                      <div>
                        <span className="font-medium">{drink.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {drink.amount}ml ({drink.alcoholPercentage}%)
                        </span>
                        <br />
                        <span className="text-xs text-gray-500">
                          {drink.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeDrink(drink.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Résultat et Graphique */}
        {result && (
          <div className="mt-6 space-y-6">
            <div
              className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${
                result.status === "safe"
                  ? "border-green-500"
                  : result.status === "caution"
                  ? "border-yellow-500"
                  : "border-red-500"
              }`}
            >
              <div className="flex items-center mb-4">
                <AlertTriangle
                  className={`w-6 h-6 mr-2 ${
                    result.status === "safe"
                      ? "text-green-500"
                      : result.status === "caution"
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                />
                <h2 className="text-xl font-semibold">
                  Taux d'alcool : {result.bac}g/L
                </h2>
              </div>
              <p className="text-gray-700">{result.message}</p>

              {/* Affiche l'heure à laquelle l'alcoolémie retombera à 0 */}
              {timeline.length > 0 && (
                <p className="text-gray-700 mt-2">
                  Vous serez à 0g/L à{" "}
                  {(() => {
                    const zeroTime = getTimeAtZero(timeline);
                    return zeroTime
                      ? zeroTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "...";
                  })()}
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Évolution du taux d'alcoolémie
              </h2>
              <BACChart data={timeline} />
            </div>
          </div>
        )}

        <div className="text-center text-sm text-gray-500 mt-8">
          <p>
            Ce calculateur fournit des estimations uniquement. De nombreux
            facteurs peuvent affecter votre taux d'alcoolémie.
          </p>
          <p className="mt-2">
            En cas de doute, ne conduisez pas. Appelez un taxi ou utilisez un
            VTC.
          </p>
          <button
            onClick={resetAll}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
