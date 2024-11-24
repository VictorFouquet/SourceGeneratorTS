export class BaseQuery<T extends string | number | boolean | Date> {
    protected _query: Record<string, T> = {}

    equals(value: T): this {
        this._query.equals = value;
        return this;
    }

    getQuery(): Record<string, T> {
        return this._query;
    }
}
