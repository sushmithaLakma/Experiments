import { HouseholdProfile, PantryItem, Recipe } from '../types';

export const defaultProfiles: HouseholdProfile[] = [
  {
    id: 'p1',
    name: 'Samantha',
    avatarColor: '#CBE08A',
    dietaryRestrictions: ['vegetarian'],
    allergies: ['peanuts'],
    dislikedIngredients: ['cilantro'],
  },
  {
    id: 'p2',
    name: 'Theo',
    avatarColor: '#E2A93B',
    dietaryRestrictions: ['dairy-free'],
    allergies: [],
    dislikedIngredients: [],
  },
];

export const samplePantryItems: PantryItem[] = [
  { id: 'i1', name: 'Eggs', category: 'Dairy & Eggs', quantity: '6 left', confidence: 0.97, source: 'scan' },
  { id: 'i2', name: 'Spinach', category: 'Produce', quantity: '1 bunch', confidence: 0.91, source: 'scan' },
  { id: 'i3', name: 'Cherry tomatoes', category: 'Produce', quantity: '1 box', confidence: 0.88, source: 'scan' },
  { id: 'i4', name: 'Feta cheese', category: 'Dairy & Eggs', quantity: '200g', confidence: 0.82, source: 'scan' },
  { id: 'i5', name: 'Whole wheat flour', category: 'Pantry', quantity: '1 bag', confidence: 0.95, source: 'scan' },
  { id: 'i6', name: 'Chicken breast', category: 'Meat', quantity: '500g', confidence: 0.93, source: 'scan' },
];

export const sampleRecipes: Recipe[] = [
  {
    id: 'r1',
    title: 'Pan-Fried Dumplings',
    author: 'Recipe by Mei',
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600',
    timeMinutes: 35,
    servings: 4,
    difficulty: 'Medium',
    dietTags: ['dairy-free'],
    matchPercent: 90,
    usedIngredients: ['Flour', 'Cabbage', 'Ginger'],
    missingIngredients: ['Dumpling wrappers'],
    steps: [
      'Mix filling ingredients and season to taste.',
      'Fill wrappers and pleat edges shut.',
      'Pan-fry until golden, then steam covered for 5 minutes.',
    ],
  },
  {
    id: 'r2',
    title: 'Grilled Chicken & Rice Bowl',
    author: 'Recipe by Denise',
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600',
    timeMinutes: 25,
    servings: 2,
    difficulty: 'Easy',
    dietTags: ['gluten-free'],
    matchPercent: 86,
    usedIngredients: ['Chicken breast', 'Rice', 'Tomato'],
    missingIngredients: ['Chili sauce'],
    steps: [
      'Season chicken and grill until cooked through.',
      'Cook rice and assemble bowl with vegetables.',
      'Top with sauce and serve warm.',
    ],
  },
  {
    id: 'r3',
    title: 'Spinach & Feta Omelette',
    author: 'Recipe by Samantha',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600',
    timeMinutes: 15,
    servings: 1,
    difficulty: 'Easy',
    dietTags: ['vegetarian', 'gluten-free'],
    matchPercent: 95,
    usedIngredients: ['Eggs', 'Spinach', 'Feta cheese'],
    missingIngredients: [],
    steps: [
      'Whisk eggs and season with salt and pepper.',
      'Sauté spinach, pour eggs over, sprinkle feta.',
      'Fold and cook until set.',
    ],
  },
  {
    id: 'r4',
    title: 'Cherry Tomato Pasta',
    author: 'Recipe by Theo',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600',
    timeMinutes: 20,
    servings: 3,
    difficulty: 'Easy',
    dietTags: ['vegan'],
    matchPercent: 78,
    usedIngredients: ['Cherry tomatoes', 'Garlic', 'Pasta'],
    missingIngredients: ['Basil'],
    steps: [
      'Boil pasta until al dente.',
      'Sauté garlic and tomatoes until blistered.',
      'Toss pasta through sauce and finish with herbs.',
    ],
  },
];

export const mealCategories = [
  { key: 'Breakfast', icon: 'restaurant-outline' },
  { key: 'Lunch', icon: 'fast-food-outline' },
  { key: 'Dinner', icon: 'restaurant' },
  { key: 'Snack', icon: 'nutrition-outline' },
  { key: 'Cuisine', icon: 'pizza-outline' },
  { key: 'Smoothies', icon: 'cafe-outline' },
  { key: 'Dessert', icon: 'ice-cream-outline' },
  { key: 'More', icon: 'grid-outline' },
] as const;
