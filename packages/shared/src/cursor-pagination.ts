import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * P1 #8: Cursor-based (keyset) pagination helper.
 *
 * Uses (createdAt, id) as the keyset for stable, forward-only pagination.
 * The cursor is a base64-encoded JSON object: { createdAt: string, id: string }.
 *
 * Usage:
 *   const result = await applyCursorPagination(qb, cursor, limit, 'ASC');
 *   // result.items — the page of items
 *   // result.hasNext — whether more items exist
 *   // result.nextCursor — cursor for the next page (or null)
 */

export interface CursorPayload {
  createdAt: string;
  id: string;
}

export interface CursorPaginationResult<T> {
  items: T[];
  hasNext: boolean;
  nextCursor: string | null;
  limit: number;
}

/**
 * Encode a cursor payload to a base64 string.
 */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}

/**
 * Decode a base64-encoded cursor string.
 * Returns null if the cursor is invalid or empty.
 */
export function decodeCursor(cursor: string | undefined | null): CursorPayload | null {
  if (!cursor || typeof cursor !== 'string' || cursor.length === 0) return null;
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.createdAt === 'string' && typeof parsed.id === 'string') {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Apply cursor-based (keyset) pagination to a TypeORM QueryBuilder.
 *
 * The query uses: WHERE (created_at, id) > (cursor.createdAt, cursor.id)
 *                 ORDER BY created_at, id LIMIT limit+1
 *
 * If limit+1 rows are returned, hasNext=true and nextCursor is derived from the last row.
 *
 * @param qb The QueryBuilder (must have an alias, e.g. 'e')
 * @param cursor Base64-encoded cursor string (optional — if absent, starts from the beginning)
 * @param limit Maximum number of items to return (default 50, max 200)
 * @param order Sort order: 'ASC' or 'DESC' (default 'DESC')
 * @param alias The QueryBuilder alias (defaults to 'e')
 * @param createdAtColumn Column name for createdAt (defaults to 'createdAt')
 * @param idColumn Column name for id (defaults to 'id')
 */
export async function applyCursorPagination<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  cursor: string | undefined | null,
  limit: number = 50,
  order: 'ASC' | 'DESC' = 'DESC',
  alias: string = 'e',
  createdAtColumn: string = 'createdAt',
  idColumn: string = 'id',
): Promise<CursorPaginationResult<T>> {
  const lim = Math.min(Math.max(limit, 1), 200);
  const decoded = decodeCursor(cursor);

  // Apply keyset filter if cursor is provided
  if (decoded) {
    if (order === 'ASC') {
      // Forward pagination: (createdAt, id) > (cursor.createdAt, cursor.id)
      qb.andWhere(
        `(${alias}.${createdAtColumn}, ${alias}.${idColumn}) > (:cursorCreatedAt, :cursorId)`,
        { cursorCreatedAt: decoded.createdAt, cursorId: decoded.id },
      );
    } else {
      // DESC order: (createdAt, id) < (cursor.createdAt, cursor.id)
      qb.andWhere(
        `(${alias}.${createdAtColumn}, ${alias}.${idColumn}) < (:cursorCreatedAt, :cursorId)`,
        { cursorCreatedAt: decoded.createdAt, cursorId: decoded.id },
      );
    }
  }

  // Order by keyset
  qb.orderBy(`${alias}.${createdAtColumn}`, order)
    .addOrderBy(`${alias}.${idColumn}`, order)
    .take(lim + 1); // Fetch one extra to determine hasNext

  const items = await qb.getMany();

  const hasNext = items.length > lim;
  const pageItems = hasNext ? items.slice(0, lim) : items;

  let nextCursor: string | null = null;
  if (hasNext && pageItems.length > 0) {
    const lastItem = pageItems[pageItems.length - 1] as any;
    nextCursor = encodeCursor({
      createdAt: lastItem[createdAtColumn] instanceof Date
        ? (lastItem[createdAtColumn] as Date).toISOString()
        : String(lastItem[createdAtColumn]),
      id: String(lastItem[idColumn]),
    });
  }

  return {
    items: pageItems,
    hasNext,
    nextCursor,
    limit: lim,
  };
}
