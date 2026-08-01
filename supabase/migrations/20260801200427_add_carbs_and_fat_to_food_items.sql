-- Requirement: show the benefit of consistent carbohydrate, fat and protein.
-- Only protein existed; carbohydrate and fat were absent from the schema
-- entirely, so two of the three macros could not be reported at all.
alter table public.food_items
  add column if not exists carbs numeric not null default 0,
  add column if not exists fat   numeric not null default 0;

comment on column public.food_items.carbs is
  'Available carbohydrate, g per 100 g/ml — i.e. carbohydrate by difference MINUS fibre, so it does not double-count the separate fibre column.';
comment on column public.food_items.fat is
  'Total fat, g per 100 g/ml.';

alter table public.food_items
  add constraint food_items_carbs_nonneg check (carbs >= 0),
  add constraint food_items_fat_nonneg   check (fat   >= 0);

update public.food_items as f
set carbs = v.carbs, fat = v.fat
from (values
  ('Bread, rye',42.5,3.3),('Bread, white',46.3,3.2),('Bread, wholegrain',36.0,4.2),
  ('Buckwheat, cooked',17.2,0.6),('Corn crackers / rice cakes',77.3,3.5),
  ('Cornflakes, fortified',80.7,0.4),('Couscous, cooked',21.8,0.2),
  ('Crackers, wheat',68.0,15.0),('Croissant',43.3,21.0),('Granola bar',59.0,14.0),
  ('Muesli',58.5,6.0),('Oats, dry',56.2,6.9),('Pancakes',26.5,6.5),
  ('Pasta, cooked',28.4,0.9),('Pasta, wholewheat, cooked',22.6,1.1),
  ('Pizza, margherita',24.7,8.5),('Polenta, cooked',12.1,0.3),('Popcorn',63.5,4.5),
  ('Potato crisps / chips',48.6,34.0),('Potatoes, boiled',15.7,0.1),
  ('Quinoa, cooked',18.5,1.9),('Rice, brown, cooked',24.0,0.9),
  ('Rice, white, cooked',27.8,0.3),('Sweet potato, baked',17.4,0.1),
  ('Tortilla wrap, wheat',49.0,7.0),
  ('Almond milk, fortified',0.4,1.1),('Cheese, cheddar',1.3,33.0),
  ('Coffee with milk',1.5,0.7),('Cottage cheese',3.4,4.3),('Cream cheese',4.1,34.0),
  ('Feta',4.1,21.0),('Greek yogurt, plain',3.6,5.0),('Ice cream',22.9,11.0),
  ('Kefir',4.5,3.0),('Milk, semi-skimmed',4.8,1.7),('Milk, whole',4.7,3.6),
  ('Mozzarella',2.2,22.0),('Oat milk, fortified',5.9,1.5),('Parmesan',4.1,29.0),
  ('Soy milk, fortified',1.8,1.8),('Yogurt, plain',4.7,3.3),
  ('Avocado',1.8,14.7),('Butter',0.1,81.0),('Dark chocolate, 70%',35.0,42.6),
  ('Honey',82.0,0.0),('Jam',64.0,0.1),('Milk chocolate',56.0,30.0),('Olive oil',0.0,100.0),
  ('Apple',11.4,0.2),('Apricots, dried',55.3,0.5),('Banana',20.2,0.3),
  ('Blueberries',12.1,0.3),('Dates, dried',67.0,0.4),('Grapes',17.2,0.2),
  ('Kiwi',11.7,0.5),('Mango',13.4,0.4),('Orange',9.4,0.1),('Orange juice',10.2,0.2),
  ('Peach',8.0,0.3),('Pear',12.1,0.1),('Raisins',75.5,0.5),('Raspberries',5.4,0.7),
  ('Strawberries',5.7,0.3),('Watermelon',7.2,0.2),
  ('Baked beans',15.9,0.5),('Black beans, cooked',15.0,0.5),
  ('Chickpeas, cooked',19.8,2.6),('Green peas, cooked',10.1,0.4),('Hummus',8.3,17.0),
  ('Kidney beans, cooked',16.4,0.5),('Lentils, cooked',12.2,0.4),
  ('White beans, cooked',18.8,0.35),
  ('Almonds',9.1,49.9),('Cashews',26.9,43.8),('Chia seeds',7.7,30.7),
  ('Flaxseed, ground',1.6,42.2),('Hazelnuts',7.0,60.8),('Peanut butter',14.0,50.0),
  ('Peanuts',7.6,49.2),('Pumpkin seeds',4.7,49.0),('Sunflower seeds',11.4,51.5),
  ('Tahini / sesame',11.9,53.8),('Walnuts',7.0,65.2),
  ('Beef mince, cooked',0.0,15.0),('Chicken breast, cooked',0.0,3.6),
  ('Chicken thigh, cooked',0.0,10.9),('Cod, cooked',0.0,0.9),('Egg, whole',1.1,9.5),
  ('Mackerel, cooked',0.0,17.8),('Pork loin, cooked',0.0,8.0),('Prawns, cooked',0.2,1.1),
  ('Salmon, cooked',0.0,13.4),('Sardines, canned in oil',0.0,11.5),('Seitan',14.0,1.9),
  ('Tempeh',3.4,11.0),('Tofu, firm (calcium-set)',2.5,8.7),
  ('Tuna, canned in water',0.0,0.8),('Turkey breast, cooked',0.0,1.7),
  ('Beetroot',6.8,0.2),('Bell pepper',3.9,0.3),('Broccoli, cooked',3.9,0.4),
  ('Cabbage',3.3,0.1),('Carrot',6.8,0.2),('Cauliflower',3.0,0.3),
  ('Courgette / zucchini',2.1,0.3),('Cucumber',3.1,0.1),('Green beans',3.6,0.2),
  ('Kale, cooked',2.4,0.4),('Lettuce',1.6,0.2),('Mushrooms',2.3,0.3),('Onion',7.6,0.1),
  ('Spinach, cooked',1.4,0.4),('Tea',0.0,0.0),('Tomato',2.7,0.2),
  ('Vegetable soup',4.5,1.0)
) as v(name, carbs, fat)
where f.name = v.name;
