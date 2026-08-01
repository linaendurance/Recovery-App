"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pad, dayKey } from "@/lib/dates";
import { getFoods, searchFoods, GROUP_LABELS, type FoodItem } from "@/lib/foods";
import { itemTotals } from "@/lib/analysis";
import { macroPresence, PRESENCE_THRESHOLD } from "@/lib/nutrition";

const MEAL_TYPES = ["Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner", "Evening snack", "Other"];

// Kept deliberately short and plain. These are the values the database
// constraint accepts — see entries_emotion_check.
const EMOTIONS = ["Calm", "Anxious", "Sad", "Angry", "Numb", "Happy", "Stressed", "Bored", "Lonely", "Guilty"];

type PickedItem = { food: FoodItem; qty: number };
type Step = "time" | "type" | "food" | "feel";

export default function LogMealPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("time");
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

  // Step 4 — the CBT-E monitoring fields.
  const [feltExcessive, setFeltExcessive] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [contextNote, setContextNote] = useState("");

  useEffect(() => {
    getFoods().then(setFoods).catch(() => setError("Couldn't load the food list. Refresh to try again."));
  }, []);

  const suggestions = useMemo(() => searchFoods(foods, q), [foods, q]);

  // Live macro read-out for what has been picked so far, so the carbohydrate /
  // fat / protein question is answerable while the meal is still being built
  // rather than only in hindsight on the summary screen.
  const picked = useMemo(
    () => itemTotals(items.map((it) => ({ qty: it.qty, food_items: it.food }))),
    [items]
  );
  const presence = useMemo(() => macroPresence(picked), [picked]);

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
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      setError("That time doesn't look right. Check it and try again.");
      setSaving(false);
      return;
    }
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("log_entry", {
      p_entry_date: dayKey(new Date()),
      p_meal_type: type,
      p_mins: h * 60 + m,
      p_items: items.map((it) => ({ food_item_id: it.food.id, qty: it.qty })),
      p_felt_excessive: feltExcessive,
      p_emotion: emotion,
      p_context_note: contextNote.trim() || null,
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
          <div className="rn-label">Step 1 of 4</div>
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
          <div className="rn-label">Step 2 of 4 · {time}</div>
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
          <div className="rn-label">Step 3 of 4 · {type} at {time}</div>
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
            <>
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

              <div className="rn-fuel">
                <div className="rn-label">This meal so far</div>
                <div className="rn-fuel-pills">
                  <span className={`rn-fuel-pill ${presence.carbs ? "is-on" : ""}`}>
                    Carbohydrate <em className="rn-mono">{picked.carbs.toFixed(0)} g</em>
                  </span>
                  <span className={`rn-fuel-pill ${presence.fat ? "is-on" : ""}`}>
                    Fat <em className="rn-mono">{picked.fat.toFixed(0)} g</em>
                  </span>
                  <span className={`rn-fuel-pill ${presence.protein ? "is-on" : ""}`}>
                    Protein <em className="rn-mono">{picked.protein.toFixed(0)} g</em>
                  </span>
                </div>
                <p className="rn-fine">
                  Filled pills mean the meal carries a meaningful amount of that one (over{" "}
                  {PRESENCE_THRESHOLD.carbs} g carbohydrate, {PRESENCE_THRESHOLD.fat} g fat,{" "}
                  {PRESENCE_THRESHOLD.protein} g protein). These are the app&apos;s own thresholds
                  for noticing a meal built from one thing — not clinical cutoffs, and not a score.
                </p>
              </div>
            </>
          )}

          {error && <p className="rn-error" role="alert">{error}</p>}
          <div className="rn-row">
            <button className="rn-btn" disabled={!items.length} onClick={() => setStep("feel")}>
              Continue
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

      {step === "feel" && (
        <>
          <div className="rn-label">Step 4 of 4 · {type} at {time}</div>
          <h2 className="rn-q">How was this one?</h2>
          <p className="rn-note">
            All of this is optional — you can save now and skip it. It is here because what was
            happening around a meal explains more about a day than the food does.
          </p>

          <label className="rn-check">
            <input
              type="checkbox"
              checked={feltExcessive}
              onChange={(e) => setFeltExcessive(e.target.checked)}
            />
            <span>
              <b>This felt excessive, or out of my control.</b>
              <em>
                Your judgement only. The app never decides this from quantity, never counts it
                against you, and nothing changes on any screen except that the pattern becomes
                visible over time.
              </em>
            </span>
          </label>

          <div className="rn-label" style={{ marginTop: 22 }}>How were you feeling?</div>
          <div className="rn-choices">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                className={`rn-choice ${emotion === e ? "is-on" : ""}`}
                onClick={() => setEmotion(emotion === e ? null : e)}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="rn-jq">
            <label htmlFor="ctx">What was going on? Where were you, who with?</label>
            <textarea
              id="ctx"
              rows={3}
              maxLength={2000}
              className="rn-input"
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
            />
          </div>

          {error && <p className="rn-error" role="alert">{error}</p>}
          <div className="rn-row">
            <button className="rn-btn" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save this meal"}
            </button>
            <button className="rn-link" onClick={() => setStep("food")}>Back</button>
          </div>
        </>
      )}
    </section>
  );
}
