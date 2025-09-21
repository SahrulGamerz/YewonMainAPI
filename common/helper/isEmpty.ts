import type { NonEmpty } from '@common/types/types';

export function isEmpty<T>(payload: T): payload is Exclude<T, NonEmpty<T>> {
    if (payload === null || payload === undefined) {
        return true;
    }

    if (Array.isArray(payload)) {
        return payload.length === 0;
    }

    if (typeof payload === 'object') {
        return Object.keys(payload).length === 0;
    }

    return false;
}

export function isDefined<T>(obj: T | null | undefined): obj is T {
    return obj !== undefined && obj !== null;
}
