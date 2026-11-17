'use client';

import { STANDARD_COTTON_TEE_GUIDE } from '@/config/washCare';
import WashCareGuideView from '@/components/care/WashCareGuideView';
import ProductPicker from './ProductPicker';
import { useGuideProduct } from './useGuideProduct';

/** Wash Care guide that follows the chosen product (WC-Issue-11). */
export default function WashCareClient() {
  const { products, loading, selected, select, slug } = useGuideProduct();
  return (
    <>
      <div className="mb-10">
        <ProductPicker
          products={products}
          value={selected ? slug : ''}
          onChange={select}
          loading={loading}
          emptyLabel="Cotton T-shirts (standard guide)"
        />
      </div>
      <WashCareGuideView guide={selected?.careGuide ?? STANDARD_COTTON_TEE_GUIDE} />
    </>
  );
}
