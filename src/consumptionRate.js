import { differenceInDays } from 'date-fns';

// Quiet intervals are still elapsed time. Dropping them makes a bottle that
// sells once, then sits, look like it sells that amount every day.
// Restocks stay out of the average: the net increase hides how much was poured.
export function summarizeConsumption(entries) {
  let totalConsumed = 0;
  let totalDays = 0;
  let periodsCount = 0;

  for (let i = 1; i < entries.length; i++) {
    const previous = entries[i - 1];
    const current = entries[i];
    const amountChange = previous.amount - current.amount;
    const daysChange = differenceInDays(current.date, previous.date);

    if (daysChange > 0 && amountChange >= 0) {
      totalConsumed += amountChange;
      totalDays += daysChange;
      if (amountChange > 0) periodsCount++;
    }
  }

  return { totalConsumed, totalDays, periodsCount };
}
