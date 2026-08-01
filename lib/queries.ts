/**
 * The column list every screen uses when reading entries. Kept in one place so
 * a new column added to `entries` cannot silently reach some screens and not
 * others — which is how the felt-excessive marker would otherwise go missing
 * from a view that was never updated.
 */
export const ENTRY_SELECT =
  "id, entry_date, meal_type, mins_since_midnight, felt_excessive, emotion, context_note, entry_items(qty, food_items(*))";
