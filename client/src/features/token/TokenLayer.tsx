import type { GridConfig, Token } from '@myvtt/shared';
import { cellCenterToPixel, resolveGrid } from '../../lib/grid';
import TokenView from './TokenView';

interface TokenLayerProps {
  tokens: Token[];
  grid: GridConfig | null;
}

/**
 * Lapisan token di atas peta (C1). Berada di dalam wrapper ter-transform
 * viewport, sehingga semua koordinat cukup dalam piksel gambar.
 */
export default function TokenLayer({ tokens, grid }: TokenLayerProps) {
  const resolved = resolveGrid(grid);

  return (
    <div className="absolute inset-0" aria-label="Token di peta">
      {tokens.map((token) => {
        const center = cellCenterToPixel(token.col, token.row, resolved);
        return (
          <TokenView
            key={token.id}
            token={token}
            x={center.x}
            y={center.y}
            size={resolved.cellPx * 0.9}
          />
        );
      })}
    </div>
  );
}
