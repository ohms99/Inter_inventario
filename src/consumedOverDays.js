import { differenceInCalendarDays } from 'date-fns';

// Inventory snapshots are usually taken at closing, often a little under 24 hours
// apart. differenceInDays only counts whole 24-hour blocks, so those nights were
// treated as zero days and the pours between them were thrown away.
export function consumedOverDays(entries) {
  let totalConsumed = 0;
  let totalDays = 0;
  let periodsCount = 0;

  for (let i = 1; i < entries.length; i++) {
    const previous = entries[i - 1];
    const current = entries[i];
    const amountChange = previous.amount - current.amount;
    const daysChange = differenceInCalendarDays(current.date, previous.date);

    if (daysChange > 0 && amountChange > 0) {
      totalConsumed += amountChange;
      totalDays += daysChange;
      periodsCount++;
    }
  }

  return { totalConsumed, totalDays, periodsCount };
}
