/* File: src/App.tsx */
import React, { useState, useEffect, useRef } from "react";
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
  Sun,
  Moon,
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
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

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
    if (saved) {
      const parsedDrinks = JSON.parse(saved).map((drink: any) => ({
        ...drink,
        timestamp: new Date(drink.timestamp),
      }));
      // Filtrer les boissons consommées il y a moins de 24 heures
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return parsedDrinks.filter(
        (drink: DrinkInfo) => drink.timestamp >= twentyFourHoursAgo
      );
    }
    return [];
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
      amount: 250, // Revenu à la configuration initiale
      alcoholPercentage: 5, // Revenu à la configuration initiale
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
  ];

  // Références pour éviter les dépendances inutiles dans useEffect
  const drinksRef = useRef<DrinkInfo[]>(drinks);
  const userInfoRef = useRef<UserInfo>(userInfo);

  // Met à jour les références chaque fois que les états changent
  useEffect(() => {
    drinksRef.current = drinks;
  }, [drinks]);

  useEffect(() => {
    userInfoRef.current = userInfo;
  }, [userInfo]);

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
      // Supprimer les boissons consommées depuis plus de 24 heures
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      setDrinks((prevDrinks) =>
        prevDrinks.filter((drink) => drink.timestamp >= twentyFourHoursAgo)
      );

      const currentDrinks = drinksRef.current;

      if (currentDrinks.length > 0) {
        const currentResult = calculateBAC(currentDrinks, userInfoRef.current);
        setResult(currentResult);

        const newTimeline = generateBACTimeline(
          currentDrinks,
          userInfoRef.current
        );
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
  }, []); // Pas de dépendances pour éviter les boucles infinies

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
        const proposedTime = new Date(lastTime.getTime() + 30 * 60 * 1000);
        newTime = proposedTime > new Date() ? new Date() : proposedTime;
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
    const lastDrink = drinksRef.current[drinksRef.current.length - 1];
    let newTime: Date;

    if (lastDrink) {
      const lastTime = new Date(lastDrink.timestamp);
      const diff = Date.now() - lastTime.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        const proposedTime = new Date(lastTime.getTime() + 30 * 60 * 1000);
        newTime = proposedTime > new Date() ? new Date() : proposedTime;
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

      // Si ce n'est pas un duplicata, on l'ajoute dans les savedDrinks (au début)
      if (!isDuplicate) {
        setSavedDrinks((prev) => [drinkToSave, ...prev]);
      }

      // On ajoute aussi cette boisson à la liste "drinks" consommées
      const drinkForList: DrinkInfo = {
        id: Date.now().toString(),
        name: drinkToSave.name,
        amount: drinkToSave.amount,
        alcoholPercentage: drinkToSave.alcoholPercentage,
        timestamp,
      };
      setDrinks((prev) => [drinkForList, ...prev]); // Ajouter au début pour affichage inverse

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
        const proposedTime = new Date(lastDrinkTime.getTime() + 30 * 60 * 1000);
        nextTime = proposedTime > new Date() ? new Date() : proposedTime;
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
    setDrinks((prev) => prev.filter((drink) => drink.id !== id));
  };

  /**
   * Supprime une boisson du 'savedDrinks'
   */
  const removeSavedDrink = (id: string) => {
    setSavedDrinks((prev) => prev.filter((drink) => drink.id !== id));
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

  /**
   * Trouve l'heure à laquelle le BAC atteint un seuil donné
   * en commençant l'itération à partir du premier moment où BAC > 0
   */
  const getTimeAt = (
    threshold: number,
    data: { time: Date; bac: number }[]
  ): Date | null => {
    let started = false;
    for (let i = 0; i < data.length; i++) {
      if (data[i].bac > 0) {
        started = true;
      }
      if (started && data[i].bac <= threshold) {
        return data[i].time;
      }
    }
    return null;
  };

  /**
   * Détermine quelle phrase afficher en fonction du niveau actuel de BAC
   */
  const getDisplayTime = (
    currentBAC: number,
    data: { time: Date; bac: number }[]
  ): { label: string; time: Date | null } => {
    if (currentBAC < 0.2) {
      return {
        label: "Vous serez à 0g/L à",
        time: getTimeAt(0, data),
      };
    } else if (currentBAC < 0.5) {
      return {
        label: "Vous serez à 0.2g/L à",
        time: getTimeAt(0.2, data),
      };
    } else {
      return {
        label: "Vous serez à 0.5g/L à",
        time: getTimeAt(0.5, data),
      };
    }
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
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6 relative">
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {theme === "light" ? (
              <Moon className="w-6 h-6" />
            ) : (
              <Sun className="w-6 h-6" />
            )}
          </button>
        </div>
        <div className="text-center mb-8">
          <img
            src="logo.png"
            alt="Drink & Drive Logo"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 transition-colors">
            Drink & Drive
          </h1>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
            Calculez votre taux d'alcoolémie. Boire et conduire ? Oui, mais de
            manière responsable !
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations utilisateur */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center mb-4">
              <UserCircle2 className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 transition-colors">
                Vos Informations
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Genre
                </label>
                <select
                  value={userInfo.gender}
                  onChange={handleGenderChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition-colors"
                >
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ajouter une boisson */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 md:order-3 lg:order-2 transition-colors">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100 transition-colors">
              Ajouter une boisson
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Nom (optionnel)
                </label>
                <input
                  type="text"
                  value={newDrink.name}
                  onChange={(e) =>
                    setNewDrink((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition-colors"
                  placeholder="Cuvée des Trolls"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
                  Volume (ml)
                </label>
                <input
                  type="number"
                  value={newDrink.amount}
                  onChange={(e) =>
                    setNewDrink((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition-colors"
                  placeholder="250"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition-colors"
                  placeholder="7"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition-colors"
                  >
                    {timeOptions.hours.map((hour) => (
                      <option key={hour.value} value={hour.value}>
                        {hour.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 md:order-2 lg:order-3 transition-colors">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100 transition-colors">
              Boissons standards
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {standardDrinks.map((drink) => (
                <button
                  key={drink.id}
                  onClick={() => prefillDrinkForm(drink.id)}
                  className="flex flex-col items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {drink.icon}
                  <span className="text-sm text-gray-800 dark:text-gray-200 transition-colors">
                    {drink.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Boissons sauvegardées + Boissons consommées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Boissons sauvegardées */}
          {savedDrinks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 h-80 overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700 transition-colors">
              <div className="flex items-center mb-4">
                <History className="w-6 h-6 text-blue-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 transition-colors">
                  Boissons sauvegardées
                </h2>
              </div>
              <div className="space-y-3">
                {savedDrinks.map((drink) => (
                  <div
                    key={drink.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <GlassWater className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 transition-colors">
                        {drink.name} - {drink.amount}ml (
                        {drink.alcoholPercentage}%)
                      </span>
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 h-80 overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700 transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100 transition-colors">
                Boissons consommées
              </h2>
              <div className="space-y-3">
                {drinks.map((drink) => (
                  <div
                    key={drink.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <GlassWater className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-gray-800 dark:text-gray-200 transition-colors">
                        {drink.name} - {drink.amount}ml (
                        {drink.alcoholPercentage}%)
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                        {drink.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
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
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 transition-colors ${
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
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 transition-colors">
                  Taux d'alcool : {result.bac}g/L
                </h2>
              </div>

              {/* Affiche une seule phrase selon le niveau de BAC */}
              {timeline.length > 0 && (
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors">
                  {(() => {
                    const display = getDisplayTime(result.bac, timeline);
                    return (
                      <p>
                        {display.label}{" "}
                        {display.time
                          ? display.time.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Calcul en cours..."}
                      </p>
                    );
                  })()}
                </div>
              )}

              <p className="text-gray-700 dark:text-gray-300 mt-2 transition-colors">
                {result.bac > 0.8
                  ? "NE CONDUISEZ PAS. Votre taux est au-dessus de la limite légale. Appelez un taxi."
                  : result.message}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sm:p-0 transition-colors">
              {" "}
              {/* Suppression du padding sur mobile */}
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100 px-6 pt-6 sm:px-6 sm:pt-6 transition-colors">
                Évolution du taux d'alcoolémie
              </h2>
              <BACChart data={timeline} />
            </div>
          </div>
        )}

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8 transition-colors">
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
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
