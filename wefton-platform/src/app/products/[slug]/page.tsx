import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug, getSimilarProducts } from '@/services/productService';
import ProductDetailClient from '@/components/product/ProductDetailClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    if (!product) return { title: 'Product Not Found' };
    return {
      title: product.title,
      description: product.shortDescription || product.description,
      openGraph: {
        title: product.title,
        description: product.shortDescription,
        images: product.images?.[0] ? [{ url: product.images[0].url }] : [],
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product = null;
  let similar = [];

  try {
    product = await getProductBySlug(slug);
    if (!product) notFound();
    similar = await getSimilarProducts(product.category, product.productId, 4);
  } catch {
    notFound();
  }

  return <ProductDetailClient product={product!} similar={similar} />;
}
