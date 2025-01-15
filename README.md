Here's the prompts that were given to an AI to create this project.
Use them so you understand the context of the project

Build a mobile-friendly webapp using React + TypeScript
It will be used to calculate the blood alcohol level, so the user can know if he's able to drive or not
It should be beautiful, as any startup website from nowadays

Rollback to Checkpoint
Translate all the website in french (I don't care about english)
The legal alcohol rate in France is 0.5g/liters of blood.
I also want to be able to customize the alcohol contained in a drink, and the volume of the drink.
The user can optionally put a name for the drink as well.
I want every added drink to be stored in a history, so the user can select the drink he already has drank, again
Change to name, I want it to be called "Drink&Drive"

Name it "Drink & Drive" with a space
I want the page to be mobile-first, but responsive. Blocks can be placed on a same line in tablet/desktop.
I want a placeholder in the "Volume" field at 500
I want a placeholder in the "Degré d'alcool" field at 7
And I want the "Nom" placeholder to be replaced by "Cuvée des Trolls"
I want the user to be able to add the hour at which he drank the glass, and the result should be impacted by that. A result is at a given time, alcohol blood rate can vary through time.
When the user adds a saved drink back, you will pre-fill the form with another drink 30 minutes after the previous drink that the user has drank.
I want everything in the page to be stored in the localStorage or any good local storage solution.
Add a little reset button at the end of the page (with a confirmation alert so there's no misclick)

Simplify the "Heure de consommation". I don't need a whole datepicker, just put two fields (hours and minutes) like dropdowns with a 15-minute step. The default values will be the closest from now in the past.
The math has to be smart and detect the day automatically. For example, if I get a drink at 23:30 and another at 00:30, the system has to count for the both of the drinks I drank when it's 1:00. Let's assume people will not drink at 8 in the morning to simplify the math, so you can use 8am to make your "rotation" if needed
Add a sexy graphic giving the blood alcohol level in function of time. There should be a mark at 0.5 so the user know at what exact time he will be able to take the wheel
