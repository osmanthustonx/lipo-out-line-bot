export interface FoodAnalysis {
  text: string;
  carbohydrates: number;
  protein: number;
  fat: number;
  calories: number;
  imageBase64?: string;
}

export interface TempFoodData {
  [userId: string]: FoodAnalysis;
}
