import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Product } from "~/services/productService";

export interface CartItem {
  product: Product;
  configuration: Record<string, any>;
  quantity: number;
  price: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, configuration: Record<string, any>, price: number) => void;
  removeItem: (productId: string, configKey: string) => void;
  updateQuantity: (productId: string, configKey: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "yambo_cart";

const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading cart from localStorage:", error);
    return [];
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const generateConfigKey = (configuration: Record<string, any>): string => {
    return JSON.stringify(
      Object.entries(configuration)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce((acc, [key, value]) => {
          acc[key] = (typeof value === 'object' && value !== null && 'id' in value) ? value.id : value;
          return acc;
        }, {} as Record<string, any>)
    );
  };

  const addItem = (product: Product, configuration: Record<string, any>, price: number) => {
    const configKey = generateConfigKey(configuration);

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.product.id === product.id && generateConfigKey(item.configuration) === configKey
      );

      if (existingIndex >= 0) {
        const newItems = [...prevItems];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + 1,
        };
        return newItems;
      } else {
        return [...prevItems, { product, configuration, quantity: 1, price }];
      }
    });
  };

  const removeItem = (productId: string, configKey: string) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) => !(item.product.id === productId && generateConfigKey(item.configuration) === configKey)
      )
    );
  };

  const updateQuantity = (productId: string, configKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, configKey);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId && generateConfigKey(item.configuration) === configKey
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = (): number => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = (): number => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
