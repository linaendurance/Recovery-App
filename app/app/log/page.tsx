"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pad, dayKey } from "@/lib/dates";
import { getFoods, searchFoods, GROUP_LABELS, type FoodItem } from "@/lib/foods";

const MEAL_TYPES = ["Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner", "Evening snack", "Other"];

type PickedItem = { food: FoodItem; qty: number };

export default function LogMealPage() {
  const router = useRouter();
  const [step, setStep] = useState<"time" | "type" | "food">("time");
  const [time, setTime] = useState(() => {
    const n = new Date();
    return `${pad(n.getHours())}:${pad(n.getMinutes())}`;
  });
  const [type, setType] = useState("");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [items, setItems] = useState<PickedItem[]>([]);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getFoods().then(setFoods).catch(() => setError("Couldn't load the food list. Refresh to try again."));
  }, []);

  const suggestions = useMemo(() => searchFoods(foods, q), [foods, q]);

  const addFood = (f: FoodItem) => {
    setItems((prev) => [...prev, { food: f, qty: 1 }]);
    setQ("");
    setHi(0);
    inputRef.current?.focus();
  };
  const setQty = (i: number, qty: number) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, qty } : it)));
  const remove = (i: number) => setItems((prev) => prev.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    setError(null);
    const [h, m] = time.split(":").map(Number);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("log_entry", {
      p_entry_date: dayKey(new Date()),
      p_meal_type: type,
      p_mins: h * 60 + m,
      p_items: items.map((it) => ({ food_item_id: it.food.id, qty: it.qty })),
    });
    setSaving(false);
    if (rpcError) {
      setError("Couldn't save that meal. Nothing was lost — try again.");
      return;
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <section className="rn-card">
      {step === "time" && (
        <>
          <div className="rn-label">Step 1</div>
          <h2 className="rn-q">What time are you logging this meal?</h2>
          <p className="rn-note">Defaults to now. Change it if you&apos;re catching up on something you ate earlier.</p>
          <input type="time" className="rn-input rn-time" value={time} onChange={(e) => setTime(e.target.value)} />
          <div className="rn-row">
            <button className="rn-btn" onClick={() => setStep("type")}>Continue</button>
          </div>
        </>
      )}

      {step === "type" && (
        <>
          <div className="rn-label">Step 2 · {time}</div>
          <h2 className="rn-q">Which eating occasion is this?</h2>
          <div className="rn-choices">
            {MEAL_TYPES.map((t) => (
              <button key={t} className={`rn-choice ${type === t ? "is-on" : ""}`} onClick={() => { setType(t); setStep("food"); }}>
                {t}
              </button>
            ))}
          </div>
          <button className="rn-link" onClick={() => setStep("time")}>Back</button>
        </>
      )}

      {step === "food" && (
        <>
          <div className="rn-label">Step 3 · {type} at {time}</div>
          <h2 className="rn-q">What did you eat?</h2>
          <div className="rn-ac">
            <input
              ref={inputRef}
              className="rn-input"
              placeholder="Start typing — e.g. cra, chi, yog"
              value={q}
              onChange={(e) => { setQ(e.target.value); setHi(0); }}
              onKeyDown={(e) => {
                if (!suggestions.length) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % suggestions.length); }
                if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + suggestions.length) % suggestions.length); }
                if (e.key === "Enter") { e.preventDefault(); addFood(suggestions[hi]); }
              }}
            />
            {suggestions.length > 0 && (
              <ul className="rn-ac-list">
                {suggestions.map((f, i) => (
                  <li key={f.id}>
                    <button className={`rn-ac-item ${i === hi ? "is-on" : ""}`} onMouseEnter={() => setHi(i)} onClick={() => addFood(f)}>
                      <span>{f.name}</span>
                      <em className="rn-mono">{f.portion} {f.unit} · {GROUP_LABELS[f.food_group]}</em>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <ul className="rn-picked">
              {items.map((it, i) => (
                <li key={i} className="rn-picked-row">
                  <div>
                    <div className="rn-picked-name">{it.food.name}</div>
                    <div className="rn-fine">
                      Assumed portion: {it.food.portion} {it.food.unit} × {it.qty} ={" "}
                      <strong>{Math.round(it.food.portion * it.qty)} {it.food.unit}</strong>
                    </div>
                  </div>
                  <div className="rn-qty">
                    {[0.5, 1, 1.5, 2, 3].map((n) => (
                      <button key={n} className={`rn-qty-b ${it.qty === n ? "is-on" : ""}`} onClick={() => setQty(i, n)}>{n}×</button>
                    ))}
                    <button className="rn-remove" onClick={() => remove(i)} aria-label="Remove">×</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="rn-error" role="alert">{error}</p>}
          <div className="rn-row">
            <button className="rn-btn" disabled={!items.length || saving} onClick={save}>
              {saving ? "Saving…" : "Save this meal"}
            </button>
            <button className="rn-link" onClick={() => setStep("type")}>Back</button>
          </div>
          <p className="rn-fine">
            Portion sizes are standard estimates so you never have to weigh anything. If your
            portion was clearly bigger or smaller, use the multiplier — a rough answer is fine and
            is the point.
          </p>
        </>
      )}
    </section>
  );
}
