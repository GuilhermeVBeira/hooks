import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });
  
  function updateCart(cart: Product[]){
      localStorage.setItem('@RocketShoes:cart',JSON.stringify(cart)) ;
      setCart(cart);
  }

  async function validateAmount(product: Product, amount: number) {
    if (amount < 1 ){
        toast.error('Quantidade solicitada fora de estoque');
        return false;
    }
    let stockResponse = await api.get(`stock/${product.id}`);
    if (amount > stockResponse.data.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return false;
    }
    return true;

  }
  const addProduct = async (productId: number) => {
    try {
        let response = await api.get(`products/${productId}`);
        let has_product = cart.filter(product => product.id === productId);
        if (has_product.length === 0) {
            let product = {...response.data, 'amount': 1}
            updateCart([...cart, product])
        }else{
            let product = has_product.pop();
            let otherProduct = cart.filter(product => product.id !== productId);
            let newTasks = [...otherProduct];
            if (product){
                let newAmount = product.amount + 1
                if (await validateAmount(product, newAmount)) {
                    product.amount = newAmount;
                    newTasks.push(product)
                }else{
                    newTasks.push(product)
                }
            }
            updateCart(newTasks);
        }
    } catch {
        toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
        let otherProduct = cart.filter(product => product.id !== productId);
        updateCart(otherProduct)
    } catch {
        toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
        let has_product = cart.filter(product => product.id === productId);
        let other_products = cart.filter(product => product.id !== productId);
        let product = has_product.pop();
        if(product){
            if (await validateAmount(product, amount)) {
                product.amount = amount;
                const newTasks = [...other_products, product];
                updateCart(newTasks);
            }else{
                const newTasks = [...other_products, product];
                updateCart(newTasks);

            }
        }
    } catch {
        toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
