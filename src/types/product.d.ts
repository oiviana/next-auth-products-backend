interface CreateProductBody {
  name: string;
  description?: string;
  price: number;
  stock: number;
  isVisible?: boolean;
}