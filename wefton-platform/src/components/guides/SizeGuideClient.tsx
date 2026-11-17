'use client';

import { useMemo } from 'react';
import { STANDARD_MEN_CHART, STANDARD_WOMEN_CHART, chartForProduct } from '@/lib/sizeChart';
import { normalizeSize } from '@/lib/productCodes';
import ProductPicker from './ProductPicker';
import SizeChartTable from './SizeChartTable';
import { genderLabel, useGuideProduct } from './useGuideProduct';

/** Size Guide that follows the chosen product (WC-Issue-7). */
export default function SizeGuideClient() {
  const { products, loading, selected, select, slug } = useGuideProduct();

  const inStock = useMemo(() => {
    if (!selected?.variants?.length) return undefined;
    return new Set(selected.variants.filter((v) => v.inventory > 0).map((v) => normalizeSize(v.size)));
  }, [selected]);

  return (
    <>
      <div className="mb-10">
        <ProductPicker
          products={products}
          value={selected ? slug : ''}
          onChange={select}
          loading={loading}
          emptyLabel="Crew Neck T-shirt (standard chart)"
        />
      </div>

      {selected ? (
        <SizeChartTable
          chart={chartForProduct(selected)}
          title={`${selected.title} · ${genderLabel(selected.gender)}`}
          inStock={inStock}
        />
      ) : (
        <>
          <SizeChartTable chart={STANDARD_MEN_CHART} title="Crew Neck T-shirt · Men" />
          <SizeChartTable chart={STANDARD_WOMEN_CHART} title="Crew Neck T-shirt · Women" />
        </>
      )}
    </>
  );
}
