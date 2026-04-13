import type { LucideIcon } from "lucide-react";
import { Fuel, Home, Mountain, Plane, ShoppingCart, Utensils } from "lucide-react";

import type { IconKey } from "@/lib/placeholder-data";

export const iconMap: Record<IconKey, LucideIcon> = {
  home: Home,
  plane: Plane,
  utensils: Utensils,
  cart: ShoppingCart,
  mountain: Mountain,
  fuel: Fuel,
};
